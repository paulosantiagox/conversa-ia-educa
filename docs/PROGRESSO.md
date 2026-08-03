# PROGRESSO — ConversIA / Recuperação EJA

> **Leia este arquivo primeiro em cada sessão.** É o "onde paramos e o que falta".
> Estrutura do cérebro do projeto (pasta `/docs`):
> - `PROGRESSO.md` (este) — onde paramos + próximo passo
> - `roadmap-recuperacao.md` — backlog completo por fase, com status
> - `base-conhecimento-eja.md` — tudo sobre a escola (cresce com a análise)

## 🎯 Foco atual
Diagnóstico won×lost **concluído** (amostra estratégica de 120 conversas + áudios). Achados e estratégia em `/docs/inteligencia-vendas.md`; relatório visual em `/docs/relatorio-diagnostico-vendas.html`. Próximo: transformar os achados em ação sobre o funil.

## ⏭️ Próximo passo concreto
Construir o **motor de callback na "data do dinheiro"** (prioridade nº1 do plano de ação) + **ponte de pagamento antes do link**. Em paralelo: rodar a análise de IA na base inteira (hoje só 2%) para `ci_analise_recuperacao` e corrigir a atribuição de consultora por mensagem.

## 📄 Diagnóstico (03/08) — achados-chave
- **Maior furo: valor→link.** 10.513 ouviram o preço, só 3.013 receberam link → 8.302 vazaram aí.
- Won×lost: receber o valor é igual (~32%); o que decide é chegar no link (36% vs 8,6%), velocidade da 1ª resposta (159 vs 557 min) e engajamento (28 vs 14 msgs).
- Perdeu-no-link ~40% recuperável ("só recebo dia X" sem callback). Perdeu-no-valor: 53% somem no preço cru + fechamento binário sem ponte de pagamento.
- Consultoras: Júlia consultiva (9/8), Tatiane fechadora robótica (6/8), Ketlen suporte (8/5). Atribuição por conversa distorce ranking — corrigir p/ nível de mensagem.

## ✅ Feito (changelog)
- **20/07:** Sincronização recuperada (conversas/mensagens/tags), transcrição server-side (Edge Function, contornando bloqueio CORS da OpenAI), integração de **Vendas** (casa pelos 2 números), monitor de **Tags** (Marcações/Inbox/Vendas), **auto-sync server-side** (cron VPS 15 min + flock + mini-log), Ranking/Matriculados/Análise-IA/Re-sync ocultos do menu.
- **20/07:** Roadmap de Recuperação e Base de Conhecimento criados em `/docs`.

## 📋 Backlog priorizado (resumo — detalhe no roadmap)
1. **Análise das conversas em escala** (won×lost) → padrões, objeções, o que funciona ← *fazendo*
2. **Base de conhecimento EJA** (`base-conhecimento-eja.md`) — preencher com análise + dados do site (usuário fornece página/anúncio)
3. **Conciliar pagos** (Fase 0) — view `ci_recuperacao` (trava anti-vexame = venda casada; NÃO usar tags AF-* = Autoflix)
4. **Aba de Recuperação** (Fase 1) — KPIs + 2 Frentes + fila priorizada + reagendados
5. **Motivos ganho/perda** (Fase 2) — categorias fechadas, obrigatório
6. **Comparação do atendimento das vendedoras** — quem vende melhor e por quê → melhorias
7. **Skill/playbook de vendas** (Fase 4) — sai da análise
8. **Análise de áudio/energia por mensagem** (Fase 3) — já existe parcial (estado_consultora)
9. **IA respondendo sozinha** (Fase 5) — com trava anti-ban Meta
10. **Segmentação comprador organic × google** — com lead_utm_source
11. **VSL + vídeo página de vendas** — fora deste sistema (aquisição)

## Como não esquecer
Toda sessão: ler `/docs/PROGRESSO.md`. Ao terminar algo: mover pra "Feito", atualizar "Próximo passo". Ideia nova: adicionar no backlog aqui e detalhar no roadmap.
