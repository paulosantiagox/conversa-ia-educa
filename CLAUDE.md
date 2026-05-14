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
- NUNCA fazer deploy sem o usuário pedir
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
