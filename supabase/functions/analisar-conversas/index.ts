// Edge Function: analisar-conversas
// Motor de análise IA em escala. Rodada por pg_cron (tick 1 min) só quando ci_analise_fila.status='rodando'.
// Lê a próxima conversa da fila por prioridade, analisa com Claude (prompt caching) e grava estruturado.
// Deployado no Supabase em 2026-08-03. verify_jwt=false (gated por status + teto de gasto).
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

// Preço por 1M tokens (Sonnet). Ajuste se trocar de modelo.
const PRICE = { in: 3.0, cacheWrite: 3.75, cacheRead: 0.30, out: 15.0 };

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const SYSTEM_CTX = `Você é um especialista sênior em análise de conversas de vendas do EJA Educa Brasil (curso supletivo/EJA, Ensino Fundamental e Médio, certificação com validade nacional). Leads chegam por anúncio no WhatsApp e são atendidos por consultoras. As consultoras mandam muito áudio (já transcrito). O funil é: qualificar -> explicar plataforma -> apresentar o VALOR (preço, ex: R$847 à vista ou 12x R$84,70) -> mandar o LINK de pagamento -> matrícula.

Contexto de negócio conhecido: a objeção nº1 é medo de golpe; muita gente não tem cartão e precisa de boleto/entrada/parcelamento; muitos dizem "só recebo dia X" e somem se ninguém retoma na data; o preço cru sem ponte de pagamento faz o lead sumir; follow-up genérico não reativa.

Sua tarefa: analisar UMA conversa e devolver APENAS um objeto JSON válido (sem markdown, sem texto fora do JSON) com EXATAMENTE estes campos:
{
  "resultado": "ganhou|perdeu|em_aberto",
  "score": 0-100,
  "classificacao": "quente|morno|frio|vendido|perdido",
  "chance_fechamento": 0-100,
  "motivo_perda": "preco|sem_dinheiro_data|sem_cartao_metodo|terceiro_decisor|desconfianca_golpe|documentacao|prazo_curso|sumiu_sem_motivo|problema_tecnico|concorrencia|nao_perdeu|outro",
  "momento_abandono": "antes_preco|logo_apos_preco|apos_pedir_dados|apos_link|apos_followup_generico|durante_pagamento|nao_abandonou|outro",
  "objecao_principal": "frase curta",
  "objecoes": ["..."],
  "sinais_compra": ["..."],
  "erros_consultora": ["..."],
  "o_que_funcionou": "o que a consultora fez bem (1-2 frases)",
  "o_que_faltou": "o que teria segurado/fechado o lead (1-2 frases)",
  "proxima_acao": "a melhor mensagem/ação de recuperação agora (1-2 frases, tom humano)",
  "sentimento_consultora": "descrição curta do tom da consultora",
  "energia_consultora": "engajada|mecanica|apatica|ansiosa|agressiva|insegura|consultiva",
  "resumo": "2-3 frases do que aconteceu"
}
Regras: se houve comprovante/pagamento/acesso liberado => resultado ganhou, classificacao vendido, motivo_perda nao_perdeu. Se o lead recusou explicitamente => perdido. Seja concreto e baseie-se só na conversa. Responda em português. Devolva só o JSON.`;

function extrairJSON(txt: string): any {
  try { return JSON.parse(txt); } catch (_) {}
  const m = txt.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  return null;
}

function montarTranscript(msgs: any[]): { texto: string; consultora: string | null } {
  const uteis = msgs.filter((m) => m.is_auto !== true).slice(-50);
  const cont: Record<string, number> = {};
  const linhas = uteis.map((m) => {
    const hora = (m.enviado_at || "").slice(11, 16);
    const corpo = ((m.transcricao && m.transcricao.trim()) ? `[áudio] ${m.transcricao}` : (m.conteudo || "")).slice(0, 500);
    if (m.de === "consultora") {
      const nome = m.attendant_nome || "Consultora";
      cont[nome] = (cont[nome] || 0) + 1;
      return `Consultora ${nome} (${hora}): ${corpo}`;
    }
    return `Lead (${hora}): ${corpo}`;
  });
  let consultora: string | null = null, max = 0;
  for (const k in cont) { if (cont[k] > max) { max = cont[k]; consultora = k; } }
  return { texto: linhas.join("\n"), consultora };
}

async function analisar(modelo: string, transcript: string) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 1100,
      system: [{ type: "text", text: SYSTEM_CTX, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `Analise esta conversa e devolva o JSON:\n\n${transcript}` }],
    }),
  });
  if (!resp.ok) throw new Error(`anthropic ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  const txt = (data.content || []).map((c: any) => c.text || "").join("");
  const u = data.usage || {};
  const custo = ((u.input_tokens || 0) * PRICE.in + (u.cache_creation_input_tokens || 0) * PRICE.cacheWrite +
    (u.cache_read_input_tokens || 0) * PRICE.cacheRead + (u.output_tokens || 0) * PRICE.out) / 1e6;
  return { obj: extrairJSON(txt), tin: u.input_tokens || 0, tout: u.output_tokens || 0, custo };
}

Deno.serve(async () => {
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

  const { data: ctrl } = await db.from("ci_analise_fila").select("*").eq("id", 1).single();
  if (!ctrl) return json({ erro: "sem controle" }, 500);
  if (ctrl.status !== "rodando") return json({ skipped: true, status: ctrl.status });
  if (Number(ctrl.custo_acumulado) >= Number(ctrl.teto_usd)) {
    await db.from("ci_analise_fila").update({ status: "pausado", mensagem: "teto de gasto atingido", updated_at: new Date().toISOString() }).eq("id", 1);
    return json({ pausado: true, motivo: "teto" });
  }
  if (!ANTHROPIC_KEY) {
    await db.from("ci_analise_fila").update({ status: "pausado", mensagem: "ANTHROPIC_API_KEY não configurada", updated_at: new Date().toISOString() }).eq("id", 1);
    return json({ pausado: true, motivo: "sem_chave" });
  }

  const lote = ctrl.lote_tamanho || 8;
  const { data: fila, error: eFila } = await db.from("ci_analise_pendentes").select("*")
    .order("prioridade", { ascending: true }).order("link_flag", { ascending: false }).order("ultima_mensagem_at", { ascending: false }).limit(lote);
  if (eFila) return json({ erro: eFila.message }, 500);
  if (!fila || fila.length === 0) {
    await db.from("ci_analise_fila").update({ status: "concluido", mensagem: "fila vazia", updated_at: new Date().toISOString() }).eq("id", 1);
    return json({ concluido: true });
  }

  let custoLote = 0, ok = 0, falhas = 0;
  for (const c of fila) {
    try {
      const { data: msgs } = await db.from("ci_mensagens").select("de,tipo,conteudo,transcricao,enviado_at,is_auto,attendant_nome")
        .eq("conversa_id", c.conversa_id).order("enviado_at", { ascending: true }).limit(200);
      const { texto, consultora } = montarTranscript(msgs || []);
      const r = await analisar(ctrl.modelo, texto);
      custoLote += r.custo;
      const o = r.obj || {};
      await db.from("ci_analise_recuperacao").upsert({
        conversa_id: c.conversa_id, cohort: c.cohort,
        resultado: o.resultado ?? null, score: o.score ?? null, classificacao: o.classificacao ?? null,
        chance_fechamento: o.chance_fechamento ?? null, motivo_perda: o.motivo_perda ?? null,
        momento_abandono: o.momento_abandono ?? null, objecao_principal: o.objecao_principal ?? null,
        objecoes: o.objecoes ?? null, sinais_compra: o.sinais_compra ?? null, erros_consultora: o.erros_consultora ?? null,
        o_que_funcionou: o.o_que_funcionou ?? null, o_que_faltou: o.o_que_faltou ?? null, proxima_acao: o.proxima_acao ?? null,
        sentimento_consultora: o.sentimento_consultora ?? null, energia_consultora: o.energia_consultora ?? null,
        consultora_atribuida: consultora ?? c.consultora ?? null, resumo: o.resumo ?? (r.obj ? null : "[falha ao interpretar]"),
        modelo: ctrl.modelo, tokens_input: r.tin, tokens_output: r.tout, custo_usd: Number(r.custo.toFixed(5)),
        analisado_em: new Date().toISOString(),
      });
      ok++;
    } catch (e) {
      falhas++;
      await db.from("ci_analise_recuperacao").upsert({ conversa_id: c.conversa_id, cohort: c.cohort, resumo: `[erro] ${String(e).slice(0, 200)}`, modelo: ctrl.modelo, analisado_em: new Date().toISOString() });
    }
  }

  const novoCusto = Number(ctrl.custo_acumulado) + custoLote;
  await db.from("ci_analise_fila").update({
    custo_acumulado: Number(novoCusto.toFixed(5)), feitos: (ctrl.feitos || 0) + ok + falhas,
    ultimo_tick: new Date().toISOString(), mensagem: `lote: ${ok} ok, ${falhas} falhas`, updated_at: new Date().toISOString(),
    status: novoCusto >= Number(ctrl.teto_usd) ? "pausado" : "rodando",
  }).eq("id", 1);

  return json({ processados: ok, falhas, custo_lote: Number(custoLote.toFixed(5)), custo_total: Number(novoCusto.toFixed(5)) });
});
