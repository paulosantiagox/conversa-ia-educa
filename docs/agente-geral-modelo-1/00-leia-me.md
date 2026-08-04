<!-- 🕒 Última atualização: 2026-08-04 17:25:56 (horário de Brasília) -->

# Agente Geral — Modelo 1 (mapa da pasta)

Organização do agente no formato do DataCrazy. O que vai em cada lugar:

| No DataCrazy | O que é | Arquivo aqui |
|---|---|---|
| **Instruções** (abas Persona / Objetivo / Tom / Restrições / Exemplos) — *foto 1* | A personalidade e as regras do agente | `01-instrucoes.md` |
| **Restrições → Restringir tópicos** (permitidos/restritos) — *foto 2* | Trava nativa de assuntos que o agente pode/não pode tratar | ver seção abaixo |
| **Base de Conhecimento** — *foto 3* | Fatos do curso + FAQs pra IA responder com precisão | `02-base-conhecimento.md` |
| **Fluxo do atendimento inicial** (passo a passo + token `#APTO#`) | O roteiro operacional da conversa | `../agente-atendimento-inicial.md` |

---

## Sobre a foto 2 — "Restringir tópicos" (permitidos/restritos)

É uma **trava nativa** do DataCrazy, separada do texto das instruções. Ela **complementa** a seção "Restrições": o texto dá as regras de comportamento, e essa trava limita **de que assuntos** o agente fala.

**Recomendação (opcional, mas útil):** ligar o toggle e preencher:
- **Tópicos permitidos:** conclusão de estudos (EJA/supletivo), matrícula, funcionamento do curso, certificação e validade, regra de idade, documentação/histórico, prazos, dúvidas gerais sobre o EJA Educa Brasil.
- **Tópicos restritos:** assuntos fora do EJA (política, religião, outros cursos que não oferecemos, conselhos médicos/jurídicos/financeiros pessoais), qualquer coisa não relacionada ao atendimento.

Se preferir simplicidade, dá pra deixar **desligado** e confiar na regra da seção "Restrições" ("fique nos assuntos do EJA"). A trava nativa é só uma camada extra de segurança.

## Sobre a foto 3 — Base de Conhecimento

**Vale a pena sim.** Serve pra IA responder dúvidas do lead (certificado, validade, idade, documentos, prazos) sem inventar. O rascunho já está em `02-base-conhecimento.md`, com sugestão de **Nome** e **Descrição** pra colar no formulário.
⚠️ **Não** coloque preço/valores na KB (muda com frequência e é tratado no atendimento).
