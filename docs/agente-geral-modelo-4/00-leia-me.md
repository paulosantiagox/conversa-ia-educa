<!-- 🕒 Última atualização: 2026-08-13 15:12:49 (horário de Brasília) -->

# Agente Geral — Modelo 4 (mapa da pasta)

Evolução do Modelo 3: mesma lógica, mais enxuto (~25% menos texto = menos token por execução) e com correções dos erros achados nas conversas reais da Claudia 3 (10–13/08).

## Correções embutidas (erros reais encontrados)
1. IA respondendo no lugar do lead (ex.: mandou "Consigo sim." se passando pelo lead antes de ele responder). Nova regra dura: *"NUNCA escreva a fala do lead; faça UMA pergunta e espere a resposta de verdade."*
2. Mensagens-lixo (mandou "---" 25x e o caractere de espaçamento "⠀" solto). Nova regra: *"Nunca envie mensagem vazia ou só com símbolos."*
3. Valores cortados (uns 5–6 casos em ~1.000 envios saíram parciais). Reforço: *"envie os DOIS blocos COMPLETOS, sem cortar; nunca parcial."*
4. Mantidas as travas do Modelo 3: sempre PT-BR, `#GOLPE` só em desconfiança real, responder dúvidas não passa o atendimento, campo `CONEXAO_ATUAL` antes de qualquer tag.

## Tags (iguais ao Modelo 3)
`#QUENTE` (ao enviar os valores) · `#GOLPE` (desconfiança real) · `#PRONTO` (precisa de humano) · `MENOR-18` (menor).

## Enxugamento (o que foi feito p/ cortar token)
- Seções fundidas e repetições removidas (regras de tag, "diferença do modelo 3", avisos duplicados).
- Fluxo e Fatos condensados; conteúdo essencial mantido.
- Os valores e a resposta longa de MEC continuam no texto (exatos).

## Próximo passo de otimização (a decidir)
O maior gasto de token são os blocos de valores (~1.440 caracteres) e a resposta longa de MEC (~800), que são enviados a cada execução como parte das instruções. Se o DataCrazy carregar a Base de Conhecimento sob demanda, mover esses blocos para a KB (e deixar nas instruções só um "envie a tabela de valores da KB") reduziria bem o token por execução. Depende de como a sua KB está configurada — vale testar.

## Não mexe no Modelo 3
O Modelo 3 fica intacto na pasta dele. O Modelo 4 é uma pasta separada para testar sem perder o 3.
