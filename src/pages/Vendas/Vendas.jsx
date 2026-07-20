import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, ShoppingCart, TrendingUp, Users, Link2, Copy, Eye, RefreshCw, CalendarDays } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
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

function brl(v) {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function brlFull(v) {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function fmtDiaCurto(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

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
  const [stats, setStats] = useState(null)
  const [porConsultora, setPorConsultora] = useState([])
  const [porDia, setPorDia] = useState([])
  const [vendas, setVendas] = useState([])
  const [codigo, setCodigo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [atualizadoAt, setAtualizadoAt] = useState(null)

  const carregarAgregados = useCallback(async () => {
    const [{ data: s }, { data: pc }, { data: pd }] = await Promise.all([
      supabase.rpc('get_vendas_stats'),
      supabase.rpc('get_vendas_por_consultora'),
      supabase.rpc('get_vendas_por_dia', { p_dias: 30 }),
    ])
    if (s?.[0]) setStats(s[0])
    setPorConsultora(pc ?? [])
    // Supabase devolve numeric como string — converte p/ o Recharts renderizar as barras
    setPorDia((pd ?? []).map(d => ({ label: fmtDiaCurto(d.dia), vendas: Number(d.vendas), faturamento: Number(d.faturamento) })))
    setAtualizadoAt(new Date())
  }, [])

  const carregarLista = useCallback(async () => {
    let q = supabase
      .from('ci_vendas')
      .select('venda_id, data_venda, valor_venda, cod_consultora, consultora_venda, nome_curso, metodo_pagamento, plataforma, whatsapp_comprador, whatsapp_final8, casada, conversa_id, conversa_contato_nome, conversa_consultora, classificacao_ia, score_ia')
      .order('data_venda', { ascending: false })
      .limit(300)
    if (codigo) q = q.eq('cod_consultora', codigo)
    const { data } = await q
    setVendas(data ?? [])
  }, [codigo])

  const carregarTudo = useCallback(async () => {
    setLoading(true)
    await Promise.all([carregarAgregados(), carregarLista()])
    setLoading(false)
  }, [carregarAgregados, carregarLista])

  useEffect(() => { carregarTudo() }, [carregarTudo])

  // Auto-refresh a cada 30s + Realtime (best-effort) na tabela de vendas
  const listaRef = useRef(carregarLista)
  const agregRef = useRef(carregarAgregados)
  useEffect(() => { listaRef.current = carregarLista; agregRef.current = carregarAgregados })
  useEffect(() => {
    const t = setInterval(() => { agregRef.current(); listaRef.current() }, 30_000)
    const canal = supabase
      .channel('vendas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eja_vendas' }, () => {
        agregRef.current(); listaRef.current()
      })
      .subscribe()
    return () => { clearInterval(t); supabase.removeChannel(canal) }
  }, [])

  function copiar(txt) { navigator.clipboard.writeText(txt); toast.success('Copiado!') }

  const pctCasadas = stats?.total ? Math.round((stats.casadas / stats.total) * 100) : 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Vendas" />
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900">

        {/* Stats gerais */}
        <div className="flex gap-2">
          <StatCard label="Faturamento total" value={stats ? brl(stats.faturamento_total) : '…'} sub={`${stats?.total ?? '…'} vendas pagas`} icon={DollarSign} cor="text-green-500" />
          <StatCard label="Faturamento do mês" value={stats ? brl(stats.faturamento_mes) : '…'} sub={`${stats?.vendas_mes ?? '…'} vendas no mês`} icon={TrendingUp} cor="text-blue-500" />
          <StatCard label="Vendas hoje" value={stats?.vendas_hoje ?? '…'} sub="pagas hoje" icon={ShoppingCart} cor="text-orange-500" />
          <StatCard label="Casadas com conversa" value={stats ? `${pctCasadas}%` : '…'} sub={`${stats?.casadas ?? '…'} de ${stats?.total ?? '…'} vinculadas`} icon={Link2} cor="text-purple-500" />
        </div>

        {/* Breakdown por consultora */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-0.5">Por consultora · clique para filtrar</p>
          <div className="flex gap-2">
            <button
              onClick={() => setCodigo(null)}
              className={`flex-1 min-w-0 border rounded-[6px] px-3 py-2.5 text-left transition-all ${
                codigo === null
                  ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 ring-2 ring-offset-1 ring-green-400'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50'
              }`}>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-700 text-slate-500">TODAS</span>
              <p className="text-[18px] font-bold leading-none mt-1 text-slate-800 dark:text-slate-100">{stats ? brl(stats.faturamento_total) : '…'}</p>
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

        {/* Gráfico por dia */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] p-3">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays size={13} className="text-blue-500" />
            <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Faturamento por dia — últimos 30 dias</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={porDia} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => brl(v)} width={54} />
              <Tooltip
                formatter={(v, n) => n === 'faturamento' ? [brlFull(v), 'Faturamento'] : [v, 'Vendas']}
                labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11, borderRadius: 6 }}
              />
              <Bar dataKey="faturamento" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={13} className="text-green-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                {loading ? '…' : `${vendas.length} vendas`}{codigo && <span className="text-slate-400 font-normal"> · {NOME_CODIGO[codigo]}</span>}
              </p>
              <span className="text-[10px] text-slate-400">últimas 300</span>
            </div>
            <div className="flex items-center gap-2">
              {atualizadoAt && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  atualiza sozinho · {atualizadoAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              <button onClick={carregarTudo} disabled={loading} className="text-slate-400 hover:text-blue-500 disabled:opacity-50">
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><RefreshCw size={18} className="animate-spin text-slate-400" /></div>
          ) : vendas.length === 0 ? (
            <p className="text-center text-[12px] text-slate-400 py-12">Nenhuma venda encontrada</p>
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
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Conversa</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map(v => (
                    <tr key={v.venda_id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-3 py-2.5 text-[11px] text-slate-500 whitespace-nowrap">{fmtData(v.data_venda)}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => copiar(v.whatsapp_comprador)} className="flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-300 hover:text-blue-500">
                          <Copy size={9} /> {v.whatsapp_comprador || '—'}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[12px] font-bold text-green-600 whitespace-nowrap">{brlFull(v.valor_venda)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 ${COR_CODIGO[v.cod_consultora]}`}>
                          {v.cod_consultora?.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">{NOME_CODIGO[v.cod_consultora]}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[10px] text-slate-500 max-w-[180px] truncate" title={v.nome_curso}>{v.nome_curso ?? '—'}</td>
                      <td className="px-3 py-2.5 text-[10px] text-slate-500 whitespace-nowrap">{v.metodo_pagamento ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        {v.casada ? (
                          <button onClick={() => navigate(`/inbox?id=${v.conversa_id}`)}
                            className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded text-[10px] text-green-700 dark:text-green-400 hover:bg-green-100 transition-colors whitespace-nowrap max-w-[160px]">
                            <Eye size={10} className="shrink-0" />
                            <span className="truncate">{v.conversa_contato_nome || 'ver conversa'}</span>
                          </button>
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
