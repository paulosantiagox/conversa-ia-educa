import { supabase } from './supabase'
import { getTemplates } from './followupTemplates'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
const MODEL = 'claude-sonnet-4-6'

function formatarUltimasMensagens(mensagens) {
  return mensagens
    .slice(-20)
    .map(m => {
      const quem = m.de === 'lead' ? 'Lead' : 'Consultora'
      const conteudo = m.tipo === 'audio' && m.transcricao
        ? `[Áudio]: ${m.transcricao.substring(0, 200)}`
        : m.tipo === 'audio'
        ? '[Áudio sem transcrição]'
        : (m.conteudo ?? '').substring(0, 200)
      return `${quem}: ${conteudo}`
    })
    .join('\n')
}

export async function gerarMensagemFollowUp(conversa, mensagens, template = null) {
  if (!API_KEY) return null

  const ultimasMsgs = formatarUltimasMensagens(mensagens)
  const classificacao = conversa.classificacao_ia ?? 'morno'
  const score = conversa.score_ia ?? 50
  const resumo = conversa.resumo_ia ?? ''
  const sugestoes = Array.isArray(conversa.sugestoes_ia) ? conversa.sugestoes_ia.join('; ') : ''
  const nomeContato = conversa.contato_nome || conversa.contato_numero || 'o lead'
  const consultora = conversa.consultora ?? 'a consultora'
  const janela = conversa.janela_24h_status ?? 'aberta'

  const urgencia = janela === 'critica'
    ? 'URGENTE: a janela de 24h do WhatsApp está quase expirando (menos de 4h restantes). A mensagem deve ser enviada imediatamente.'
    : 'A janela de 24h está aberta. Envie uma mensagem de reengajamento natural.'

  const tipoInstrucao = template
    ? `TIPO DE MENSAGEM: ${template.titulo}\nDIRETRIZ: ${template.instrucao}`
    : 'TIPO DE MENSAGEM: Padrão — reengajamento natural baseado no contexto da conversa.'

  const prompt = `Você é um especialista em follow-up de vendas para o EJA Educa Brasil (cursos de educação básica para adultos — EJA).

CONTEXTO:
- Lead: ${nomeContato}
- Classificação IA: ${classificacao} (score ${score}/100)
- Consultora: ${consultora}
- ${urgencia}
${resumo ? `- Resumo da conversa: ${resumo}` : ''}
${sugestoes ? `- Sugestões da IA: ${sugestoes}` : ''}

ÚLTIMAS MENSAGENS DA CONVERSA:
${ultimasMsgs}

${tipoInstrucao}

TAREFA:
Gere UMA única mensagem de follow-up para o WhatsApp seguindo o tipo acima. A mensagem deve:
- Ser curta (2-4 linhas máximo)
- Tom natural, humano, não robótico
- Fazer referência ao contexto real da conversa (não genérico)
- Usar linguagem simples e direta (público adulto buscando retomar estudos)
- Não usar emojis em excesso (máximo 1-2)
- Ser escrita em primeira pessoa como se fosse a consultora ${consultora}

Responda APENAS com o texto da mensagem, sem aspas, sem prefixos, sem explicações.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: 'Você gera mensagens de follow-up para WhatsApp. Responda APENAS com o texto da mensagem, sem aspas, sem formatação extra.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    const texto = data?.content?.[0]?.text?.trim() ?? ''

    const inputTokens = data?.usage?.input_tokens ?? 0
    const outputTokens = data?.usage?.output_tokens ?? 0
    const custoUsd = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15
    await supabase.from('ci_uso_api').insert({
      servico: 'anthropic',
      operacao: 'followup_mensagem',
      modelo: MODEL,
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      custo_usd: custoUsd,
      conversa_id: conversa.id ?? null,
    })

    return texto
  } catch {
    return null
  }
}

export async function salvarFollowUp(conversaId, mensagemSugerida, motivo = 'janela_24h') {
  const { data, error } = await supabase
    .from('ci_followups')
    .insert({
      conversa_id: conversaId,
      mensagem_sugerida: mensagemSugerida,
      motivo,
      status: 'pendente',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function marcarFollowUpEnviado(followUpId) {
  await supabase
    .from('ci_followups')
    .update({ status: 'enviado', enviado_at: new Date().toISOString() })
    .eq('id', followUpId)
}

// Busca conversas com janela aberta/crítica que ainda não têm follow-up pendente
// e gera sugestões automaticamente com lógica de sequência. Chamado a cada 10 min.
export async function processarFollowUpsAuto(onLog = () => {}) {
  // Busca TODAS as conversas com janela ativa (limit alto para não perder ninguém)
  // Exclui conversas já vendidas (matriculados)
  const { data: conversas, error } = await supabase
    .from('ci_conversas')
    .select('id, contato_nome, contato_numero, consultora, classificacao_ia, score_ia, resumo_ia, sugestoes_ia, janela_24h_status, datacrazy_id, ultima_mensagem_lead_at, recebeu_valor')
    .in('janela_24h_status', ['aberta', 'critica'])
    .neq('classificacao_ia', 'vendido')
    .gt('total_mensagens', 0)
    .order('janela_24h_status', { ascending: false }) // critica (c > a) vem primeiro
    .limit(500)

  if (error || !conversas?.length) return { gerados: 0, ignorados: 0 }

  const ids = conversas.map(c => c.id)

  // Busca follow-ups existentes para todas as conversas de uma vez
  const { data: todosFollowUps } = await supabase
    .from('ci_followups')
    .select('conversa_id, status, enviado_at')
    .in('conversa_id', ids)

  const followUpsPorConversa = {}
  for (const fu of (todosFollowUps ?? [])) {
    if (!followUpsPorConversa[fu.conversa_id]) followUpsPorConversa[fu.conversa_id] = []
    followUpsPorConversa[fu.conversa_id].push(fu)
  }

  // Filtra conversas que já têm follow-up pendente (skip)
  const paraProcessar = conversas.filter(c => {
    const fus = followUpsPorConversa[c.id] ?? []
    return !fus.some(f => f.status === 'pendente')
  }).slice(0, 100)

  if (!paraProcessar.length) {
    onLog(`ℹ [Follow-up] Nenhuma conversa nova para processar`)
    return { gerados: 0, ignorados: conversas.length }
  }

  onLog(`ℹ [Follow-up] ${paraProcessar.length} conversas para gerar sugestão`)
  let gerados = 0

  // Busca templates para seleção por sequência
  let templates = []
  try {
    templates = getTemplates()
  } catch { /* sem templates */ }

  for (const conv of paraProcessar) {
    try {
      const fus = followUpsPorConversa[conv.id] ?? []
      const enviados = fus.filter(f => f.status === 'enviado')
      const seqAtual = enviados.length // quantos já foram enviados

      const isValor = conv.recebeu_valor === true
      const maxSeq = isValor ? 3 : 2

      // Verifica se já atingiu o máximo de sequência
      if (seqAtual >= maxSeq) {
        onLog(`ℹ [Follow-up] ${conv.contato_nome || conv.contato_numero} — máximo de ${maxSeq} follow-ups atingido, ignorando`)
        continue
      }

      // Verifica espaçamento mínimo desde o último enviado
      if (enviados.length > 0) {
        const ultimoEnviadoAt = enviados
          .map(f => f.enviado_at)
          .filter(Boolean)
          .sort()
          .at(-1)

        if (ultimoEnviadoAt) {
          const agora = Date.now()
          const ultimoMs = new Date(ultimoEnviadoAt).getTime()
          const diffHoras = (agora - ultimoMs) / 3_600_000

          let esperaHoras = 0
          if (isValor) {
            esperaHoras = seqAtual === 1 ? 1 : 6 // seq 1→2: 1h; seq 2→3: 6h
          } else {
            esperaHoras = 4 // Normal seq 1→2: 4h
          }

          if (diffHoras < esperaHoras) {
            onLog(`ℹ [Follow-up] ${conv.contato_nome || conv.contato_numero} — aguardando espaçamento (${esperaHoras}h, faltam ${(esperaHoras - diffHoras).toFixed(1)}h)`)
            continue
          }
        }
      }

      // Seleciona template baseado na sequência
      let template = null
      if (seqAtual === 1) {
        // seq 2: template 'urgencia' ou índice 4
        template = templates.find(t => t.id === 'urgencia') ?? templates[4] ?? null
      } else if (seqAtual === 2) {
        // seq 3: template 'direto' ou último
        template = templates.find(t => t.id === 'direto') ?? templates[templates.length - 1] ?? null
      }
      // seq 1 (seqAtual === 0): template null (padrão)

      // Define motivo
      let motivo
      if (isValor) {
        motivo = seqAtual === 0 ? 'recebeu_valor_seq1' : seqAtual === 1 ? 'recebeu_valor_seq2' : 'recebeu_valor_seq3'
      } else if (seqAtual === 0) {
        motivo = conv.janela_24h_status === 'critica' ? 'janela_critica' : 'janela_24h'
      } else {
        motivo = 'followup_seq2'
      }

      const seqLabel = `seq ${seqAtual + 1}/${maxSeq}${isValor ? ' 💰' : ''}`
      onLog(`ℹ [Follow-up] Gerando para ${conv.contato_nome || conv.contato_numero} — ${seqLabel}`)

      // Busca últimas 20 mensagens
      const { data: msgs } = await supabase
        .from('ci_mensagens')
        .select('de, tipo, conteudo, transcricao, enviado_at')
        .eq('conversa_id', conv.id)
        .order('enviado_at', { ascending: false })
        .limit(20)

      const mensagens = (msgs ?? []).reverse()
      const texto = await gerarMensagemFollowUp(conv, mensagens, template)
      if (!texto) continue

      await salvarFollowUp(conv.id, texto, motivo)
      gerados++
      onLog(`✓ [Follow-up] Sugestão gerada para ${conv.contato_nome || conv.contato_numero} (${seqLabel}, motivo: ${motivo})`)
    } catch { /* silencioso */ }
  }

  onLog(`✓ [Follow-up] ${gerados} sugestões geradas`)
  return { gerados, ignorados: conversas.length - gerados }
}
