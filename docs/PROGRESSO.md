# PROGRESSO — ConversIA / Recuperação EJA

> **Leia este arquivo primeiro em cada sessão.** É o "onde paramos e o que falta".
> Estrutura do cérebro do projeto (pasta `/docs`):
> - `PROGRESSO.md` (este) — onde paramos + próximo passo
> - `roadmap-recuperacao.md` — backlog completo por fase, com status
> - `base-conhecimento-eja.md` — tudo sobre a escola (cresce com a análise)

## 🎯 Foco atual
**Análise das conversas (won × lost)** para destilar padrões → playbook + base de conhecimento. É o passo que antecede a Aba de Recuperação.

## ⏭️ Próximo passo concreto
Rodar a análise das conversas em escala (won + perdeu-link + perdeu-valor), com IA lendo texto+áudio, extraindo campos estruturados pra uma tabela `ci_analise_recuperacao`. Começar com um lote e escalar.

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
