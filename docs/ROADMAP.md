# ConversIA — Roadmap

## FASE 1 — Estrutura e UI (atual ✅)
- [x] Setup React + Vite + Tailwind v4
- [x] Estrutura de pastas completa
- [x] Sidebar escura estilo enterprise
- [x] Dashboard com métricas e gráficos
- [x] Inbox com layout 3 colunas
- [x] Leads Quentes com tabela
- [x] Funil Kanban por etapa
- [x] Ranking de consultoras
- [x] Insights de padrões
- [x] Central de alertas
- [x] Histórico de marcações
- [x] Follow-up IA
- [x] Mock data realista (20 conversas, 5 consultoras)
- [x] Schema Supabase (conversa_ia)

## FASE 2 — Integração DataCrazy API
- [ ] Endpoint de autenticação DataCrazy
- [ ] Importar conversas via webhook/polling
- [ ] Importar mensagens por conversa
- [ ] Sync incremental (apenas novas msgs)
- [ ] Painel de sync_logs
- [ ] Resolver USE_MOCK = false em todos os hooks
- [ ] Testar com dados reais de produção

## FASE 3 — Motor de IA (Claude API + Whisper)
- [ ] Classificar conversas com Claude API
  - Score 0-100
  - Classificação: quente/morno/frio
  - Chance de fechamento (%)
  - Objeções detectadas
  - Erros da consultora
  - Sugestões de melhoria
  - Próxima melhor resposta
- [ ] Transcrição de áudios com Whisper
- [ ] Trigger automático: análise ao receber nova mensagem
- [ ] Cache de análises no Supabase (não reanalisar a cada request)
- [ ] Edge Function Supabase para análise assíncrona

## FASE 4 — Follow-up e Alertas Automáticos
- [ ] Alertas automáticos por regras:
  - Sem resposta +24h → alerta crítico
  - Lead quente sem follow-up +12h → alerta
  - Link não enviado após pedido +2h → alerta
- [ ] Follow-up automático sugerido pela IA
- [ ] Notificação push/WhatsApp para gestora
- [ ] Dashboard de automações ativas
- [ ] Relatório semanal automático por e-mail
