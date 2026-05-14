# ConversIA — Pendências

## Imediato (para funcionar com dados reais)
- [ ] Preencher VITE_SUPABASE_ANON_KEY no .env
- [ ] Executar SQL do schema conversa_ia no Supabase
- [ ] Obter credenciais da DataCrazy API
- [ ] Obter chave Claude API para motor de IA
- [ ] Obter chave Whisper/OpenAI para transcrição de áudios

## Melhorias de UI
- [ ] Adicionar skeleton loading nas tabelas
- [ ] Paginação na lista do Inbox (atualmente sem limite)
- [ ] Filtro de período funcional (hoje/7d/30d)
- [ ] Busca global com hotkey (Ctrl+K)
- [ ] Player de áudio real no ChatBubble
- [ ] Notificação toast ao salvar marcação

## Funcionalidades
- [ ] Modal de detalhes da conversa ao clicar no funil
- [ ] Editar status da conversa direto pelo Inbox
- [ ] Exportar dados (CSV) no Ranking e Dashboard
- [ ] Gráfico de evolução do score de uma conversa ao longo do tempo
- [ ] Página de configurações (consultoras, regras de alerta)

## Integração
- [ ] Webhook DataCrazy → Supabase para sync em tempo real
- [ ] Edge Function para análise automática com Claude API
- [ ] Edge Function para transcrição com Whisper
- [ ] Geração automática de alertas por regras configuráveis
