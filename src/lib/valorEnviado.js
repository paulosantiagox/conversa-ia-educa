/**
 * valorEnviado.js
 * Aplica tag "🔵 VALOR ENVIADO - EED" no DataCrazy + envia webhook N8N
 * Registra os timestamps no Supabase para evitar duplicatas
 */
import { supabase } from './supabase'

const BASE_URL = import.meta.env.VITE_DATACRAZY_BASE_URL
const API_KEY  = import.meta.env.VITE_DATACRAZY_API_KEY
const WEBHOOK_URL = 'https://n8n.centrodaautomacao.net/webhook/educa-gerenciamento'
const TAG_ID   = '75695eaf-708e-422b-ad76-53a729ef4790' // "VALOR ENVIADO - EED"

const NOME_CODIGO = { vtv: 'Tatiane', vjc: 'Julia', vkm: 'Ketlen' }

const delay = (ms) => new Promise(r => setTimeout(r, ms))

// ─── Detecção de consultora ───────────────────────────────────────────────────
// Prioridade: 1) link_utm_code  2) instância  3) nome da consultora
// Retorna { cod, fonte } para rastreabilidade (fonte: 'utm' | 'instancia' | 'consultora' | 'desconhecido')
export function detectarCodConsultora(lead) {
  const utm = lead.link_utm_code?.toLowerCase()
  if (utm && ['vtv', 'vjc', 'vkm'].includes(utm))
    return { cod: utm, fonte: 'utm' }

  const inst = (lead.instancia || '').toLowerCase()
  if (inst.includes('taty') || inst.includes('tatiane')) return { cod: 'vtv', fonte: 'instancia' }
  if (inst.includes('julia') || inst.includes('júlia'))  return { cod: 'vjc', fonte: 'instancia' }
  if (inst.includes('ketlen'))                            return { cod: 'vkm', fonte: 'instancia' }

  const cons = (lead.consultora || '').toLowerCase()
  if (cons.includes('tatiane'))                          return { cod: 'vtv', fonte: 'consultora' }
  if (cons.includes('júlia') || cons.includes('julia')) return { cod: 'vjc', fonte: 'consultora' }
  if (cons.includes('ketlen'))                           return { cod: 'vkm', fonte: 'consultora' }

  return { cod: 'outros', fonte: 'desconhecido' }
}

// ─── Busca lead no DataCrazy por telefone ────────────────────────────────────
async function buscarLeadDC(telefone) {
  const res = await fetch(
    `${BASE_URL}/api/v1/leads?search=${telefone}&take=1`,
    { headers: { Authorization: `Bearer ${API_KEY}` } }
  )
  if (!res.ok) throw new Error(`DataCrazy busca ${res.status}`)
  const json = await res.json()
  const leads = json?.leads ?? json?.data ?? (Array.isArray(json) ? json : [])
  return leads[0] ?? null
}

// ─── Aplica tag no lead ───────────────────────────────────────────────────────
async function aplicarTag(leadId) {
  const res = await fetch(`${BASE_URL}/api/v1/leads/${leadId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tags: [{ id: TAG_ID }] }),
  })
  if (!res.ok) throw new Error(`DataCrazy tag ${res.status}`)
  return true
}

// ─── Busca últimas mensagens do Supabase quando não vieram no lead ───────────
async function buscarUltimasMsgs(conversaId) {
  const { data } = await supabase.rpc('get_ultimas_msgs_conversa', { p_id: conversaId })
  if (!data?.length) return []
  return [...data].reverse() // RPC retorna DESC, inverte para ASC (mais antiga primeiro)
}

// ─── Extrai valor R$ do texto da mensagem ────────────────────────────────────
// Prioridade: 1) PIX à vista  2) "por apenas"  3) último R$ encontrado
function extrairValorTexto(texto) {
  if (!texto) return ''
  const t = String(texto)

  // 1. Valor à vista no PIX (mais confiável — é o valor cheio)
  const pixM = t.match(/R\$\s*([\d.]+,\d{2})\s*(?:à vista|a vista)?\s*(?:no\s*)?pix/i)
  if (pixM) return normalizeValorBR(pixM[1])

  // 2. Valor depois de "por apenas"
  const apenasM = t.match(/por\s+apenas:?\s*.*?R\$\s*([\d.]+,\d{2})/i)
  if (apenasM) return normalizeValorBR(apenasM[1])

  // 3. Último valor R$ encontrado
  const todos = [...t.matchAll(/R\$\s*([\d.]+,\d{2})/gi)]
  if (todos.length > 0) return normalizeValorBR(todos[todos.length - 1][1])

  return ''
}

// Converte "847,00" ou "1.297,00" → "847" (inteiro em reais)
function normalizeValorBR(v) {
  const limpo = String(v).replace(/\./g, '').replace(',', '.')
  const n = parseFloat(limpo)
  return isNaN(n) ? '' : String(Math.round(n))
}

// Tenta extrair valor de ultimas_msgs (mensagens da consultora)
function extrairValorMensagens(ultimas_msgs) {
  if (!Array.isArray(ultimas_msgs)) return ''
  // Percorre todas as msgs (das mais recentes para as mais antigas já vêm no array)
  for (const m of [...ultimas_msgs].reverse()) {
    if (m.de === 'consultora' || m.de !== 'lead') {
      const v = extrairValorTexto(m.conteudo)
      if (v) return v
    }
  }
  return ''
}

// ─── Envia webhook N8N ────────────────────────────────────────────────────────
async function enviarWebhook(lead, codConsultora) {
  // Formato: "2026-05-28 11:48:23" — data/hora que o valor foi enviado ao lead
  const valorAt = lead.valor_enviado_at
    ? (() => {
        const d = new Date(lead.valor_enviado_at)
        const pad = n => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      })()
    : null

  // Valor: tenta slug do link primeiro, depois extrai do texto das mensagens
  const slugValor = lead.link_slug?.split('-')?.[0] ?? ''
  // Se não tem ultimas_msgs no lead (veio do RPC leve), busca do banco
  const msgs = Array.isArray(lead.ultimas_msgs) && lead.ultimas_msgs.length > 0
    ? lead.ultimas_msgs
    : await buscarUltimasMsgs(lead.id)
  const textoValor = extrairValorMensagens(msgs)
  const valor      = slugValor || textoValor

  // external_id: inclui valor só se encontrado — evita traço na frente
  const externalId = valor
    ? `${valor}-${lead.contato_numero}-${codConsultora}`
    : `${lead.contato_numero}-${codConsultora}`

  const payload = {
    evento: 'VALOR_ENVIADO',
    data_hora: valorAt,
    external_id: externalId,
    lead: {
      nome:     lead.contato_nome     || '',
      telefone: lead.contato_numero   || '',
    },
    instancia: { nome: lead.instancia || '' },
    atendimento: { atendente_nome: lead.consultora || '' },
    produto: {
      url:   lead.link_url   || '',
      valor: valor,
    },
    consultora: {
      codigo: codConsultora,
      nome:   NOME_CODIGO[codConsultora] ?? codConsultora,
    },
    origem: 'Message-1',
  }

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Webhook ${res.status}`)
  return payload
}

// ─── Processa um lead (tag + webhook + salva timestamps) ─────────────────────
export async function processarLead(lead, { onLog = () => {}, pularSeJaFeito = true } = {}) {
  const nome = lead.contato_nome || lead.contato_numero || lead.id
  const deteccao = detectarCodConsultora(lead)
  const codConsultora = lead.cod_consultora ?? deteccao.cod

  // Pula se já foi processado
  if (pularSeJaFeito && lead.tag_dc_aplicada_at && lead.webhook_enviado_at) {
    onLog(`⏭ Já processado: ${nome}`)
    return { status: 'pulado', motivo: 'ja_feito' }
  }

  let tagOk = !!lead.tag_dc_aplicada_at
  let webhookOk = !!lead.webhook_enviado_at

  // 1. Tag DataCrazy (se ainda não aplicada)
  if (!tagOk) {
    try {
      const leadDC = await buscarLeadDC(lead.contato_numero)
      if (!leadDC?.id) {
        onLog(`⚠ ${nome} — não encontrado no DataCrazy`)
      } else {
        await aplicarTag(leadDC.id)
        tagOk = true
        onLog(`🏷 Tag aplicada: ${nome} (${codConsultora.toUpperCase()})`)
      }
    } catch (err) {
      onLog(`✗ Erro ao aplicar tag em ${nome}: ${err.message}`)
    }
  }

  await delay(500)

  // 2. Webhook N8N (se ainda não enviado)
  if (!webhookOk) {
    try {
      await enviarWebhook(lead, codConsultora)
      webhookOk = true
      onLog(`📤 Webhook enviado: ${nome} → ${codConsultora.toUpperCase()}/${NOME_CODIGO[codConsultora] ?? codConsultora}`)
    } catch (err) {
      onLog(`✗ Erro no webhook de ${nome}: ${err.message}`)
    }
  }

  // 3. Salva timestamps no Supabase
  const agora = new Date().toISOString()
  const updates = {}
  if (tagOk     && !lead.tag_dc_aplicada_at)  updates.tag_dc_aplicada_at = agora
  if (webhookOk && !lead.webhook_enviado_at)   updates.webhook_enviado_at = agora

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('ci_conversas')
      .update(updates)
      .eq('id', lead.id)
    if (error) onLog(`⚠ Erro ao salvar status de ${nome}: ${error.message}`)
  }

  return { status: tagOk && webhookOk ? 'ok' : 'parcial', tagOk, webhookOk, codConsultora }
}

// ─── Processa lote de leads ───────────────────────────────────────────────────
export async function processarLote(leads, {
  onLog      = () => {},
  onProgress = () => {},
  onCancel   = null,
  isPaused   = null,   // função que retorna true quando pausado
  delayMs    = 3000,
} = {}) {
  const total = leads.length
  let ok = 0, pulados = 0, erros = 0

  for (let i = 0; i < leads.length; i++) {
    if (onCancel?.()) { onLog('⛔ Interrompido.'); break }

    const lead = leads[i]
    try {
      const res = await processarLead(lead, { onLog })
      if (res.status === 'pulado') pulados++
      else if (res.status === 'ok') ok++
      else erros++
    } catch (err) {
      erros++
      onLog(`✗ Erro em ${lead.contato_nome || lead.contato_numero}: ${err.message}`)
    }

    onProgress({ atual: i + 1, total, ok, pulados, erros, pct: Math.round(((i + 1) / total) * 100) })

    if (i < leads.length - 1) {
      // Aguarda delay, verificando pausa/cancelamento a cada 500ms
      let aguardado = 0
      while (aguardado < delayMs) {
        if (onCancel?.()) break
        // Pausa: fica esperando até ser retomado
        while (isPaused?.() && !onCancel?.()) await delay(300)
        await delay(Math.min(500, delayMs - aguardado))
        aguardado += 500
      }
    }
  }

  onLog(`✓ Concluído: ${ok} processados | ${pulados} já feitos | ${erros} erros`)
  return { ok, pulados, erros }
}
