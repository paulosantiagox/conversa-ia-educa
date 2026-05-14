# ConversIA — O que é e como funciona

## O que é
ConversIA é uma central de inteligência comercial para o time de vendas do EJA Educa Brasil.
O sistema monitora, analisa e pontua conversas do WhatsApp em tempo real, ajudando gestoras e consultoras a priorizar leads, identificar erros e tomar ações mais rápidas.

## Problema que resolve
O time tem múltiplas consultoras atendendo dezenas de leads por dia via WhatsApp.
Sem visibilidade centralizada:
- Leads quentes esfriam sem follow-up
- Erros de abordagem se repetem sem feedback
- Gestoras não sabem quais conversas precisam de atenção
- Não há dados para treinamento e melhoria contínua

## Como funciona
1. **DataCrazy API** fornece as conversas e mensagens do WhatsApp
2. **Sync automático** importa novas conversas para o Supabase (schema conversa_ia)
3. **Motor de IA (Claude API)** analisa cada conversa e gera:
   - Score 0-100
   - Classificação: quente/morno/frio/vendido/perdido
   - Resumo da conversa
   - Objeções detectadas
   - Erros da consultora
   - Sugestões de melhoria
   - Próxima melhor resposta sugerida
4. **Whisper (OpenAI)** transcreve os áudios das conversas
5. **Interface React** exibe tudo em tempo real com layout de comando

## Fontes de dados
- **DataCrazy**: plataforma de gestão de WhatsApp Business que o EJA usa
- **Claude API (Anthropic)**: motor de análise e classificação de conversas
- **Whisper (OpenAI)**: transcrição de áudios enviados nas conversas
- **Supabase**: banco de dados principal + Edge Functions para processamento assíncrono

## Perfis de usuário
- **Gestora**: acessa tudo, vê ranking, insights, alertas, scores por consultora
- **Consultora** (futuro): vê apenas suas conversas e sugestões da IA para ela

## Status atual
- Fase 1 (UI + mock data) concluída
- Supabase schema criado
- Aguardando credenciais DataCrazy para Fase 2
- Aguardando chaves Claude API / Whisper para Fase 3
