import { supabase } from './supabase'

const BASE_URL = import.meta.env.VITE_DATACRAZY_BASE_URL
const API_KEY  = import.meta.env.VITE_DATACRAZY_API_KEY
const delay = (ms) => new Promise(r => setTimeout(r, ms))
const TAKE = 100

// Modos: teste (2 pág), recentes (20 pág ~ leads recentes), completo (tudo)
const LIMITE_PAGINAS = { teste: 2, recentes: 20, completo: null }

async function fetchLeads(skip, take = TAKE) {
  const res = await fetch(`${BASE_URL}/api/v1/leads?take=${take}&skip=${skip}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  if (!res.ok) throw new Error(`DataCrazy leads ${res.status}`)
  const json = await res.json()
  return json?.leads ?? json?.data ?? (Array.isArray(json) ? json : [])
}

function final8(phone) {
  const d = String(phone ?? '').replace(/\D/g, '')
  return d.length >= 8 ? d.slice(-8) : null
}

// Sincroniza as tags de um lead. Retorna quantas tags ativas gravou.
async function sincronizarLead(lead) {
  const phone = lead.phone || lead.rawPhone || ''
  const f8 = final8(phone)
  if (!f8) return 0
  const tags = Array.isArray(lead.tags) ? lead.tags.filter(t => t?.id) : []
  const agora = new Date().toISOString()
  const idsAtuais = tags.map(t => String(t.id))

  for (const t of tags) {
    // NÃO envia primeira_vez_em: no insert usa DEFAULT now(); no update preserva o valor antigo
    await supabase.from('ci_tags').upsert({
      contato_final8: f8,
      contato_numero: phone,
      lead_dc_id: String(lead.id ?? ''),
      tag_id: String(t.id),
      tag_nome: t.name ?? null,
      tag_cor: t.color ?? null,
      ultima_vez_em: agora,
      ativa: true,
    }, { onConflict: 'contato_final8,tag_id' })
  }

  // Desativa tags que esse lead tinha e não tem mais (re-tag/troca).
  // Só quando o lead tem ≥1 tag (evita varrer leads sem tag à toa).
  if (idsAtuais.length > 0) {
    await supabase.from('ci_tags')
      .update({ ativa: false })
      .eq('contato_final8', f8).eq('ativa', true)
      .not('tag_id', 'in', `(${idsAtuais.join(',')})`)
  }

  return tags.length
}

export async function syncTagsModo(modo = 'recentes', onLog = () => {}, onCancel = null, onProgress = null) {
  const limite = LIMITE_PAGINAS[modo] ?? 20
  onLog(`ℹ Sync de tags — modo ${modo.toUpperCase()}${limite ? ` (${limite} páginas)` : ' (tudo)'}`)

  let pagina = 1, skip = 0, leadsProcessados = 0, tagsGravadas = 0, comTags = 0, erros = 0

  while (true) {
    if (onCancel?.()) { onLog('⛔ Interrompido.'); break }
    let leads
    try { leads = await fetchLeads(skip) }
    catch (err) { onLog(`✗ Erro pág ${pagina}: ${err.message}`); erros++; break }

    if (!leads.length) { onLog('ℹ Fim dos leads.'); break }

    const naPagina = leads.filter(l => Array.isArray(l.tags) && l.tags.length > 0).length
    onLog(`ℹ Página ${pagina}: ${leads.length} leads → ${naPagina} com tags`)

    for (const lead of leads) {
      if (onCancel?.()) break
      try {
        const n = await sincronizarLead(lead)
        if (n > 0) { comTags++; tagsGravadas += n }
      } catch (err) { erros++ }
      leadsProcessados++
    }

    onProgress?.({ pagina, leadsProcessados, comTags, tagsGravadas, erros })

    if (leads.length < TAKE) { onLog('ℹ Última página.'); break }
    if (limite && pagina >= limite) { onLog(`ℹ Limite de ${limite} páginas atingido.`); break }
    skip += TAKE; pagina++
    await delay(1000) // rate limit DataCrazy
  }

  onLog(`✓ Tags sincronizadas: ${comTags} leads com tags | ${tagsGravadas} tags | ${erros} erros`)
  return { leadsProcessados, comTags, tagsGravadas, erros }
}
