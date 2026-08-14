# Agente Geral — Modelo 1 (mapa da pasta)

Estrutura nova e independente do agente no formato do DataCrazy. As instruções são um texto único e autossuficiente (tudo que o agente precisa está lá dentro: configuração, sequência, regras, token, exemplos).

| No DataCrazy | O que é | Onde está aqui |
|---|---|---|
| Instruções | # Persona / # Objetivo (com a sequência completa do atendimento) / # Tom / # Restrições / # Exemplos + campos | 01-instrucoes.md |
| Restrições → Restringir tópicos (permitidos/restritos) | Trava nativa de assuntos (não é texto) | ver seção abaixo |
| Base de Conhecimento (usar agora) | Fatos essenciais do curso (enxuto) | 02-base-conhecimento-compacta.md |
| Base de Conhecimento (guardada, cresce) | Tudo: condições, links, casos do aluno, objeções | 03-base-conhecimento-completa.md |

> Tudo é autossuficiente aqui dentro. A sequência completa do atendimento (objetivo → dados → idade → histórico → encerramento) está dentro do 01-instrucoes.md. Esta pasta não depende de nenhum outro arquivo.
>
> ℹ️ O token de fim / handoff (parar a IA e passar pra atendente) foi retirado por enquanto pra focar no atendimento. Será definido depois (token manual ou tag automática do DataCrazy).

---

## Foto 2 — "Restringir tópicos" (permitidos/restritos)
Trava nativa do DataCrazy, separada do texto. Complementa a seção "Restrições".
- Permitidos: conclusão de estudos (EJA/supletivo), matrícula, funcionamento, certificação/validade, idade, documentação, prazos.
- Restritos: política, religião, outros cursos, conselhos médicos/jurídicos/financeiros, qualquer coisa fora do EJA.
- Pode deixar desligado e confiar na regra "fique nos assuntos do EJA" (seção Restrições). É só uma camada extra.

## Foto 3 — Base de Conhecimento
- Compacta (02-...): sobe agora, gasta menos token. Tem Nome e Descrição sugeridos lá dentro.
- Completa (03-...): guardada, vai crescendo (condições, links, casos do aluno, objeções). Entra em ação quando o agente for fazer o atendimento por completo.

## O que fica fora do atendimento inicial (por enquanto)
Golpe, MEC, credenciamento, INEP, negociação de preço → não entram no atendimento inicial (que só qualifica e encaminha). Ficam guardados na base completa.
