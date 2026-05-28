import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, Copy, Eye, RefreshCw, Download, DollarSign, Link, Users } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function StatCard({ label, value, sub, cor, icon: Icon }) {
  const cores = {
    amarelo: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    roxo:    'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    verde:   'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    cinza:   'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
    laranja: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  }
  return (
    <div className={`border rounded-[6px] px-3 py-2.5 flex-1 min-w-0 ${cores[cor] ?? cores.cinza}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon size={12} className="opacity-70" />}
        <p className="text-[11px] font-medium opacity-80">{label}</p>
      </div>
      <p className="text-[22px] font-bold leading-none">{value ?? '…'}</p>
      {sub && <p className="text-[10px] opacity-60 mt-1">{sub}</p>}
    </div>
  )
}

const COR_CODIGO = { vtv: 'blue', vjc: 'purple', vkm: 'green', outros: 'slate' }
const NOME_CODIGO = { vtv: 'Tatiane', vjc: 'Júlia', vkm: 'Ketlen', outros: 'Outros' }

function ConsultoraCard({ codigo, nome, total, ativo, onClick }) {
  const cores = {
    blue:   { borda: 'border-blue-200 dark:border-blue-700',   bg: 'bg-blue-50 dark:bg-blue-900/20',   tx: 'text-blue-600 dark:text-blue-400',   tag: 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300' },
    purple: { borda: 'border-purple-200 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20', tx: 'text-purple-600 dark:text-purple-400', tag: 'bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300' },
    green:  { borda: 'border-green-200 dark:border-green-700',  bg: 'bg-green-50 dark:bg-green-900/20',  tx: 'text-green-600 dark:text-green-400',  tag: 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300' },
    slate:  { borda: 'border-slate-200 dark:border-slate-600',  bg: 'bg-slate-50 dark:bg-slate-800',     tx: 'text-slate-500 dark:text-slate-400',  tag: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' },
  }
  const c = cores[COR_CODIGO[codigo] ?? 'slate']
  return (
    <button onClick={onClick}
      className={`flex-1 min-w-0 border rounded-[6px] px-3 py-2.5 text-left transition-all cursor-pointer ${
        ativo
          ? `${c.borda} ${c.bg} ring-2 ring-offset-1 ring-current`
          : `border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:${c.bg}`
      }`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${c.tag}`}>{codigo.toUpperCase()}</span>
      </div>
      <p className={`text-[20px] font-bold leading-none ${ativo ? c.tx : 'text-slate-700 dark:text-slate-200'}`}>
        {total?.toLocaleString('pt-BR') ?? '…'}
      </p>
      <p className={`text-[11px] font-medium mt-0.5 ${ativo ? c.tx : 'text-slate-500'}`}>{nome}</p>
    </button>
  )
}

const UTM_CODES = { vjc: 'Júlia', vtv: 'Tatiane', vkm: 'Ketlen' }

function parseLink(url) {
  if (!url) return null
  const slugM = url.match(/\/pay\/([^?&\s]+)/)
  const utmM  = url.match(/utm_source=cod-([a-zA-Z0-9]+)/i)
  const utmCode = utmM?.[1]?.toLowerCase() ?? null
  return { url, slug: slugM?.[1] ?? null, utmCode, consultoraNome: utmCode ? (UTM_CODES[utmCode] ?? utmCode) : null }
}

function exportCSV(dados, aba, codigo) {
  const headers = ['Nome','Número','Consultora','Classificação','Score',
    'Recebeu Valor Em','Recebeu Link Em','Link','Slug','UTM','Consultora Link',
    'Última Mensagem','Última Msg Lead','Instância','Instância Número']
  const rows = dados.map(r => [
    r.contato_nome ?? '', r.contato_numero ?? '', r.consultora ?? '',
    r.classificacao_ia ?? '', r.score_ia ?? '',
    r.valor_enviado_at ? new Date(r.valor_enviado_at).toLocaleString('pt-BR') : '',
    r.link_enviado_at  ? new Date(r.link_enviado_at).toLocaleString('pt-BR')  : '',
    r.link_url ?? '', r.link_slug ?? '', r.link_utm_code ?? '', r.link_consultora_nome ?? '',
    r.ultima_mensagem_at        ? new Date(r.ultima_mensagem_at).toLocaleString('pt-BR')        : '',
    r.ultima_mensagem_lead_at   ? new Date(r.ultima_mensagem_lead_at).toLocaleString('pt-BR')   : '',
    r.instancia ?? '', r.instancia_numero ?? '',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `acao-fim-mes-${aba}${codigo ? '-' + codigo : ''}-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}

const ABAS = [
  { key: 'valor_sem_link',  label: 'Receberam Valor (sem link)',  statsKey: 'total_valor_sem_link',  cor: 'amarelo' },
  { key: 'link_sem_compra', label: 'Receberam Link (sem compra)', statsKey: 'total_link_sem_compra', cor: 'roxo' },
  { key: 'link_todos',      label: 'Todos com Link',              statsKey: 'total_link',            cor: 'cinza' },
]

export function AcaoFimMes() {
  const navigate = useNavigate()
  const toast = useToast()
  const [aba, setAba] = useState('valor_sem_link')
  const [codigo, setCodigo] = useState(null)   // null = Todos
  const [dados, setDados] = useState([])
  const [stats, setStats] = useState(null)
  const [breakdown, setBreakdown] = useState([])   // por consultora/código
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)

  // Stats gerais — carrega uma vez
  useEffect(() => {
    setLoadingStats(true)
    supabase.rpc('get_leads_acao_fim_mes_stats')
      .then(({ data }) => { if (data?.[0]) setStats(data[0]) })
      .finally(() => setLoadingStats(false))
  }, [])

  // Breakdown por consultora — recarrega quando muda a aba
  useEffect(() => {
    supabase.rpc('get_leads_acao_fim_mes_por_consultora', { p_aba: aba })
      .then(({ data }) => setBreakdown(data ?? []))
  }, [aba])

  // Dados da tabela
  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_leads_acao_fim_mes', {
      p_aba:    aba,
      p_codigo: codigo,
      p_lim:    1000,
    })
    if (error) toast.error('Erro: ' + error.message)
    else setDados(data ?? [])
    setLoading(false)
  }, [aba, codigo]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { carregar() }, [carregar])

  function copiar(texto) { navigator.clipboard.writeText(texto); toast.success('Copiado!') }

  const abaAtual = ABAS.find(a => a.key === aba)
  const totalAbaAtual = stats?.[abaAtual?.statsKey]

  // Cards de consultora: Todas + breakdown + Outros
  const codigoAtivo = codigo

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Ação Final de Mês" />
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900">

        {/* Stats gerais */}
        <div className="flex gap-2">
          <StatCard label="Receberam o valor"  value={loadingStats ? '…' : stats?.total_valor?.toLocaleString('pt-BR')}        sub="Proposta de preço enviada"        cor="amarelo" icon={DollarSign} />
          <StatCard label="Valor sem link"      value={loadingStats ? '…' : stats?.total_valor_sem_link?.toLocaleString('pt-BR')} sub="Não chegaram ao link"             cor="laranja" icon={Users} />
          <StatCard label="Receberam o link"    value={loadingStats ? '…' : stats?.total_link?.toLocaleString('pt-BR')}          sub="Chegaram à página de pagamento"  cor="roxo"    icon={Link} />
          <StatCard label="Link sem compra"     value={loadingStats ? '…' : stats?.total_link_sem_compra?.toLocaleString('pt-BR')} sub="Hot leads — prontos para fechar" cor="verde"   icon={Target} />
        </div>

        {/* Abas principais */}
        <div className="flex items-center gap-0.5 border-b border-slate-200 dark:border-slate-700">
          {ABAS.map(a => (
            <button key={a.key}
              onClick={() => { setAba(a.key); setCodigo(null) }}
              className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium border-b-2 -mb-px transition-colors ${
                aba === a.key
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}>
              {a.label}
              {stats?.[a.statsKey] != null && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${aba === a.key ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                  {Number(stats[a.statsKey]).toLocaleString('pt-BR')}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Painel de breakdown por consultora */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-0.5">
            Distribuição por consultora · clique para filtrar
          </p>
          <div className="flex gap-2">
            {/* Card "Todas" */}
            <button
              onClick={() => setCodigo(null)}
              className={`flex-1 min-w-0 border rounded-[6px] px-3 py-2.5 text-left transition-all ${
                codigoAtivo === null
                  ? 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 ring-2 ring-offset-1 ring-orange-400'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50'
              }`}>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">TODAS</span>
              <p className={`text-[20px] font-bold leading-none mt-1 ${codigoAtivo === null ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {totalAbaAtual != null ? Number(totalAbaAtual).toLocaleString('pt-BR') : '…'}
              </p>
              <p className={`text-[11px] font-medium mt-0.5 ${codigoAtivo === null ? 'text-orange-500' : 'text-slate-500'}`}>Todas as consultoras</p>
            </button>

            {/* Cards por código */}
            {['vtv', 'vjc', 'vkm', 'outros'].map(cod => {
              const item = breakdown.find(b => b.codigo === cod)
              return (
                <ConsultoraCard
                  key={cod}
                  codigo={cod}
                  nome={NOME_CODIGO[cod] ?? cod}
                  total={item?.total ?? 0}
                  ativo={codigoAtivo === cod}
                  onClick={() => setCodigo(codigoAtivo === cod ? null : cod)}
                />
              )
            })}
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target size={13} className="text-orange-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                {loading ? '…' : `${dados.length.toLocaleString('pt-BR')} leads`}
              </p>
              <span className="text-[11px] text-slate-400">· {abaAtual?.label}</span>
              {codigoAtivo && (
                <span className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium">
                  {codigoAtivo.toUpperCase()} · {NOME_CODIGO[codigoAtivo]}
                  <button onClick={() => setCodigo(null)} className="ml-1 opacity-60 hover:opacity-100">×</button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={carregar} disabled={loading}
                className="text-[11px] text-slate-400 hover:text-blue-500 flex items-center gap-1 disabled:opacity-50">
                <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => exportCSV(dados, aba, codigoAtivo)}
                disabled={dados.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-[11px] font-medium disabled:opacity-40 transition-colors">
                <Download size={11} /> Exportar CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={18} className="animate-spin text-slate-400" />
            </div>
          ) : dados.length === 0 ? (
            <p className="text-center text-[12px] text-slate-400 py-12">Nenhum lead encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Contato</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Consultora</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Recebeu Valor</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Link · UTM</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Última Msg</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Instância</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Score</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map(r => {
                    const link = parseLink(r.link_url)
                    return (
                      <tr key={r.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors align-top">
                        <td className="px-3 py-2.5">
                          <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200">{r.contato_nome || r.contato_numero || '—'}</p>
                          {r.contato_numero && (
                            <button onClick={() => copiar(r.contato_numero)}
                              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-500 transition-colors font-mono mt-0.5">
                              <Copy size={9} /> {r.contato_numero}
                            </button>
                          )}
                          {r.classificacao_ia && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${
                              r.classificacao_ia === 'quente' ? 'bg-red-100 text-red-600' :
                              r.classificacao_ia === 'morno'  ? 'bg-amber-100 text-amber-600' :
                              'bg-slate-100 text-slate-400'}`}>{r.classificacao_ia}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.consultora ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          {r.valor_enviado_at ? (
                            <div>
                              <p className="text-[10px] text-amber-600 font-medium">{fmtData(r.valor_enviado_at)}</p>
                              <p className="text-[9px] text-slate-400">{fmt(r.valor_enviado_at).split(' ')[1]}</p>
                            </div>
                          ) : <span className="text-[10px] text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {link ? (
                            <div className="space-y-0.5">
                              <p className="text-[10px] text-purple-600 font-medium">{fmtData(r.link_enviado_at)}</p>
                              {link.slug && <p className="text-[9px] text-slate-500 font-mono bg-slate-50 dark:bg-slate-700 px-1 py-0.5 rounded">{link.slug}</p>}
                              {link.utmCode && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold font-mono inline-block ${
                                  link.utmCode === 'vtv' ? 'bg-blue-100 text-blue-700' :
                                  link.utmCode === 'vjc' ? 'bg-purple-100 text-purple-700' :
                                  link.utmCode === 'vkm' ? 'bg-green-100 text-green-700' :
                                  'bg-slate-100 text-slate-500'}`}>
                                  {link.utmCode} · {link.consultoraNome ?? '?'}
                                </span>
                              )}
                              <button onClick={() => copiar(link.url)}
                                className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-purple-500 transition-colors">
                                <Copy size={8} /> link
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300">Sem link</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="text-[10px] text-slate-500">{fmt(r.ultima_mensagem_at)}</p>
                          {r.ultima_mensagem_lead_at && (
                            <p className="text-[9px] text-slate-400 mt-0.5">Lead: {fmt(r.ultima_mensagem_lead_at)}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {r.instancia ? (
                            <div>
                              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">{r.instancia}</p>
                              {r.instancia_numero && (
                                <button onClick={() => copiar(r.instancia_numero)}
                                  className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-blue-500 font-mono">
                                  <Copy size={8} /> {r.instancia_numero}
                                </button>
                              )}
                            </div>
                          ) : <span className="text-[10px] text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {r.score_ia != null ? (
                            <span className={`text-[11px] font-bold ${r.score_ia >= 70 ? 'text-green-600' : r.score_ia >= 40 ? 'text-amber-500' : 'text-slate-400'}`}>
                              {r.score_ia}
                            </span>
                          ) : <span className="text-[10px] text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <button onClick={() => navigate(`/inbox?id=${r.id}`)}
                            className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[11px] text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap">
                            <Eye size={10} /> Ver
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
