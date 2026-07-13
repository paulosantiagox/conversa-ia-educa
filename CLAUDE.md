# ConversIA — Central de inteligência de conversas EJA Educa Brasil

## Stack
React 19 + Vite + Tailwind v4 + Recharts
Supabase: projeto dfrfeirfllwmdkenylwk, schema conversa_ia
Porta: 5175 (5174 = Data Global, nunca usar a mesma)

## Iniciar servidor
pkill -f vite 2>/dev/null
rm -rf node_modules/.vite
npm run dev -- --port 5175

## Comandos úteis
"deploy github" → git add . && git commit -m 'update' && git push origin main

## Regras obrigatórias
- SEMPRE branch main
- SEMPRE pkill -f vite antes de iniciar
- SEMPRE porta 5175
- SEMPRE commitar E dar push (git add -A && commit && push origin main) a cada modificação de código — usuário quer o GitHub sempre atualizado para ver no front. Pode commitar várias vezes.
- NUNCA remover código existente sem confirmar
- Estilo enterprise SaaS — denso, compacto, funcional
- Sidebar escura (#0f172a)
- Cores apenas para status e alertas
- Sem shadows excessivas — border 1px solid

## Design system
- Sidebar bg: #0f172a
- Status quente: #ef4444
- Status morno: #f59e0b
- Status frio: #94a3b8
- Status vendido: #22c55e
- Status perdido: #374151
- Alerta crítico: #ef4444
- Alerta atenção: #f97316
- Ícones: lucide-react only

## Estrutura de pastas
src/
├── components/layout/   Sidebar, Topbar, MainLayout
├── components/shared/   StatusBadge, ScoreBar, MetricCard, ConversaItem, ChatBubble, PainelIA
├── pages/               Dashboard, Inbox, LeadsQuentes, Funil, Ranking, Insights, Alertas, Marcacoes, FollowUp
├── hooks/               useConversas, useLeadsQuentes, useFunil
├── lib/                 supabase.js, utils.js, mockData.js
└── contexts/            FiltroContext.jsx

## Mock data (USE_MOCK = true)
Arquivo: src/lib/mockData.js
5 consultoras: Tatiane, Júlia, Ketlen, Roger (inativo), Tainá (inativa)
20 conversas com dados realistas
Quando USE_MOCK = false → busca do Supabase (schema: conversa_ia)

## Supabase
Projeto: dfrfeirfllwmdkenylwk
Schema: conversa_ia
Tabelas: numeros, conversas, mensagens, marcacoes, followups, alertas, sync_logs

## Motor de IA
Modelo: claude-sonnet-4-6
Análise: score, classificação, chance fechamento, objeções, erros, sugestões
Página: /analise-ia
Processa em lotes de 100, delay 500ms entre análises
Prioridade: conversas mais recentes primeiro (ORDER BY ultima_mensagem_at DESC)
Ignora: conversas com menos de 2 mensagens
Lib: src/lib/analisaIA.js (analisarConversa) + src/lib/rodarAnalise.js (rodarAnaliseIA, rodarAnaliseModo, contarPendentes)

## DataCrazy
Base URL: https://api.g1.datacrazy.io
Filtro obrigatório: apenas instâncias com nome começando em "EEB"
Rate limit: 60 req/min — sempre usar delay de 1s entre páginas
Sync manual: página /sync
Campo consultora: attendants[0].name (fallback: "Sem atendente")
Lib: src/lib/datacrazy.js (fetchConversations, fetchMessages, isEJA, mapConversation)
Sync: src/lib/syncDataCrazy.js (syncConversas, syncMensagensConversa, organizarDadosConversa)
Sync mensagens: src/lib/syncMensagens.js (syncMensagensModo, estimarTempo)

## Modos de operação (TESTE / RECENTES / COMPLETO)
Todas as operações de sync e análise usam 3 modos selecionáveis:
- TESTE: 50 conversas mais recentes — para validar sem impacto (~1 min)
- RECENTES: Últimos 30 dias — para operação diária (~20–60 min)
- COMPLETO: Todas as pendentes — overnight (~4h+)

Sync de Conversas: syncConversas() — sempre varre todas as páginas da API
Sync de Mensagens: syncMensagensModo(modo) — busca total_mensagens=0 (exceto teste: 50 recentes)
Análise IA: rodarAnaliseModo(modo) — busca score_ia IS NULL + total_mensagens > 0
Análise individual: PainelIA tem botão "Analisar esta conversa" → analisarConversa() + upsert

## Campos calculados (organizarDadosConversa)
- total_mensagens: contagem de msgs não-internas não-deletadas
- primeira_msg_automatica: true se primeira msg da consultora é áudio
- tempo_resposta_medio: média dos tempos (min) de resposta lead→consultora (<24h)
- janela_24h_status: 'aberta' (<20h) | 'critica' (20-24h) | 'expirada' (>24h) | 'sem_interacao'
