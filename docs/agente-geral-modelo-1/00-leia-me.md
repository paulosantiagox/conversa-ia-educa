<!-- 🕒 Última atualização: 2026-08-04 17:46:49 (horário de Brasília) -->

# Agente Geral — Modelo 1 (mapa da pasta)

Organização do agente no formato do DataCrazy. **As instruções são um texto único** (com os títulos `# Persona`, `# Objetivo`, `# Tom`, `# Restrições`, `# Exemplos` no mesmo texto — não são abas separadas).

| No DataCrazy | O que é | Onde está aqui |
|---|---|---|
| **Instruções** (`# Persona / # Objetivo / # Tom / # Restrições / # Exemplos`) | Personalidade e regras base do agente | `01-instrucoes.md` |
| **Restrições → Restringir tópicos** (permitidos/restritos) | Trava nativa de assuntos (não é texto) | ver seção abaixo |
| **Base de Conhecimento** (usar agora) | Fatos essenciais do curso (enxuto, gasta menos token) | `02-base-conhecimento-compacta.md` |
| **Base de Conhecimento** (guardada, cresce com o tempo) | Tudo: condições, links de pagamento, casos do aluno, objeções | `03-base-conhecimento-completa.md` |
| **Fluxo do atendimento + operacional** | Sequência passo a passo, `TOKEN_FIM` (ativado/desativado), token `#APTO#`, comando `#FIM_TESTE` | `../agente-atendimento-inicial.md` |

> ⚠️ **Nada do v1 foi perdido.** Toda a lógica operacional (sequência do atendimento, interruptor `TOKEN_FIM`, token `#APTO#`, comando de teste `#FIM_TESTE`, regras) continua salva em `../agente-atendimento-inicial.md` (e no backup congelado em `../versoes/`). Quando você decidir como o DataCrazy vai marcar o fim (token manual `#APTO#` ou tag automática), a gente pluga aqui.

---

## Foto 2 — "Restringir tópicos" (permitidos/restritos)
Trava **nativa** do DataCrazy, separada do texto. Complementa a seção "Restrições".
- **Permitidos:** conclusão de estudos (EJA/supletivo), matrícula, funcionamento, certificação/validade, idade, documentação, prazos.
- **Restritos:** política, religião, outros cursos, conselhos médicos/jurídicos/financeiros, qualquer coisa fora do EJA.
- Pode deixar **desligado** e confiar na regra "fique nos assuntos do EJA" (seção Restrições). A trava é só uma camada extra.

## Foto 3 — Base de Conhecimento
Duas versões salvas:
- **Compacta** (`02-...`): sobe **agora**, gasta menos token. Tem Nome e Descrição sugeridos lá dentro.
- **Completa** (`03-...`): guardada, vai crescendo (condições, links, casos do aluno, objeções). Entra em ação quando o agente for fazer o atendimento por completo.

## O que fica fora do atendimento inicial (por enquanto)
Golpe, MEC, credenciamento, INEP, negociação de preço → **não** entram no atendimento inicial (que só qualifica e encaminha). Ficam guardados na **base completa** pra quando o agente fizer o atendimento inteiro.
