# ConversIA — Estrutura do Banco de Dados

Projeto Supabase: `dfrfeirfllwmdkenylwk`
Schema: `conversa_ia`

## Tabelas

### conversa_ia.numeros
Números de WhatsApp cadastrados no sistema.
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | Identificador |
| numero | TEXT | Número WhatsApp |
| tipo | TEXT | Tipo (ex: consultora, lead) |
| consultora | TEXT | Nome da consultora vinculada |
| ativo | BOOLEAN | Se está ativo |
| created_at | TIMESTAMPTZ | Criação |

### conversa_ia.conversas
Conversas importadas da DataCrazy.
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | Identificador |
| numero_id | UUID FK | FK para numeros |
| contato_numero | TEXT | Número do lead |
| contato_nome | TEXT | Nome do lead |
| ultima_mensagem_at | TIMESTAMPTZ | Última atividade |
| ultima_mensagem_texto | TEXT | Preview da última msg |
| total_mensagens | INT | Contador de mensagens |
| status | TEXT | aberta/quente/morno/frio/vendido/perdido |
| score_ia | INT | Score 0-100 calculado pela IA |
| classificacao_ia | TEXT | Classificação textual |
| resumo_ia | TEXT | Resumo da conversa pela IA |
| chance_fechamento | INT | % chance de fechar |
| objecoes_detectadas | TEXT[] | Array de objeções |
| erros_consultora | TEXT[] | Erros identificados pela IA |
| sugestoes_ia | TEXT[] | Sugestões de melhoria |
| proxima_melhor_resposta | TEXT | Resposta sugerida pela IA |
| recebeu_valor | BOOLEAN | Se o lead recebeu o preço |
| recebeu_link | BOOLEAN | Se recebeu link de checkout |
| follow_up_enviado | BOOLEAN | Se follow-up foi enviado |
| tempo_resposta_medio | INT | Tempo médio em minutos |
| consultora | TEXT | Nome da consultora |
| datacrazy_id | TEXT UNIQUE | ID original na DataCrazy |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

### conversa_ia.mensagens
Mensagens individuais das conversas.
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | Identificador |
| conversa_id | UUID FK | FK para conversas |
| tipo | TEXT | texto/audio/imagem |
| conteudo | TEXT | Texto da mensagem |
| transcricao | TEXT | Transcrição do áudio (Whisper) |
| de | TEXT | lead/consultora |
| enviado_at | TIMESTAMPTZ | Quando foi enviada |
| datacrazy_id | TEXT UNIQUE | ID original |
| audio_url | TEXT | URL do arquivo de áudio |
| duracao_segundos | INT | Duração do áudio |

### conversa_ia.marcacoes
Marcações manuais feitas pelas gestoras.
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | Identificador |
| conversa_id | UUID FK | FK para conversas |
| tipo | TEXT | recebeu_valor/recebeu_link/lead_quente/followup/vendido |
| nota | TEXT | Observação livre |
| criado_por | TEXT | Nome de quem marcou |

### conversa_ia.followups
Follow-ups sugeridos e enviados.
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | Identificador |
| conversa_id | UUID FK | FK para conversas |
| mensagem_sugerida | TEXT | Texto sugerido pela IA |
| motivo | TEXT | Motivo do follow-up |
| status | TEXT | pendente/enviado/ignorado |
| enviado_at | TIMESTAMPTZ | Quando foi enviado |

### conversa_ia.alertas
Alertas gerados automaticamente.
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | Identificador |
| conversa_id | UUID FK | FK para conversas |
| tipo | TEXT | sem_resposta_48h/lead_quente_sem_followup/link_nao_enviado/etc |
| descricao | TEXT | Texto descritivo do alerta |
| severidade | TEXT | critica/atencao/aviso |
| lido | BOOLEAN | Se foi marcado como lido |

### conversa_ia.sync_logs
Log de sincronizações com a DataCrazy.
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | Identificador |
| iniciado_at | TIMESTAMPTZ | Início da sync |
| finalizado_at | TIMESTAMPTZ | Fim da sync |
| conversas_importadas | INT | Total importado |
| mensagens_importadas | INT | Total importado |
| erros | INT | Total de erros |
| status | TEXT | rodando/concluido/erro |

## Índices criados
- conversas(status)
- conversas(classificacao_ia)
- conversas(consultora)
- conversas(ultima_mensagem_at DESC)
- conversas(score_ia DESC)
- mensagens(conversa_id)
- alertas(lido, created_at DESC)
