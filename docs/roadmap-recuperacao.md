# EJA — Sistema de Recuperação · Roadmap & Backlog

> Documento vivo. Última atualização: 17/07/2026

## 0. Status

| Fase | O que é | Status |
|---|---|---|
| 0 | Conciliar pagos (cruzar vendas do banco × leads) | 🔜 fazer primeiro |
| 1 | Aba de Recuperação (análise + ação) | 🔜 próximo |
| 2 | Motivos de ganho/perda estruturados | 📋 backlog |
| 3 | Análise de áudio / energia da vendedora | 📋 backlog |
| 4 | Skill de vendas (a partir das conversas que fecharam) | 📋 backlog |
| 5 | IA respondendo sozinha | 🔒 depois (ver risco) |
| — | VSL + vídeo pra página de vendas | 📋 backlog (não é desse sistema) |

## 1. Aba de Recuperação — spec da tela

Regra de ouro: **não é dashboard de contemplar**. Toda tela termina em "fala com essa pessoa agora".

**Topo — 4 KPIs**
- R$ recuperável agora (já limpo de quem pagou por fora) ← número principal
- R$ recuperado no mês + % da meta
- Leads na fila (quentes / mornos / frios)
- Ticket médio recuperado

**Bloco 1 — Os dois baldes** (dois cards grandes, lado a lado)
- Recebeu link, não pagou → R$ parado · qtd · idade média
- Recebeu valor, sem link → R$ parado · qtd · idade média
- Cada um com botão "Trabalhar fila".

**Bloco 2 — 🔑 Motivos por R$ parado** — barra horizontal ordenada por R$ (não por qtd). Tela mais importante: mostra qual objeção represa mais dinheiro. Clicar no motivo → lista de leads daquele motivo.

**Bloco 3 — Curva de esfriamento** — taxa de recuperação × dias desde o último contato. Acha a janela útil → define cadência.

**Bloco 4 — Onde morre (funil de toques)** — barras: quantos leads pararam no toque 1, 2, 3, 4, 5+. Massa em 1–2 toques = problema é cadência, não script.

**Bloco 5 — Fila priorizada (o coração)** — tabela ordenável, score de prioridade = valor × temperatura × probabilidade. Colunas: nome · telefone · balde · R$ · dias parado · último motivo · quem falou por último · [Abrir conversa]. Filtros: balde · motivo · consultora · faixa de valor · dias parado · já contatado na recuperação (sim/não).

**Bloco 6 — Reagendados 📅** — fila separada por data. "Recebo dia 5" é agendamento, não perda. Dispara sozinho na data.

**Bloco 7 — Placar da recuperação** — por pessoa: conversas reabertas · links enviados · R$ recuperado · conversão.

**Regras da tela**
- ⚠️ Trava anti-vexame: quem já é aluno/pagou nunca aparece na fila
- Marcar lead como "em recuperação" pra duas pessoas não falarem com o mesmo
- Toda ação registra resultado + motivo (obrigatório)

## 2. Motivos de ganho/perda (Fase 2)
Categorias fechadas (sem texto livre como principal).
- **Perda:** preço · vou pensar · sem dinheiro agora / recebo dia X · documentação · desconfiança/golpe · prazo do curso · vai falar com alguém · sumiu · problema técnico no pagamento · outro
- **Ganho:** desconto · parcelamento · urgência/prazo · prova social · dúvida resolvida · follow-up insistente · áudio da consultora
Registrar os dois. Motivo de ganho alimenta a Fase 4.

## 3. Análise de áudio / energia (Fase 3)
Faz parte deste projeto? Não — é módulo do ConversIA (mesma base DC, objetivo diferente). Recuperação = o que fazer com o lead; ConversIA = como a consultora vende. **Verificar antes: já existe algo parecido no sistema.**
Escopo: nível conversa (nota + resumo + o que faltou); nível mensagem (por tipo); áudio (transcrição + tom/energia/ritmo/empatia, se soou robótico); comparar energia das que fecharam × não fecharam.

## 4. Skill de vendas a partir das conversas vencedoras (Fase 4)
Playbook baseado em dado real. Pega conversas que fecharam, extrai padrões (abertura, tempo de resposta, quando manda áudio, apresenta preço, contorna objeção, pede fechamento), **compara com as que não fecharam** (a comparação é o que dá o insight), destila num playbook/skill. Vira: treinamento humano + script de recuperação + base da Fase 5. Loop: playbook → aplica → mede → reextrai.

## 5. IA respondendo sozinha (Fase 5 — registrado)
Objetivo: IA responde e conduz a venda. ⚠️ Trava desde o desenho: áudio se passando por humano em escala no WhatsApp é o padrão que a Meta bane (custou as contas da Autoflix). Desenhar como: IA rascunha → humano aprova/dispara, ou IA declarada no tier 1 e humana no fechamento. Ganho está na velocidade/escala, não em fingir ser gente.

## 6. Fora deste sistema
VSL + vídeo pra página de vendas do EJA — é marketing/aquisição, não recuperação.

## 7. Ordem recomendada
1. Conciliar pagos (senão manda cobrança pra aluno)
2. Aba de Recuperação — Blocos 1, 2, 5, 6 primeiro
3. Motivos de ganho/perda obrigatórios daqui pra frente
4. Rodar a análise → balde do link primeiro (menor e mais quente)
5. Skill de vendas
6. Áudio/energia
7. IA autônoma
