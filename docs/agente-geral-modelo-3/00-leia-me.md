<!-- 🕒 Última atualização: 2026-08-06 15:57:48 (horário de Brasília) -->

# Agente Geral — Modelo 3 (mapa da pasta)

Atendimento **completo**: a IA qualifica e **continua sozinha** (explica, mostra valores, tira dúvidas e puxa pra matrícula), em vez de encaminhar. Base no Modelo 2, mais "vendedora".

## O que muda em relação ao Modelo 2
- **NÃO aplica `#PRONTO` no final.** Depois do histórico, em vez de parar e encaminhar, a IA **segue o atendimento**: explica como funciona → oferece e envia os valores → responde dúvidas → puxa pra matrícula.
- **Oferece os valores** (no Modelo 2 era proibido oferecer). Aqui ela explica e pergunta "quer que eu te informe os valores?".
- **Valores em 2 blocos** de mensagem: Bloco 1 = planos e preços; Bloco 2 = boleto, prazo e prova.
- **Mais respostas prontas**: como funciona, escola/certificado/INEP/validade, histórico, prazo, formas de pagamento.

## `#PRONTO` no Modelo 3 (só em 2 casos)
Só encaminha (aplica `#PRONTO`) quando **precisa de humano**:
1. Não sabe uma informação → "Vou confirmar isso para você." + `#PRONTO`.
2. Lead insiste em assunto totalmente fora do EJA → traz de volta uma vez; se insistir, "Vou verificar isso e já te retorno." + `#PRONTO`.
No fluxo normal (qualificação → explicação → valores → matrícula) **não aplica tag**.

## Menor de idade
- Certeza de menor → mensagem mínima + só `MENOR-18` (sem `#PRONTO`).
- Dúvida na idade → não responde, só `#PRONTO`.

## Reaproveitado
- IDs de tag/campo iguais aos Modelos 1 e 2.
- Espaçamento das mensagens de valores usa o caractere braile invisível (U+2800). Copie do arquivo bruto (raw) do GitHub para não perder o espaçamento.

## Pontos para o Paulo confirmar
- **MEC:** usei "segue as diretrizes do MEC" (mais seguro) em vez de "reconhecido pelo MEC". Se preferir o outro, me avise.
- **Matrícula/pagamento:** hoje a IA puxa pra matrícula e pergunta a forma de pagamento, mas não gera link nem coleta pagamento (isso ainda é humano/automação). Dá pra avançar mais quando você quiser.
