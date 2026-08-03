# Inteligência de Vendas EJA — Diagnóstico, Base de Conhecimento, Estratégia e Roadmap de IA

> **Documento vivo.** É a base de conhecimento + estratégia de vendas do EJA Educa Brasil, construída a partir da análise real das conversas. Serve para (1) acompanhar o que já foi feito e o que falta, e (2) futuramente **treinar a IA de vendas**.
>
> Meta declarada: **dobrar o faturamento para R$ 400k.** Ver também `PROGRESSO.md`, `roadmap-recuperacao.md`, `base-conhecimento-eja.md`.
>
> Última atualização: 2026-08-03. Legenda de status: ✅ feito · 🟡 em andamento · ⬜ a fazer.

---

## PARTE 1 — DIAGNÓSTICO REAL (números da base, não estimativa)

### 1.1 O tamanho da operação
| Métrica | Valor |
|---|---|
| Conversas totais | 32.216 |
| Conversas reais (>1 msg) | 31.778 |
| Mensagens | 549.971 (consultora 345.306 · lead 204.760) |
| Áudios | 73.820 — **75% já transcritos** (55.647) |
| Vendas registradas | 2.796 |
| Conversas já analisadas por IA | **só 614 de 31.778** (2%) → o motor existe, mas não rodou em escala |

### 1.2 O funil, ponta a ponta
| Etapa | Qtde | Conversão da etapa anterior |
|---|---|---|
| Conversas reais | 31.778 | — |
| Receberam o **valor** (preço) | 10.513 | 33% |
| Receberam o **link** de pagamento | 3.013 | **28,7%** (de quem ouviu o preço) |
| Compraram (venda casada c/ conversa) | 972 | — |

### 1.3 🔴 O MAIOR FURO: entre VALOR e LINK
- **10.513 pessoas ouviram o preço. 8.302 (79%) NUNCA receberam o link.**
- O dinheiro não vaza na hora de pagar — vaza **antes**, no vão entre "falei o preço" e "mandei o link".

### 1.4 O que separa quem GANHA de quem PERDE (won × lost)
| Sinal | Ganhou | Perdeu | Leitura |
|---|---|---|---|
| Recebeu **valor** | 32% | 33% | **igual** → receber o preço não decide nada |
| Recebeu **link** | 36% | 8,6% | **5x** → avançar até o link é o divisor de águas |
| Tempo da 1ª resposta | **159 min** | 557 min (9h) | ganhador responde **3,5x mais rápido** |
| Profundidade (nº msgs) | 28,6 | 14,0 | ganhador **engaja o dobro** |

**Conclusão nº1:** a venda é decidida por **(a) velocidade da 1ª resposta, (b) conseguir levar o lead do preço até o link, (c) manter a conversa viva.** Não por ter dito o preço.

### 1.5 🔴 Como é o abandono
- Em **~100% das conversas perdidas, a última mensagem foi da consultora e o lead nunca mais respondeu.**
- Ou seja: o lead **some em silêncio** depois de uma mensagem da consultora. O problema não é a consultora largar o lead — é o follow-up **não reativar** quem sumiu.
- Falta descobrir (leitura em andamento): *sumiu depois de quê?* — preço cru? follow-up genérico? pedido de dados?

### 1.6 Velocidade da 1ª resposta = maior alavanca (ACHADO #1, já documentado)
| Tempo até 1ª resposta | Taxa de conversão |
|---|---|
| ≤ 5 min | **7,5%** |
| 5–30 min | 3,9% |
| 30–60 min | 4,5% |
| 1–6 h | 2,3% |
| 6 h+ | **0,9%** |

Responder em ≤5 min converte **~8x mais** que após 6h. **41% dos leads (12.479) esperam mais de 6h.** Essa é a alavanca mais barata que existe.

### 1.7 Erros de consultora mais recorrentes (detectados pela IA nas 614)
1. **Follow-ups genéricos / mensagem-template sem personalização** (disparado, o mais comum)
2. **Despedida agressiva prematura** ("5 vagas, última mensagem") afastando o lead antes de entender a objeção
3. **Não perguntou "o que travou"** — encerrou passivo
4. **Demora pra responder / queimou etapa** (mandou link antes de qualificar; ou não apresentou valor em momento nenhum)
5. **Mensagens longas e densas demais pro WhatsApp**

### 1.8 Por consultora (métrica limpa = valor→link)
| Consultora | Conversas | valor→link | Obs |
|---|---|---|---|
| Ketlen | 331 | **40,7%** | melhor taxa, volume pequeno |
| Tatiane | 12.848 | 27,8% | alto volume |
| Júlia | 14.491 | 27,0% | alto volume |

> ⚠️ Vendas por consultora estão **subcontadas** pelo casamento venda↔conversa (581 vendas caíram em "Sem atendente"). Corrigir a atribuição é um item do roadmap. A análise de áudio (em andamento) dá o veredito qualitativo de cada uma.

### 1.9 🟡 Em andamento agora (leitura profunda, 4 frentes)
1. **Vencedores** — o que quem fechou fez diferente (tática, timing, tom).
2. **Perdeu-no-valor** — o que a consultora mandou por último antes do lead sumir.
3. **Perdeu-no-link** — a fricção entre link e pagamento.
4. **Sentimento das consultoras** — tom/energia/empatia lidos nos áudios de cada uma.

*(Esta seção será preenchida com os achados assim que as leituras retornarem.)*

---

## PARTE 2 — BASE DE CONHECIMENTO (fonte de verdade da escola)

> Preencher com a análise + inputs do Paulo (página do site, anúncios, tabela de preços oficial).

### 2.1 Produto
- Curso EJA (supletivo) — Fundamental e Médio, certificação. *(detalhar: formato, duração, órgão certificador/INEP, diferenciais)*
- ⬜ Confirmar tabela de preços oficial e condições de parcelamento.

### 2.2 Perfil do lead
- Vem de anúncio (WhatsApp). Adulto que parou de estudar e quer o certificado. *(detalhar por idade, motivação, origem organic × google)*

### 2.3 Mapa de objeções (a consolidar da análise)
- Preço / "tá caro" · "vou pensar" · "sem dinheiro / recebo dia X" · documentação (histórico escolar) · desconfiança / medo de golpe (curso online) · prazo do curso · "vou falar com esposo(a)" · sumiu · problema técnico.

### 2.4 O que faz fechar (a consolidar)
- Rapidez · parcelamento claro · ancoragem de preço · prova social · áudio pessoal/humano · resolver a objeção específica · follow-up insistente **personalizado**.

---

## PARTE 3 — ESTRATÉGIA DE VENDAS / PLAYBOOK (emergente)

> Regras destiladas dos dados. Vira roteiro para as consultoras **e** o cérebro da futura IA de vendas.

### Regras já sustentadas por dado
1. **Responda em ≤5 minutos.** É a alavanca nº1 (8x). Toda demora é venda perdida.
2. **A meta de cada conversa é o LINK, não o preço.** Dizer o valor não move o ponteiro; levar ao link move 5x. Nunca soltar preço sem, na mesma sequência, encaminhar para o próximo passo.
3. **Nunca deixar o lead com a última palavra em silêncio sem reengajar de verdade** — follow-up genérico não conta.
4. **Follow-up tem que ser personalizado** (retomar o contexto, a dúvida pendente, o nome). Template puro é o erro nº1.
5. **Não usar despedida de pressão ("última vaga") cedo demais** — afasta antes de entender a objeção.
6. **Qualificar antes de mandar link** — mas sem demorar. Queimar etapa e demorar são os dois extremos ruins.
7. **Perguntar "o que te travou?"** quando o lead esfria, em vez de encerrar passivo.

*(A completar com os achados da leitura: sequência-modelo de fechamento, frases de ouro, contorno de cada objeção.)*

---

## PARTE 4 — O QUE JÁ ESTÁ PRONTO NO SISTEMA (código)

| Componente | Status | Onde |
|---|---|---|
| Motor de análise por conversa (Claude, 9 campos: score, classificação, objeções, erros, sugestões, próxima resposta, estado_consultora) | ✅ pronto (rodou só 2%) | `src/lib/analisaIA.js`, `rodarAnalise.js` |
| Transcrição de áudio (Whisper, server-side, com cache e controle de cota) | ✅ funcional (75% transcrito) | `supabase/functions/transcrever-audio`, `src/lib/rodarWhisper.js` |
| Geração de follow-up por IA + sequência automática | ✅ pronto | `src/lib/gerarFollowUp.js` |
| Integração de Vendas (casa venda↔conversa pelos 2 números) | ✅ pronto | view `ci_vendas`, `src/pages/Vendas` |
| Telemetria de custo de API (Anthropic + Whisper) | ✅ pronto | `ci_uso_api`, página Custos |
| UI de análise (AnaliseIA oculta no menu; PainelIA no Inbox) | ✅ existe | `src/pages/AnaliseIA`, `PainelIA.jsx` |
| Detecção recebeu_valor / recebeu_link | ✅ pronto | `src/lib/valorEnviado.js` |
| Página Insights | ⚠️ **100% mockada** (hardcoded, sem IA) | `src/pages/Insights` |

**Pegadinhas conhecidas:** "Evolução do Score" no PainelIA é `Math.random` (falso); "Marcações rápidas" só dão toast (não persistem); update on-demand não grava `estado_consultora` (por isso está nulo nas 614).

---

## PARTE 5 — O QUE VOU IMPLEMENTAR / SUGESTÕES (roadmap de IA)

### Fase A — Diagnóstico em escala (fazendo)
- 🟡 **Leitura profunda won×lost** (amostra estratégica) → relatório de diagnóstico visual.
- ⬜ **Rodar a análise IA na base inteira** (31k) para popular objeções/erros/estado_consultora em todas — hoje só 2%.
- ⬜ **Tabela `ci_analise_recuperacao`** com campos estruturados por conversa (cohort, motivo_perda categorizado, momento_abandono, objeção principal, sinais de compra, sentimento consultora).

### Fase B — Base de conhecimento + Playbook (o que o Paulo pediu)
- 🟡 **Este documento** — base de conhecimento viva.
- ⬜ **Playbook de vendas** destilado (roteiro + contorno de objeção + frases de ouro) — material de treino das consultoras.
- ⬜ **Categorias fechadas de motivo ganho/perda** (obrigatório marcar) para medir com precisão.

### Fase C — Ação sobre o funil (onde está o dinheiro)
- ⬜ **Alerta de 1ª resposta ≤5 min** — a alavanca nº1. Fila/alarme de leads novos sem resposta.
- ⬜ **Aba de Recuperação** — fila priorizada dos 8.302 "recebeu valor, sem link" + 2.663 "recebeu link, não pagou", com sugestão de mensagem por IA.
- ⬜ **Corrigir atribuição de venda por consultora** (581 em "Sem atendente").
- ⬜ **Ranking real de consultoras** (conversão + sentimento do áudio) com plano de treino individual.

### Fase D — IA que treina e (futuramente) vende
- ⬜ **IA de coaching**: lê a conversa em tempo real e sugere a próxima melhor resposta pra consultora (o campo `proxima_melhor_resposta` já existe).
- ⬜ **IA de vendas autônoma** dentro da janela 24h — com trava anti-ban Meta (Fase 5, alto risco, por último).
- ⬜ **Segmentação comprador organic × google** (com `lead_utm_source`).

### Sugestões extras (ideias novas para virar "o melhor do mercado")
- ⬜ **Detector de "momento de abandono"** — classificar cada perda pelo ponto exato onde o lead sumiu, pra saber onde reforçar.
- ⬜ **Score de "qualidade da conversa" por consultora** independente de venda (tom + rapidez + personalização) — treina quem precisa sem punir por sorte de lead.
- ⬜ **Biblioteca de "frases de ouro"** extraídas das vendas reais — sugeridas na hora certa.
- ⬜ **A/B de abordagem** (com áudio pessoal × texto; ancoragem de preço A × B) medindo conversão.
- ⬜ **Alerta de janela 24h** para não perder o lead pra regra do WhatsApp.
- ⬜ **Simulador de treino**: a IA faz papel de lead difícil pra consultora treinar contorno de objeção.

---

## PARTE 6 — RASTREADOR (feito × não feito) — resumo executivo

| # | Item | Status |
|---|---|---|
| 1 | Diagnóstico quantitativo do funil (números reais) | ✅ |
| 2 | Descoberta do furo valor→link (8.302 leads) | ✅ |
| 3 | Won×lost em métricas objetivas | ✅ |
| 4 | Achado da velocidade da 1ª resposta | ✅ |
| 5 | Leitura profunda won×lost (qualitativa) | 🟡 fazendo |
| 6 | Análise de sentimento dos áudios das consultoras | 🟡 fazendo |
| 7 | Relatório de diagnóstico visual | 🟡 fazendo |
| 8 | Rodar análise IA na base inteira (31k) | ⬜ |
| 9 | Playbook de vendas destilado | ⬜ |
| 10 | Base de conhecimento EJA completa (preços, produto, perfil) | ⬜ (precisa input do Paulo) |
| 11 | Alerta de 1ª resposta ≤5 min | ⬜ |
| 12 | Aba de Recuperação (fila priorizada) | ⬜ |
| 13 | Corrigir atribuição de venda por consultora | ⬜ |
| 14 | Categorias fechadas de motivo ganho/perda | ⬜ |
| 15 | IA de coaching (próxima melhor resposta ao vivo) | ⬜ |
| 16 | IA de vendas autônoma (com trava anti-ban) | ⬜ (por último) |
