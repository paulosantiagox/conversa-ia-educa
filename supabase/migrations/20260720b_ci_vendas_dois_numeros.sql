-- Casa a venda com a conversa por QUALQUER um dos dois números:
--   whatsapp (comprador — quem pagou)  OU  whatsapp_contato (associado — onde o lead conversou).
-- Regra nova do DataCrazy: registra de onde o lead veio e deixa "associado", para os casos
-- em que a pessoa compra com um número mas conversou por outro.
-- Prioriza o número ASSOCIADO no casamento (é onde a conversa realmente aconteceu).
-- Ganho: cobertura das vendas recentes subiu (~461 -> 512 casadas; +52 via associado).
-- Expõe whatsapp_associado, associado_final8 e match_por ('comprador' | 'associado').

DROP FUNCTION IF EXISTS public.get_vendas_stats(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_vendas_por_consultora(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_vendas_por_dia(timestamptz, timestamptz);
DROP VIEW IF EXISTS public.ci_vendas;

CREATE VIEW public.ci_vendas AS
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
  v.whatsapp AS whatsapp_comprador,
  v.whatsapp_contato AS whatsapp_associado,
  v.whatsapp_final8,
  right(regexp_replace(coalesce(v.whatsapp_contato,''), '\D', '', 'g'), 8) AS associado_final8,
  v.evento_id_origem, v.inserted_at, v.updated_at,
  c.id AS conversa_id, c.contato_nome AS conversa_contato_nome, c.consultora AS conversa_consultora,
  c.classificacao_ia, c.score_ia,
  (c.id IS NOT NULL) AS casada,
  CASE WHEN c.id IS NULL THEN NULL WHEN c.cc_f8 = v.whatsapp_final8 THEN 'comprador' ELSE 'associado' END AS match_por
FROM public.eja_vendas v
LEFT JOIN LATERAL (
  SELECT cc.id, cc.contato_nome, cc.consultora, cc.classificacao_ia, cc.score_ia,
         right(regexp_replace(cc.contato_numero, '\D', '', 'g'), 8) AS cc_f8
  FROM ci_conversas cc
  WHERE right(regexp_replace(cc.contato_numero, '\D', '', 'g'), 8) IN (
          v.whatsapp_final8,
          right(regexp_replace(coalesce(v.whatsapp_contato,''), '\D', '', 'g'), 8))
    AND right(regexp_replace(cc.contato_numero, '\D', '', 'g'), 8) <> ''
  ORDER BY
    (right(regexp_replace(cc.contato_numero, '\D', '', 'g'), 8)
       = right(regexp_replace(coalesce(v.whatsapp_contato,''), '\D', '', 'g'), 8)) DESC NULLS LAST,
    cc.ultima_mensagem_at DESC NULLS LAST
  LIMIT 1
) c ON true;

GRANT SELECT ON public.ci_vendas TO anon, authenticated;

-- RPCs recriadas (idênticas — dependem da view)
CREATE FUNCTION public.get_vendas_stats(p_inicio timestamptz, p_fim timestamptz)
RETURNS TABLE(total bigint, casadas bigint, faturamento numeric, ticket_medio numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*), count(*) FILTER (WHERE casada), COALESCE(sum(valor_venda),0), COALESCE(avg(valor_venda),0)
  FROM public.ci_vendas WHERE data_venda >= p_inicio AND data_venda < p_fim; $$;
CREATE FUNCTION public.get_vendas_por_consultora(p_inicio timestamptz, p_fim timestamptz)
RETURNS TABLE(cod_consultora text, vendas bigint, faturamento numeric, casadas bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cod_consultora, count(*), COALESCE(sum(valor_venda),0), count(*) FILTER (WHERE casada)
  FROM public.ci_vendas WHERE data_venda >= p_inicio AND data_venda < p_fim GROUP BY cod_consultora ORDER BY 3 DESC; $$;
CREATE FUNCTION public.get_vendas_por_dia(p_inicio timestamptz, p_fim timestamptz)
RETURNS TABLE(dia date, vendas bigint, faturamento numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT data_venda::date, count(*), COALESCE(sum(valor_venda),0)
  FROM public.ci_vendas WHERE data_venda >= p_inicio AND data_venda < p_fim GROUP BY 1 ORDER BY 1; $$;
GRANT EXECUTE ON FUNCTION public.get_vendas_stats(timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_vendas_por_consultora(timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_vendas_por_dia(timestamptz, timestamptz) TO anon, authenticated;
