-- Integração de Vendas no ConversIA
-- Vendas pagas já vivem neste Supabase (public.eja_vendas, origem Guru/ASAAS via n8n).
-- Aqui casamos cada venda com a conversa (por últimos 8 dígitos do telefone) via VIEW,
-- que reflete o dado em tempo real (sem cópia, sem trigger, sem risco à tabela de vendas).

-- Índice funcional pelos últimos 8 dígitos do telefone (acelera o casamento)
CREATE INDEX IF NOT EXISTS idx_conversas_final8
  ON conversa_ia.conversas (right(regexp_replace(contato_numero, '\D', '', 'g'), 8));

-- View: vendas + conversa casada
CREATE OR REPLACE VIEW public.ci_vendas AS
SELECT
  v.id AS venda_id, v.event_id, v.plataforma, v.nome_curso, v.cod_produto,
  v.valor_venda, v.valor_liquido, v.data_venda, v.status_pagamento, v.metodo_pagamento,
  v.consultora AS consultora_venda,
  CASE
    WHEN lower(coalesce(v.consultora, v.utm_source, '')) ~ 'vtv' THEN 'vtv'
    WHEN lower(coalesce(v.consultora, v.utm_source, '')) ~ 'vjc' THEN 'vjc'
    WHEN lower(coalesce(v.consultora, v.utm_source, '')) ~ 'vkm' THEN 'vkm'
    ELSE 'outros'
  END AS cod_consultora,
  v.utm_source, v.lead_utm_source,
  v.whatsapp AS whatsapp_comprador, v.whatsapp_contato, v.whatsapp_final8,
  v.evento_id_origem, v.inserted_at, v.updated_at,
  c.id AS conversa_id, c.contato_nome AS conversa_contato_nome, c.consultora AS conversa_consultora,
  c.classificacao_ia, c.score_ia, (c.id IS NOT NULL) AS casada
FROM public.eja_vendas v
LEFT JOIN LATERAL (
  SELECT cc.id, cc.contato_nome, cc.consultora, cc.classificacao_ia, cc.score_ia
  FROM ci_conversas cc
  WHERE v.whatsapp_final8 IS NOT NULL
    AND right(regexp_replace(cc.contato_numero, '\D', '', 'g'), 8) = v.whatsapp_final8
  ORDER BY cc.ultima_mensagem_at DESC NULLS LAST
  LIMIT 1
) c ON true;

GRANT SELECT ON public.ci_vendas TO anon, authenticated;

-- RPCs de agregação (leves) para o painel de Vendas
CREATE OR REPLACE FUNCTION public.get_vendas_stats()
RETURNS TABLE(total bigint, casadas bigint, faturamento_total numeric, faturamento_mes numeric, vendas_mes bigint, vendas_hoje bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*), count(*) FILTER (WHERE casada), COALESCE(sum(valor_venda),0),
         COALESCE(sum(valor_venda) FILTER (WHERE data_venda >= date_trunc('month', now())),0),
         count(*) FILTER (WHERE data_venda >= date_trunc('month', now())),
         count(*) FILTER (WHERE data_venda::date = now()::date)
  FROM public.ci_vendas;
$$;

CREATE OR REPLACE FUNCTION public.get_vendas_por_consultora()
RETURNS TABLE(cod_consultora text, vendas bigint, faturamento numeric, casadas bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cod_consultora, count(*), COALESCE(sum(valor_venda),0), count(*) FILTER (WHERE casada)
  FROM public.ci_vendas GROUP BY cod_consultora ORDER BY 3 DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_vendas_por_dia(p_dias int DEFAULT 30)
RETURNS TABLE(dia date, vendas bigint, faturamento numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT data_venda::date, count(*), COALESCE(sum(valor_venda),0)
  FROM public.ci_vendas
  WHERE data_venda >= (now() - (p_dias || ' days')::interval)
  GROUP BY 1 ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_vendas_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_vendas_por_consultora() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_vendas_por_dia(int) TO anon, authenticated;
