<!-- 🕒 Última atualização: 2026-08-06 14:24:31 (horário de Brasília) -->

# Agente Geral — Modelo 2 (mapa da pasta)

Variante **formal e direta** do agente, de **instituição séria**, para público de baixa renda / baixa escolaridade. Postura profissional, sem bajular, direto ao que importa, com palavras simples.

## O que muda em relação ao Modelo 1
**Só as instruções** (`01-instrucoes.md`). Muda o **tom** (formal/sério, sem firula) e algumas **regras**:
- **Ano/série que parou é pergunta separada** (só pergunta o ano; NÃO oferece valores).
- **Valores:** o agente **NUNCA oferece nem empurra**. A **tabela de valores completa** (embutida no `01-instrucoes.md`) é enviada **exatamente como está, só se o lead PERGUNTAR o preço**.
- 🚫 **Tag nunca no texto:** `#PRONTO`/`MENOR-18`/`#IN` são só ferramenta (`lead_add_tag`), em silêncio; jamais aparecem numa mensagem ao lead.
- **Menor de idade:** com certeza de menor → mensagem mínima ("No momento atendemos apenas maiores de 18 anos e 6 meses.") + `#PRONTO`/`MENOR-18` em silêncio. Em dúvida da idade → **não responde nada**, só aplica `#PRONTO`. Sem seguir o resto do fluxo.
- **Pergunta/comentário fora do escopo:** para de responder **na hora**, aplica `#PRONTO` e salva o que já tiver, **sem enviar mensagem nenhuma** (não avisa que vai continuar nem que vai passar para alguém).

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
