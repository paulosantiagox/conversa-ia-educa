# Agente Geral — Modelo 3 (mapa da pasta)

Atendimento completo: a IA qualifica e continua sozinha (explica, mostra valores, tira dúvidas e puxa pra matrícula), em vez de encaminhar. Base no Modelo 2, mais "vendedora".

## O que muda em relação ao Modelo 2
- NÃO aplica #PRONTO no final. Depois do histórico, em vez de parar e encaminhar, a IA segue o atendimento: explica como funciona → oferece e envia os valores → responde dúvidas → puxa pra matrícula.
- Oferece os valores (no Modelo 2 era proibido oferecer). Aqui ela explica e pergunta "quer que eu te informe os valores?".
- Valores em 2 blocos de mensagem: Bloco 1 = planos e preços; Bloco 2 = boleto, prazo e prova.
- Mais respostas prontas: como funciona, escola/certificado/INEP/validade, histórico, prazo, formas de pagamento.

## Tags no Modelo 3
- #QUENTE (49f5f84d-...): gatilho definido = assim que a IA envia os valores (mandou o valor = lead quente, passa para o atendente). Aplicada em silêncio logo após os 2 blocos de valores.
- #GOLPE (dd416434-...): aplicada quando o lead demonstra medo, receio, desconfiança ou fala em golpe (a IA tranquiliza e marca #GOLPE para o atendente resolver de perto). Separada do #QUENTE para facilitar o funil.
- #PRONTO: só quando precisa de humano — (1) não sabe uma informação ("Vou confirmar isso para você.") ou (2) lead insiste em assunto totalmente fora do EJA.
- MENOR-18: menor confirmado.
- Toda tag exige o campo CONEXAO_ATUAL gravado ANTES (mesma lição do Modelo 2, senão o lead trava no funil). Ordem: lead_get → grava CONEXAO_ATUAL → tag → mensagem.
- No fluxo normal a IA não para: aplica a tag em silêncio e continua o atendimento.

## Só responde se perguntarem
A IA não induz dúvidas (certificado, INEP, prazo, pagamento). Ela segue o roteiro e só responde esses temas se o lead perguntar.

## Menor de idade
- Certeza de menor → mensagem mínima + só MENOR-18 (sem #PRONTO).
- Dúvida na idade → não responde, só #PRONTO.

## Reaproveitado
- IDs de tag/campo iguais aos Modelos 1 e 2.
- Espaçamento das mensagens de valores usa o caractere braile invisível (U+2800). Copie do arquivo bruto (raw) do GitHub para não perder o espaçamento.

## Pontos para o Paulo confirmar
- MEC: usei "segue as diretrizes do MEC" (mais seguro) em vez de "reconhecido pelo MEC". Se preferir o outro, me avise.
- Matrícula/pagamento: hoje a IA puxa pra matrícula e pergunta a forma de pagamento, mas não gera link nem coleta pagamento (isso ainda é humano/automação). Dá pra avançar mais quando você quiser.
