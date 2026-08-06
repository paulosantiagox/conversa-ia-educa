<!-- 🕒 Última atualização: 2026-08-06 14:03:03 (horário de Brasília) -->

# Agente Geral — Modelo 2 (mapa da pasta)

Variante **simples e direta** do agente, pra público de baixa renda / baixa escolaridade. Perguntas secas, curtas, como um **humano digitando no celular**, sem enrolação.

## O que muda em relação ao Modelo 1
**Só as instruções** (`01-instrucoes.md`). Muda o **tom** (seco/direto, sem firula) e duas **regras de encaminhamento**:
- **Menor de idade:** encaminha na hora pra consultora (aplica `#PRONTO`), sem seguir o resto do fluxo.
- **Pergunta/comentário fora do escopo:** para de responder **na hora**, aplica `#PRONTO` e salva o que já tiver, **sem mandar mensagem nenhuma** (não avisa que vai continuar nem que vai passar pra alguém).

## O que é REAPROVEITADO do Modelo 1 (não duplicado aqui)
- **Base de conhecimento:** a mesma. Use `../agente-geral-modelo-1/02-base-conhecimento-compacta.md` (e a completa `03-...`). O curso não mudou.
- **IDs de tag e campo:** os mesmos (já embutidos no `01-instrucoes.md` deste modelo).

## Conceito de `#PRONTO` no Modelo 2
Aqui o `#PRONTO` é o sinal de **"consultora assume"** e é aplicado em 3 casos:
1. Lead **apto** (adulto, qualificado) → `#PRONTO`.
2. Lead **menor de 18** → `#PRONTO` (+ `MENOR-18` de contexto), encaminha na hora.
3. Lead que faz **pergunta/comentário fora do escopo** → `#PRONTO` na hora, sem responder, mesmo sem todas as respostas.

## Trava nativa (igual ao Modelo 1)
- **Restringir tópicos:** permitidos = EJA/supletivo, matrícula, funcionamento, certificação/validade, idade, documentação, prazos. Restritos = política, religião, outros cursos, conselhos médicos/jurídicos/financeiros.
