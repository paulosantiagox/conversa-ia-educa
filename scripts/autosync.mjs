#!/usr/bin/env node
/**
 * Auto-sync server-side (roda no VPS via cron, sem depender de aba aberta).
 * Faz o ciclo incremental: Conversas (rápido) → Mensagens (24h) → Tags (recentes) → Whisper.
 *
 * Rodar:  node --env-file=/home/projetos/github-deploys/conversa-ia-educa/.env scripts/autosync.mjs
 * Cron (a cada 15 min):
 *   *\/15 * * * * cd /caminho/app && node --env-file=.env scripts/autosync.mjs >> /var/log/conversia-autosync.log 2>&1
 *
 * Usa as MESMAS variáveis do .env do site (VITE_*).
 */
import { createClient } from '@supabase/supabase-js'
import { execFile } from 'node:child_process'
import { writeFile, readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
const execFileP = promisify(execFile)

const E = process.env
const SUPA_URL = E.VITE_SUPABASE_URL
const SUPA_KEY = E.VITE_SUPABASE_SERVICE_ROLE_KEY || E.VITE_SUPABASE_ANON_KEY
const DC_BASE  = E.VITE_DATACRAZY_BASE_URL
const DC_KEY   = E.VITE_DATACRAZY_API_KEY

if (!SUPA_URL || !SUPA_KEY || !DC_BASE || !DC_KEY) {
  console.error('[autosync] ENV faltando (VITE_SUPABASE_URL/ANON_KEY, VITE_DATACRAZY_*)'); process.exit(1)
}

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } })
const delay = (ms) => new Promise(r => setTimeout(r, ms))
const now = () => new Date().toISOString()
const log = (...a) => console.log(new Date().toLocaleTimeString('pt-BR'), ...a)
const final8 = (p) => { const d = String(p ?? '').replace(/\D/g, ''); return d.length >= 8 ? d.slice(-8) : null }

async function dc(path) {
  const res = await fetch(`${DC_BASE}${path}`, { headers: { Authorization: `Bearer ${DC_KEY}` } })
  if (!res.ok) throw new Error(`DataCrazy ${res.status}: ${path}`)
  return res.json()
}
const arr = (r, ...keys) => Array.isArray(r) ? r : keys.map(k => r?.[k]).find(Array.isArray) ?? []

// ─── Conversas ────────────────────────────────────────────────────────────────
const isEJA = (c) => typeof c?.instance?.name === 'string' && c.instance.name.startsWith('EEB')
function mapConversa(conv) {
  const attendant = Array.isArray(conv.attendants) && conv.attendants.length ? conv.attendants[0].name : 'Sem atendente'
  return {
    datacrazy_id: String(conv.id),
    contato_nome: conv.contact?.name ?? '',
    contato_numero: conv.contact?.phoneNumber ?? '',
    consultora: attendant,
    ultima_mensagem_at: conv.lastMessageDate ?? null,
    ultima_mensagem_texto: conv.lastMessage?.body ?? '',
    status: conv.finished ? 'fechada' : 'aberta',
    updated_at_dc: conv.updatedAt ?? conv.lastMessageDate ?? null,
    instancia: conv.instance?.name ?? null,
    instancia_numero: conv.instance?.phoneNumber ?? conv.instance?.phone ?? conv.instance?.number ?? null,
  }
}
async function upsertConversa(m) {
  const { contato_numero, datacrazy_id, updated_at_dc, ...resto } = m
  if (!datacrazy_id || !contato_numero) return 'ignorada'
  const { data: ex } = await supabase.from('ci_conversas').select('id, updated_at').eq('datacrazy_id', datacrazy_id).maybeSingle()
  const dcU = updated_at_dc ? new Date(updated_at_dc) : null
  const dbU = ex?.updated_at ? new Date(ex.updated_at) : null
  if (ex && dcU && dbU && dcU <= dbU) return 'sem_mudanca'
  const { error } = await supabase.from('ci_conversas').upsert(
    { datacrazy_id, contato_numero, ...resto, updated_at: now() }, { onConflict: 'datacrazy_id' })
  if (error) throw error
  return ex ? 'atualizada' : 'inserida'
}
async function syncConversasRapido() {
  const TAKE = 50; let skip = 0, pagina = 1, mud = 0, semMud = 0
  while (true) {
    const items = arr(await dc(`/api/v1/conversations?take=${TAKE}&skip=${skip}`), 'data', 'conversations')
    if (!items.length) break
    const eja = items.filter(isEJA)
    let mudPag = 0
    for (const c of eja) {
      try { const a = await upsertConversa(mapConversa(c)); if (a === 'inserida' || a === 'atualizada') { mud++; mudPag++ } } catch {}
    }
    if (items.length < TAKE) break
    if (mudPag === 0) { if (++semMud >= 2) break } else semMud = 0
    skip += TAKE; pagina++; await delay(1000)
  }
  log(`  conversas: ${mud} novas/atualizadas (${pagina} pág)`)
  return mud
}

// ─── Mensagens (organizarDadosConversa portado) ────────────────────────────────
const VALOR_PATTERNS = ['12x de R$', 'à vista no PIX', 'Qual dessas duas opções você prefere']
const LINK_RE = /https?:\/\/[^\s]*\/pay\/[^\s]+/i
const UTM_RE = /utm_source=cod-([a-zA-Z0-9]+)/i
async function organizarDados(conversaId, mensagens) {
  if (!mensagens?.length) return
  const reais = mensagens.filter(m => !m.isInternal && !m.deleted)
  const norm = reais.map(m => ({
    isLead: m.received === true, isConsultora: m.received === false,
    ts: m.createdAt ?? null,
    hasAudio: Array.isArray(m.attachments) && m.attachments.some(a => a.type?.startsWith('audio/') || a.mimeType?.startsWith('audio/')),
  }))
  const primeiraMsgAuto = norm.length > 0 && norm[0].isConsultora && norm[0].hasAudio
  const tempos = []
  for (let i = 0; i < norm.length; i++) {
    if (!norm[i].isLead || !norm[i].ts) continue
    for (let j = i + 1; j < norm.length; j++) {
      if (norm[j].isConsultora && norm[j].ts) { const d = Math.round((new Date(norm[j].ts) - new Date(norm[i].ts)) / 60000); if (d > 0 && d < 1440) tempos.push(d); break }
    }
  }
  const tempoResp = tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : null
  const pLead = norm.find(m => m.isLead && m.ts)
  let tempoPrim = null
  if (pLead) { const r = norm.find(m => m.isConsultora && m.ts && new Date(m.ts) > new Date(pLead.ts)); if (r) { const d = Math.round((new Date(r.ts) - new Date(pLead.ts)) / 60000); if (d >= 0 && d < 1440) tempoPrim = d } }
  const ultLead = [...norm].reverse().find(m => m.isLead && m.ts)
  const ultLeadAt = ultLead?.ts ?? null
  let janela = 'sem_interacao'
  if (ultLeadAt) { const h = (Date.now() - new Date(ultLeadAt).getTime()) / 3600000; janela = h < 20 ? 'aberta' : h < 24 ? 'critica' : 'expirada' }
  let recVal = false, recValAt = null, recLink = false, linkPag = null, linkUtm = null, linkAt = null
  for (const m of reais) {
    if (m.received !== false) continue
    const body = m.body ?? '', ts = m.createdAt ?? null
    if (!recVal && VALOR_PATTERNS.some(p => body.includes(p))) { recVal = true; recValAt = ts }
    if (!linkPag) { const mm = body.match(LINK_RE); if (mm) { linkPag = mm[0].trim(); recLink = true; linkAt = ts; linkUtm = linkPag.match(UTM_RE)?.[1]?.toLowerCase() ?? null } }
  }
  const upd = {
    total_mensagens: reais.length, primeira_msg_automatica: primeiraMsgAuto, janela_24h_status: janela,
    ultima_mensagem_lead_at: ultLeadAt, recebeu_valor: recVal, recebeu_link: recLink,
    mensagens_sync_at: now(), updated_at: now(),
  }
  if (tempoResp !== null) upd.tempo_resposta_medio = tempoResp
  if (tempoPrim !== null) upd.tempo_primeira_resposta = tempoPrim
  if (recValAt) upd.recebeu_valor_at = recValAt
  if (linkPag) upd.link_pagamento = linkPag
  if (linkUtm) upd.link_utm_code = linkUtm
  if (linkAt) upd.link_enviado_at = linkAt
  await supabase.from('ci_conversas').update(upd).eq('id', conversaId)
}
async function syncMensagensConversa(conv) {
  const msgs = arr(await dc(`/api/v1/conversations/${conv.datacrazy_id}/messages`), 'data', 'messages')
  for (const m of msgs) {
    if (m.isInternal === true || m.deleted === true) continue
    const atts = Array.isArray(m.attachments) ? m.attachments : []
    const audio = atts.find(a => a.type === 'AUDIO' || a.mimeType?.startsWith('audio/'))
    const img = atts.some(a => a.type === 'IMAGE' || a.mimeType?.startsWith('image/'))
    await supabase.from('ci_mensagens').upsert({
      conversa_id: conv.id, datacrazy_id: String(m.id),
      tipo: audio ? 'audio' : img ? 'imagem' : 'texto', de: m.received ? 'lead' : 'consultora',
      conteudo: m.body ?? '', enviado_at: m.createdAt ?? null, audio_url: audio?.url ?? null,
      is_auto: !!(audio && audio.url?.includes('/flow-attachments/')),
      attendant_nome: (!m.received && m.attendant?.name) ? m.attendant.name : null, created_at: now(),
    }, { onConflict: 'datacrazy_id', ignoreDuplicates: true })
  }
  if (msgs.length > 0) await organizarDados(conv.id, msgs)
  else await supabase.from('ci_conversas').update({ total_mensagens: 0, mensagens_sync_at: now(), updated_at: now() }).eq('id', conv.id)
}
async function syncMensagens24h() {
  const limite = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  let total = 0
  for (let i = 0; i < 20; i++) { // no máx 20 lotes por ciclo (proteção)
    const { data: lote } = await supabase.from('ci_conversas')
      .select('id, datacrazy_id').not('datacrazy_id', 'is', null)
      .eq('precisa_sync_mensagens', true).gte('ultima_mensagem_at', limite)
      .order('ultima_mensagem_at', { ascending: false }).limit(200)
    if (!lote?.length) break
    for (const c of lote) { try { await syncMensagensConversa(c); total++ } catch {} await delay(700) }
    if (lote.length < 200) break
  }
  log(`  mensagens 24h: ${total} conversas sincronizadas`)
  return total
}

// ─── Tags ───────────────────────────────────────────────────────────────────
async function syncTagsRecentes() {
  const TAKE = 100, LIM = 20; let skip = 0, pagina = 1, comTags = 0
  while (pagina <= LIM) {
    const leads = arr(await dc(`/api/v1/leads?take=${TAKE}&skip=${skip}`), 'leads', 'data')
    if (!leads.length) break
    for (const lead of leads) {
      const f8 = final8(lead.phone || lead.rawPhone); if (!f8) continue
      const tags = Array.isArray(lead.tags) ? lead.tags.filter(t => t?.id) : []
      const ids = tags.map(t => String(t.id))
      for (const t of tags) {
        await supabase.from('ci_tags').upsert({
          contato_final8: f8, contato_numero: lead.phone || lead.rawPhone, lead_dc_id: String(lead.id ?? ''),
          tag_id: String(t.id), tag_nome: t.name ?? null, tag_cor: t.color ?? null, ultima_vez_em: now(), ativa: true,
        }, { onConflict: 'contato_final8,tag_id' })
      }
      if (ids.length) { comTags++; await supabase.from('ci_tags').update({ ativa: false }).eq('contato_final8', f8).eq('ativa', true).not('tag_id', 'in', `(${ids.join(',')})`) }
    }
    if (leads.length < TAKE) break
    skip += TAKE; pagina++; await delay(1000)
  }
  log(`  tags: ${comTags} leads com tags atualizados`)
  return comTags
}

// ─── Whisper LOCAL (self-hosted na VPS via whisper-ctranslate2) ────────────────
// Ligar com WHISPER_LOCAL=true no .env do servidor (+ WHISPER_MODEL, ex: small/medium).
// Precisa do binário `whisper-ctranslate2` instalado (pip install whisper-ctranslate2).
// Grátis (não usa a API paga da OpenAI). Duração fica 0 (custo local = 0).
const WHISPER_LOCAL = E.WHISPER_LOCAL === 'true'
const WHISPER_MODEL = E.WHISPER_MODEL || 'small'
const WHISPER_BIN   = E.WHISPER_BIN || 'whisper-ctranslate2'
async function transcreverLocal(audioUrl) {
  const res = await fetch(audioUrl)
  if (!res.ok) { const e = new Error(`download ${res.status}`); e.status = res.status; throw e }
  const buf = Buffer.from(await res.arrayBuffer())
  const dir = await mkdtemp(join(tmpdir(), 'wh-'))
  const inFile = join(dir, 'audio.ogg')
  await writeFile(inFile, buf)
  try {
    await execFileP(WHISPER_BIN, [inFile, '--model', WHISPER_MODEL, '--language', 'pt',
      '--output_dir', dir, '--output_format', 'txt', '--task', 'transcribe'], { timeout: 300000 })
    const txt = await readFile(join(dir, 'audio.txt'), 'utf8')
    return { text: txt.trim(), duracao_segundos: 0 }
  } finally { await rm(dir, { recursive: true, force: true }) }
}

// ─── Whisper (local se WHISPER_LOCAL=true, senão Edge Function paga da OpenAI) ──
async function transcreverPendentes() {
  const { data: pend } = await supabase.from('ci_mensagens')
    .select('id, audio_url, datacrazy_id, conversa_id')
    .eq('tipo', 'audio').is('transcricao', null).not('audio_url', 'is', null).eq('is_auto', false)
    .limit(200)
  if (!pend?.length) { log('  whisper: 0 pendentes'); return { ok: 0, cache: 0 } }
  let ok = 0, cache = 0
  for (const a of pend) {
    // cache por audio_url
    const { data: c } = await supabase.from('ci_mensagens').select('transcricao').eq('audio_url', a.audio_url).not('transcricao', 'is', null).limit(1).maybeSingle()
    if (c?.transcricao) { await supabase.from('ci_mensagens').update({ transcricao: c.transcricao }).eq('id', a.id); cache++; continue }
    try {
      if (WHISPER_LOCAL) {
        // Whisper self-hosted na VPS — grátis
        const r = await transcreverLocal(a.audio_url)
        await supabase.from('ci_mensagens').update({ transcricao: r.text }).eq('id', a.id)
        await supabase.from('ci_uso_api').insert({ servico: 'whisper-local', operacao: 'transcricao_audio', modelo: WHISPER_MODEL, custo_usd: 0, duracao_segundos: 0, conversa_id: a.conversa_id ?? null })
        ok++
      } else {
        // Whisper via OpenAI (pago) — Edge Function
        const res = await fetch(`${SUPA_URL}/functions/v1/transcrever-audio`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPA_KEY}` },
          body: JSON.stringify({ audio_url: a.audio_url, datacrazy_id: a.datacrazy_id }),
        })
        const d = await res.json()
        if (d?.ok) {
          await supabase.from('ci_mensagens').update({ transcricao: d.text }).eq('id', a.id)
          await supabase.from('ci_uso_api').insert({ servico: 'openai', operacao: 'transcricao_audio', modelo: 'whisper-1', custo_usd: (d.duracao_segundos / 60) * 0.006, duracao_segundos: d.duracao_segundos ?? 0, conversa_id: a.conversa_id ?? null })
          ok++
        } else if (d?.tipo === 'inacessivel') {
          await supabase.from('ci_mensagens').update({ transcricao: '[inacessível]' }).eq('id', a.id)
        } else if (d?.tipo === 'quota') { log('  whisper: cota OpenAI esgotada — pausando'); break }
      }
    } catch (e) {
      if (e?.status === 404 || e?.status === 403) await supabase.from('ci_mensagens').update({ transcricao: '[inacessível]' }).eq('id', a.id)
    }
    await delay(WHISPER_LOCAL ? 50 : 300)
  }
  log(`  whisper: ${ok} transcritos, ${cache} reaproveitados (cache)`)
  return { ok, cache }
}

// ─── Ciclo ────────────────────────────────────────────────────────────────────
;(async () => {
  const t0 = Date.now()
  log('▶ Auto-sync server-side iniciado')
  const r = { conversas: 0, mensagens: 0, tags: 0, whisper: 0 }
  const erros = []
  try { r.conversas = await syncConversasRapido() } catch (e) { erros.push('conversas: ' + e.message); log('  ✗ conversas:', e.message) }
  try { r.mensagens = await syncMensagens24h() }    catch (e) { erros.push('mensagens: ' + e.message); log('  ✗ mensagens:', e.message) }
  try { r.tags = await syncTagsRecentes() }         catch (e) { erros.push('tags: ' + e.message); log('  ✗ tags:', e.message) }
  try { const w = await transcreverPendentes(); r.whisper = w?.ok ?? 0 } catch (e) { erros.push('whisper: ' + e.message); log('  ✗ whisper:', e.message) }
  const dur = Math.round((Date.now() - t0) / 1000)
  log(`✓ Ciclo concluído em ${dur}s`)
  // Registra o ciclo para o mini-log do front detectar funcionamento/erros
  try {
    await supabase.from('ci_autosync_logs').insert({
      duracao_seg: dur, status: erros.length ? 'erro' : 'ok',
      conversas: r.conversas, mensagens: r.mensagens, tags: r.tags, whisper: r.whisper,
      erros: erros.length ? erros.join(' | ') : null,
    })
  } catch (e) { log('  ⚠ não gravou log:', e.message) }
  process.exit(0)
})()
