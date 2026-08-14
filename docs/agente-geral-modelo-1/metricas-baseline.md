# Métricas do Agente — baseline (antes de medir a otimização)

> Snapshot salvo pra comparar com o próximo (~1h depois), pra ver se a otimização (IDs fixos, sem tag_list nem additional_field_lead_list) reduziu as chamadas desnecessárias em conversas NOVAS.
> Os números abaixo são cumulativos (incluem chamadas de antes da otimização). A otimização foi deployada por volta de 10:24 de 2026-08-05, então o efeito aparece só nas execuções a partir daí.

## Snapshot 1 — 2026-08-05 10:28:57

### Desempenho de Ferramentas (cumulativo)
| Ferramenta | Chamadas | Sucesso |
|---|---|---|
| tag_list | 38 | 100% |
| lead_get | 38 | 100% |
| lead_add_tag | 32 | 100% |
| lead_update_notes | 21 | 95.2% |
| additional_field_lead_list | 20 | 100% |
| lead_set_additional_field | 19 | 100% |
| lead_remove_tag | 7 | 100% |
| additional_field_update | 2 | 50% (obsoleto, trocado por lead_set_additional_field) |

### Analytics gerais
- Execuções: 197
- Taxa de sucesso: 92.4%
- Tempo de resposta: 3.0s
- Crazy Tokens: 1.32M
- Resolução autônoma: 86.8%
- Contenção: 4.8% | Conversas: 21 | Msgs por conversa: 13.0
- Resolução: 96% transferência solicitada, 4% resolvida pelo agente
- Qualidade da KB: 70% | Sucesso de tools: 99%

## O que observar no próximo snapshot
- tag_list e additional_field_lead_list devem PARAR de crescer (a otimização os eliminou). Se continuarem subindo nas conversas novas, o agente ainda está consultando à toa.
- additional_field_update deve ficar parado em 2 (não usamos mais).
- lead_update_notes (95.2%): olhar se a falha se repete.
- Crazy Tokens por conversa deve cair.

## Snapshot 2 — 2026-08-05 (mesmo dia, ~1h+ depois da otimização)

### Analytics gerais
- Execuções: 573 (baseline 197 → +376)
- Taxa de sucesso: 94.2% (baseline 92.4% → subiu)
- Tempo de resposta: 2.8s (baseline 3.0s → mais rápido)
- Crazy Tokens: 3.30M (baseline 1.32M)
- Resolução autônoma: 88.3% (baseline 86.8%)
- Conversas: 75 (baseline 21 → +54 conversas novas)
- Msgs por conversa: 16.0 (baseline 13.0)

### Desempenho de Ferramentas (cumulativo)
| Ferramenta | Baseline 10:28 | Snapshot 2 | Δ | Leitura |
|---|---|---|---|---|
| tag_list | 38 | 38 | 0 | ✅ CONGELOU — eliminada nas conversas novas |
| additional_field_lead_list | 20 | 20 | 0 | ✅ CONGELOU — eliminada nas conversas novas |
| additional_field_update | 2 | 2 | 0 | ✅ parado (obsoleto, não usamos) |
| lead_remove_tag | 7 | 7 | 0 | ✅ parado (não removemos mais #IN) |
| lead_update_notes | 21 | 91 | +70 | cresce com volume (esperado) — 97.8% |
| lead_add_tag | 32 | 74 | +42 | cresce com volume (esperado) — 100% |
| lead_get | 38 | 66 | +28 | cresce com volume (esperado) — 98.5% |
| lead_set_additional_field | 19 | 60 | +41 | cresce com volume (esperado) — 96.7% |

### Conclusão
- As 3 chamadas desnecessárias congelaram (tag_list, additional_field_lead_list, additional_field_update e também lead_remove_tag): +54 conversas novas e zero crescimento nelas → prova de que as conversas pós-otimização pararam de consultar à toa.
- Só as tools úteis cresceram (notes, add_tag, get, set_additional_field), proporcional ao volume.
- Token por conversa caiu: média cumulativa 62.9k → 44k; olhando só o incremental (1.98M novos ÷ 54 conversas novas) dá ~37k por conversa nova vs ~63k antes → queda de ~40% por conversa.
- Ponto de atenção: lead_set_additional_field a 96.7% (2 falhas em 60) e lead_update_notes a 97.8% — falhas pontuais, monitorar mas nada crítico.
