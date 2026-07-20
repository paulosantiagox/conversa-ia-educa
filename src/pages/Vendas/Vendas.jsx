import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, ShoppingCart, TrendingUp, Link2, Copy, Eye, RefreshCw, CalendarDays, Receipt } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Topbar } from '../../components/layout/Topbar'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'

const NOME_CODIGO = { vtv: 'Tatiane', vjc: 'Júlia', vkm: 'Ketlen', outros: 'Outros' }
const COR_CODIGO = {
  vtv: 'text-blue-600 dark:text-blue-400',
  vjc: 'text-purple-600 dark:text-purple-400',
  vkm: 'text-green-600 dark:text-green-400',
  outros: 'text-slate-500 dark:text-slate-400',
}
const LS_KEY = 'conversia_vendas_filtro'

function brl(v) {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function brlFull(v) {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function compact(v) {
  const n = Number(v ?? 0)
  if (n >= 1000) return (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k'
  return String(Math.round(n))
}
function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function fmtDiaCurto(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Calcula [inicio, fim) em ISO a partir do preset/datas custom
function calcPeriodo({ preset, dInicio, dFim }) {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate()
  const iso = (dt) => dt.toISOString()
  if (preset === 'mes_atual')  return { inicio: iso(new Date(y, m, 1)),      fim: iso(new Date(y, m + 1, 1)), label: 'Este mês' }
  if (preset === 'mes_passado')return { inicio: iso(new Date(y, m - 1, 1)),  fim: iso(new Date(y, m, 1)),     label: 'Mês passado' }
  if (preset === '7d')         return { inicio: iso(new Date(y, m, d - 6)),  fim: iso(new Date(y, m, d + 1)), label: 'Últimos 7 dias' }
  if (preset === '30d')        return { inicio: iso(new Date(y, m, d - 29)), fim: iso(new Date(y, m, d + 1)), label: 'Últimos 30 dias' }
  if (preset === 'ano')        return { inicio: iso(new Date(y, 0, 1)),      fim: iso(new Date(y + 1, 0, 1)), label: 'Este ano' }
  // custom
  const ini = new Date(dInicio + 'T00:00:00')
  const fimD = new Date(dFim + 'T00:00:00'); fimD.setDate(fimD.getDate() + 1)
  return { inicio: iso(ini), fim: iso(fimD), label: `${fmtDiaCurto(dInicio)} a ${fmtDiaCurto(dFim)}` }
}

function carregarFiltroSalvo() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY))
    if (s?.preset) return s
  } catch { /* ignore */ }
  const now = new Date()
  return { preset: 'mes_atual', dInicio: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), dFim: ymd(now) }
}

const PRESETS = [
  { key: 'mes_atual', label: 'Este mês' },
  { key: 'mes_passado', label: 'Mês passado' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'ano', label: 'Este ano' },
  { key: 'custom', label: 'Personalizado' },
]

function StatCard({ label, value, sub, icon: Icon, cor }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] p-3 flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={14} className={cor ?? 'text-slate-400'} />}
      </div>
      <p className="text-[22px] font-bold text-slate-800 dark:text-slate-100 leading-none">{value ?? '…'}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export function Vendas() {
  const navigate = useNavigate()
  const toast = useToast()
  const [filtro, setFiltro] = useState(carregarFiltroSalvo)
  const [stats, setStats] = useState(null)
  const [porConsultora, setPorConsultora] = useState([])
  const [porDia, setPorDia] = useState([])
  const [vendas, setVendas] = useState([])
  const [tagsMap, setTagsMap] = useState({})
  const [codigo, setCodigo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [atualizadoAt, setAtualizadoAt] = useState(null)

  const periodo = useMemo(() => calcPeriodo(filtro), [filtro])

  // Persiste o filtro (não perde a pesquisa ao atualizar)
  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(filtro)) }, [filtro])

  const carregar = useCallback(async () => {
    const { inicio, fim } = periodo
    const params = { p_inicio: inicio, p_fim: fim }
    let listaQ = supabase
      .from('ci_vendas')
      .select('venda_id, data_venda, valor_venda, cod_consultora, nome_curso, metodo_pagamento, plataforma, whatsapp_comprador, whatsapp_associado, whatsapp_final8, casada, match_por, conversa_id, conversa_contato_nome')
      .gte('data_venda', inicio).lt('data_venda', fim)
      .order('data_venda', { ascending: false }).limit(500)
    if (codigo) listaQ = listaQ.eq('cod_consultora', codigo)

    const [{ data: s }, { data: pc }, { data: pd }, { data: lista }] = await Promise.all([
      supabase.rpc('get_vendas_stats', params),
      supabase.rpc('get_vendas_por_consultora', params),
      supabase.rpc('get_vendas_por_dia', params),
      listaQ,
    ])
    if (s?.[0]) setStats(s[0])
    setPorConsultora(pc ?? [])
    setPorDia((pd ?? []).map(x => ({ label: fmtDiaCurto(x.dia), vendas: Number(x.vendas), faturamento: Number(x.faturamento) })))
    setVendas(lista ?? [])
    // Tags ativas dos leads dessas vendas (casa por final8)
    const finais = [...new Set((lista ?? []).map(v => v.whatsapp_final8).filter(Boolean))]
    const map = {}
    if (finais.length) {
      const { data: tgs } = await supabase.from('ci_tags').select('contato_final8, tag_nome, tag_cor').eq('ativa', true).in('contato_final8', finais)
      for (const t of tgs ?? []) (map[t.contato_final8] ??= []).push(t)
    }
    setTagsMap(map)
    setAtualizadoAt(new Date())
  }, [periodo, codigo])

  useEffect(() => { setLoading(true); carregar().finally(() => setLoading(false)) }, [carregar])

  // Auto-refresh 30s + Realtime (best-effort), sempre com o filtro atual
  const carregarRef = useRef(carregar)
  useEffect(() => { carregarRef.current = carregar })
  useEffect(() => {
    const t = setInterval(() => carregarRef.current(), 30_000)
    const canal = supabase.channel('vendas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eja_vendas' }, () => carregarRef.current())
      .subscribe()
    return () => { clearInterval(t); supabase.removeChannel(canal) }
  }, [])

  function copiar(txt) { navigator.clipboard.writeText(txt); toast.success('Copiado!') }
  function setPreset(key) {
    setFiltro(f => key === 'custom' ? { ...f, preset: 'custom' } : { ...f, preset: key })
  }

  const pctCasadas = stats?.total ? Math.round((stats.casadas / stats.total) * 100) : 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Vendas" />
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900">

        {/* Filtro de período */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] px-3 py-2.5 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mr-1">
            <CalendarDays size={13} /> Período
          </span>
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => setPreset(p.key)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                filtro.preset === p.key
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500'
              }`}>
              {p.label}
            </button>
          ))}
          {filtro.preset === 'custom' && (
            <div className="flex items-center gap-1.5 ml-1">
              <input type="date" value={filtro.dInicio}
                onChange={e => setFiltro(f => ({ ...f, dInicio: e.target.value }))}
                className="px-2 py-1 text-[11px] border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700" />
              <span className="text-[11px] text-slate-400">até</span>
              <input type="date" value={filtro.dFim}
                onChange={e => setFiltro(f => ({ ...f, dFim: e.target.value }))}
                className="px-2 py-1 text-[11px] border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700" />
            </div>
          )}
          <span className="ml-auto text-[11px] text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {periodo.label}{atualizadoAt ? ` · ${atualizadoAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
          </span>
        </div>

        {/* Stats do período */}
        <div className="flex gap-2">
          <StatCard label="Faturamento" value={stats ? brl(stats.faturamento) : '…'} sub={`no período · ${periodo.label}`} icon={DollarSign} cor="text-green-500" />
          <StatCard label="Vendas" value={stats?.total ?? '…'} sub="pagas no período" icon={ShoppingCart} cor="text-blue-500" />
          <StatCard label="Ticket médio" value={stats ? brlFull(stats.ticket_medio) : '…'} sub="por venda" icon={Receipt} cor="text-orange-500" />
          <StatCard label="Casadas com conversa" value={stats ? `${pctCasadas}%` : '…'} sub={`${stats?.casadas ?? '…'} de ${stats?.total ?? '…'} vinculadas`} icon={Link2} cor="text-purple-500" />
        </div>

        {/* Breakdown por consultora (do período) */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-0.5">Por consultora · clique para filtrar</p>
          <div className="flex gap-2">
            <button onClick={() => setCodigo(null)}
              className={`flex-1 min-w-0 border rounded-[6px] px-3 py-2.5 text-left transition-all ${
                codigo === null
                  ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 ring-2 ring-offset-1 ring-green-400'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50'
              }`}>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-700 text-slate-500">TODAS</span>
              <p className="text-[18px] font-bold leading-none mt-1 text-slate-800 dark:text-slate-100">{stats ? brl(stats.faturamento) : '…'}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{stats?.total ?? '…'} vendas</p>
            </button>
            {['vtv', 'vjc', 'vkm', 'outros'].map(cod => {
              const item = porConsultora.find(p => p.cod_consultora === cod)
              const ativo = codigo === cod
              return (
                <button key={cod} onClick={() => setCodigo(ativo ? null : cod)}
                  className={`flex-1 min-w-0 border rounded-[6px] px-3 py-2.5 text-left transition-all ${
                    ativo ? 'border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-700/50 ring-2 ring-offset-1 ring-slate-300'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50'
                  }`}>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-700 ${COR_CODIGO[cod]}`}>{cod.toUpperCase()}</span>
                  <p className={`text-[18px] font-bold leading-none mt-1 ${COR_CODIGO[cod]}`}>{item ? brl(item.faturamento) : 'R$ 0'}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{NOME_CODIGO[cod]} · {item?.vendas ?? 0} vendas</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Gráfico por dia — com valores em cada barra */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] p-3">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays size={13} className="text-blue-500" />
            <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Faturamento por dia · {periodo.label}</p>
          </div>
          {porDia.length === 0 ? (
            <p className="text-center text-[12px] text-slate-400 py-12">Sem vendas no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porDia} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => brl(v)} width={54} />
                <Tooltip
                  formatter={(v, n) => n === 'faturamento' ? [brlFull(v), 'Faturamento'] : [v, 'Vendas']}
                  labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11, borderRadius: 6 }} cursor={{ fill: 'rgba(148,163,184,0.1)' }}
                />
                <Bar dataKey="faturamento" fill="#22c55e" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="faturamento" position="top" formatter={compact}
                    style={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tabela */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={13} className="text-green-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                {loading ? '…' : `${vendas.length} vendas`}{codigo && <span className="text-slate-400 font-normal"> · {NOME_CODIGO[codigo]}</span>}
              </p>
              <span className="text-[10px] text-slate-400">{periodo.label}</span>
            </div>
            <button onClick={() => { setLoading(true); carregar().finally(() => setLoading(false)) }} disabled={loading}
              className="text-slate-400 hover:text-blue-500 disabled:opacity-50">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><RefreshCw size={18} className="animate-spin text-slate-400" /></div>
          ) : vendas.length === 0 ? (
            <p className="text-center text-[12px] text-slate-400 py-12">Nenhuma venda no período</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Data</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Comprador</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">Valor</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Consultora</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Produto</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Pgto</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Tags</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Conversa</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map(v => (
                    <tr key={v.venda_id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-3 py-2.5 text-[11px] text-slate-500 whitespace-nowrap">{fmtData(v.data_venda)}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => copiar(v.whatsapp_comprador)} className="flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-300 hover:text-blue-500" title="Número que pagou">
                          <Copy size={9} /> {v.whatsapp_comprador || '—'}
                        </button>
                        {v.whatsapp_associado && v.whatsapp_associado !== v.whatsapp_comprador && (
                          <button onClick={() => copiar(v.whatsapp_associado)} className="flex items-center gap-1 text-[9px] font-mono text-purple-500 hover:text-purple-700 mt-0.5" title="Número associado — onde o lead conversou">
                            <Copy size={8} /> assoc: {v.whatsapp_associado}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[12px] font-bold text-green-600 whitespace-nowrap">{brlFull(v.valor_venda)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 ${COR_CODIGO[v.cod_consultora]}`}>{v.cod_consultora?.toUpperCase()}</span>
                        <span className="text-[10px] text-slate-400 ml-1">{NOME_CODIGO[v.cod_consultora]}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[10px] text-slate-500 max-w-[180px] truncate" title={v.nome_curso}>{v.nome_curso ?? '—'}</td>
                      <td className="px-3 py-2.5 text-[10px] text-slate-500 whitespace-nowrap">{v.metodo_pagamento ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1 max-w-[130px]">
                          {(tagsMap[v.whatsapp_final8] ?? []).map((t, i) => (
                            <span key={i} title={t.tag_nome}
                              className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full whitespace-nowrap"
                              style={{ backgroundColor: (t.tag_cor || '#94a3b8') + '22', color: t.tag_cor || '#64748b' }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.tag_cor || '#94a3b8' }} />
                              {(t.tag_nome || '').replace(/ - EED$/,'').replace(/^[🟢🔵⚪️\s]+/,'').slice(0, 12)}
                            </span>
                          ))}
                          {!(tagsMap[v.whatsapp_final8] ?? []).length && <span className="text-[10px] text-slate-300">—</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {v.casada ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => navigate(`/inbox?id=${v.conversa_id}`)}
                              className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded text-[10px] text-green-700 dark:text-green-400 hover:bg-green-100 transition-colors whitespace-nowrap max-w-[150px]">
                              <Eye size={10} className="shrink-0" />
                              <span className="truncate">{v.conversa_contato_nome || 'ver conversa'}</span>
                            </button>
                            {v.match_por === 'associado' && (
                              <span title="Casada pelo número associado — comprou com um número, conversou por outro"
                                className="text-[8px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-1 py-0.5 rounded">↔ assoc</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 dark:text-slate-600">sem conversa</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
