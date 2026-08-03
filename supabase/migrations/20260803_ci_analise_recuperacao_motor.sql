-- ============================================================
-- Motor de Análise IA em escala (backend, fila por prioridade)
-- Aplicado no Supabase em 2026-08-03.
-- Fila: vendeu -> recebeu_valor -> recebeu_link -> resto
-- ============================================================

-- 1) Resultados estruturados por conversa
create table if not exists public.ci_analise_recuperacao (
  conversa_id        uuid primary key,
  cohort             text,          -- vendeu | recebeu_link | recebeu_valor | sem_valor
  resultado          text,          -- ganhou | perdeu | em_aberto
  score              int,
  classificacao      text,
  chance_fechamento  int,
  motivo_perda       text,          -- categoria fechada
  momento_abandono   text,          -- categoria fechada
  objecao_principal  text,
  objecoes           text[],
  sinais_compra      text[],
  erros_consultora   text[],
  o_que_funcionou    text,
  o_que_faltou       text,
  proxima_acao       text,
  sentimento_consultora text,
  energia_consultora text,
  consultora_atribuida text,
  resumo             text,
  modelo             text,
  tokens_input       int,
  tokens_output      int,
  custo_usd          numeric(10,5),
  analisado_em       timestamptz default now()
);

-- 2) Controle do motor (linha única) — a UI lê progresso e escreve status (pausar/continuar)
create table if not exists public.ci_analise_fila (
  id              int primary key default 1,
  status          text not null default 'parado',            -- parado|rodando|pausado|concluido
  modelo          text not null default 'claude-sonnet-4-6',
  teto_usd        numeric(10,2) not null default 10,
  custo_acumulado numeric(12,5) not null default 0,
  feitos          int not null default 0,
  lote_tamanho    int not null default 8,
  ultimo_tick     timestamptz,
  mensagem        text,
  updated_at      timestamptz default now(),
  constraint ci_analise_fila_singleton check (id = 1)
);
insert into public.ci_analise_fila (id) values (1) on conflict do nothing;

-- 3) Fila de pendentes com prioridade + cohort
create or replace view public.ci_analise_pendentes as
with won as (
  select distinct conversa_id from public.ci_vendas where casada and conversa_id is not null
)
select
  c.id as conversa_id, c.contato_nome, c.consultora,
  case
    when w.conversa_id is not null then 'vendeu'
    when c.recebeu_link  then 'recebeu_link'
    when c.recebeu_valor then 'recebeu_valor'
    else 'sem_valor'
  end as cohort,
  case
    when w.conversa_id is not null then 1
    when c.recebeu_valor then 2
    when c.recebeu_link  then 3
    else 4
  end as prioridade,
  (c.recebeu_link)::int as link_flag,
  c.ultima_mensagem_at
from conversa_ia.conversas c
left join won w on w.conversa_id = c.id
where c.total_mensagens > 1
  and not exists (select 1 from public.ci_analise_recuperacao r where r.conversa_id = c.id);

-- 4) Trigger: espelha resultado de volta em conversa_ia.conversas (mantém UI atual viva)
create or replace function public.ci_analise_sync_conversa()
returns trigger language plpgsql security definer set search_path = public, conversa_ia as $$
begin
  update conversa_ia.conversas set
    score_ia = new.score,
    classificacao_ia = coalesce(new.classificacao, classificacao_ia),
    chance_fechamento = new.chance_fechamento,
    resumo_ia = coalesce(new.resumo, resumo_ia),
    objecoes_detectadas = new.objecoes,
    erros_consultora = new.erros_consultora,
    estado_consultora = new.energia_consultora,
    updated_at = now()
  where id = new.conversa_id;
  return new;
end $$;

drop trigger if exists trg_ci_analise_sync on public.ci_analise_recuperacao;
create trigger trg_ci_analise_sync
  after insert or update on public.ci_analise_recuperacao
  for each row execute function public.ci_analise_sync_conversa();

-- 5) RLS + grants
alter table public.ci_analise_recuperacao enable row level security;
alter table public.ci_analise_fila enable row level security;
drop policy if exists p_read_recup on public.ci_analise_recuperacao;
create policy p_read_recup on public.ci_analise_recuperacao for select using (true);
drop policy if exists p_read_fila on public.ci_analise_fila;
create policy p_read_fila on public.ci_analise_fila for select using (true);
drop policy if exists p_upd_fila on public.ci_analise_fila;
create policy p_upd_fila on public.ci_analise_fila for update using (true) with check (true);
grant select on public.ci_analise_recuperacao to anon, authenticated;
grant select, update on public.ci_analise_fila to anon, authenticated;
grant select on public.ci_analise_pendentes to anon, authenticated;

-- 6) Agendador: tick de 1 min, só dispara quando status='rodando' (custo zero quando parado)
select cron.unschedule(jobid) from cron.job where jobname='ci-analise-tick';
select cron.schedule('ci-analise-tick','* * * * *', $cron$
  select net.http_post(
    url:='https://dfrfeirfllwmdkenylwk.supabase.co/functions/v1/analisar-conversas',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  ) where exists (select 1 from public.ci_analise_fila where id=1 and status='rodando');
$cron$);

-- Requer o secret ANTHROPIC_API_KEY configurado nas Edge Functions.
-- Para iniciar: update public.ci_analise_fila set status='rodando', teto_usd=10 where id=1;
-- Para pausar:  update public.ci_analise_fila set status='pausado' where id=1;
