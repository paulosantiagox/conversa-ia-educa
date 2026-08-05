<!-- 🕒 Snapshot salvo em: 2026-08-05 10:28:57 (horário de Brasília) -->

# Métricas do Agente — baseline (antes de medir a otimização)

> Snapshot salvo pra comparar com o próximo (~1h depois), pra ver se a otimização (IDs fixos, sem `tag_list` nem `additional_field_lead_list`) reduziu as chamadas desnecessárias em **conversas NOVAS**.
> ⚠️ Os números abaixo são **cumulativos** (incluem chamadas de antes da otimização). A otimização foi deployada por volta de 10:24 de 2026-08-05, então o efeito aparece só nas execuções a partir daí.

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
- Execuções: **197**
- Taxa de sucesso: **92.4%**
- Tempo de resposta: **3.0s**
- Crazy Tokens: **1.32M**
- Resolução autônoma: **86.8%**
- Contenção: 4.8% | Conversas: 21 | Msgs por conversa: 13.0
- Resolução: 96% transferência solicitada, 4% resolvida pelo agente
- Qualidade da KB: 70% | Sucesso de tools: 99%

## O que observar no próximo snapshot
- **`tag_list` e `additional_field_lead_list` devem PARAR de crescer** (a otimização os eliminou). Se continuarem subindo nas conversas novas, o agente ainda está consultando à toa.
- **`additional_field_update`** deve ficar parado em 2 (não usamos mais).
- **`lead_update_notes`** (95.2%): olhar se a falha se repete.
- Crazy Tokens por conversa deve cair.

## Snapshot 2 — (preencher quando o Paulo mandar)
