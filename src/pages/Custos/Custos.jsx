import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Zap, Mic, RefreshCw, ExternalLink } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Topbar } from '../../components/layout/Topbar'
import { supabase } from '../../lib/supabase'
import { fetchOpenAIUsage } from '../../lib/openaiUsage'

const ADMIN_KEY_CONFIGURADA = !!import.meta.env.VITE_OPENAI_ADMIN_KEY

const USD_BRL = 5.75

function fmtBRL(val) {
  return `R$ ${(Number(val ?? 0) * USD_BRL).toFixed(4)}`
}

function fmtBRLSimples(val) {
  return `R$ ${(Number(val ?? 0) * USD_BRL).toFixed(2)}`
}

function MetricCard({ label, value, valueBrl, sub, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
        <Icon size={14} className={color} />
      </div>
      <p className="text-[22px] font-bold text-slate-800 dark:text-slate-100 leading-none">{value}</p>
      {valueBrl && <p className="text-[11px] text-slate-400 leading-none mt-0.5">{valueBrl}</p>}
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function fmt(val) {
  if (val == null) return '$ 0.000000'
  return `$ ${Number(val).toFixed(6)}`
}

function fmtShort(val) {
  if (val == null) return '$ 0.0000'
  return `$ ${Number(val).toFixed(4)}`
}

function fmtDia(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function fmtDt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function Custos() {
  const [loading, setLoading] = useState(true)
  const [resumo, setResumo] = useState({ total: 0, anthropic: 0, openai: 0, hoje: 0 })
  const [graficoDados, setGraficoDados] = useState([])
  const [registros, setRegistros] = useState([])
  const [openaiReal, setOpenaiReal] = useState(undefined)

  async function carregarInterno() {
    const agora = new Date()
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString()
    const inicio14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: resMes }, { data: resHoje }, { data: resDias }, { data: resRegistros }] = await Promise.all([
      supabase.from('ci_uso_api').select('servico, custo_usd').gte('created_at', inicioMes),
      supabase.from('ci_uso_api').select('custo_usd').gte('created_at', inicioHoje),
      supabase.from('ci_uso_api').select('created_at, servico, custo_usd').gte('created_at', inicio14d).order('created_at'),
      supabase.from('ci_uso_api').select('created_at, servico, operacao, tokens_input, tokens_output, custo_usd, duracao_segundos').order('created_at', { ascending: false }).limit(50),
    ])

    const totalMes = (resMes ?? []).reduce((s, r) => s + (r.custo_usd ?? 0), 0)
    const anthropicMes = (resMes ?? []).filter(r => r.servico === 'anthropic').reduce((s, r) => s + (r.custo_usd ?? 0), 0)
    const openaiMes = (resMes ?? []).filter(r => r.servico === 'openai').reduce((s, r) => s + (r.custo_usd ?? 0), 0)
    const totalHoje = (resHoje ?? []).reduce((s, r) => s + (r.custo_usd ?? 0), 0)

    setResumo({ total: totalMes, anthropic: anthropicMes, openai: openaiMes, hoje: totalHoje })

    const mapa = {}
    for (const r of resDias ?? []) {
      const dia = fmtDia(r.created_at)
      if (!mapa[dia]) mapa[dia] = { dia, anthropic: 0, openai: 0 }
      if (r.servico === 'anthropic') mapa[dia].anthropic += r.custo_usd ?? 0
      else mapa[dia].openai += r.custo_usd ?? 0
    }
    setGraficoDados(Object.values(mapa))
    setRegistros(resRegistros ?? [])
  }

  async function carregar() {
    setLoading(true)
    try {
      const [, resOpenAI] = await Promise.all([
        carregarInterno(),
        fetchOpenAIUsage(30),
      ])
      setOpenaiReal(resOpenAI)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()

    const channel = supabase
      .channel('custos-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ci_uso_api' },
        () => { carregarInterno() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <Topbar titulo="Custos de API" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Indicador realtime */}
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: '#22c55e' }}
            title="Atualização em tempo real ativa"
          />
          <span className="text-[10px] text-slate-400">tempo real ativo</span>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-5 gap-3">
          <MetricCard
            label="Hoje"
            value={fmtShort(resumo.hoje)}
            valueBrl={fmtBRLSimples(resumo.hoje)}
            sub="gasto hoje (USD)"
            icon={DollarSign}
            color="text-slate-400"
          />
          <MetricCard
            label="Mês atual"
            value={fmtShort(resumo.total)}
            valueBrl={fmtBRLSimples(resumo.total)}
            sub="total do mês (USD)"
            icon={TrendingUp}
            color="text-blue-500"
          />
          <MetricCard
            label="Anthropic"
            value={fmtShort(resumo.anthropic)}
            valueBrl={fmtBRLSimples(resumo.anthropic)}
            sub="Claude Sonnet — análises IA"
            icon={Zap}
            color="text-purple-500"
          />
          <MetricCard
            label="OpenAI Estimado"
            value={fmtShort(resumo.openai)}
            valueBrl={fmtBRLSimples(resumo.openai)}
            sub="Whisper — estimativa"
            icon={Mic}
            color="text-pink-500"
          />
          {/* Card OpenAI Real */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">OpenAI Real</span>
              <ExternalLink size={14} className="text-emerald-500" />
            </div>
            {!ADMIN_KEY_CONFIGURADA ? (
              <div>
                <p className="text-[13px] font-semibold text-slate-400 leading-none">Não configurada</p>
                <a
                  href="https://platform.openai.com/settings/organization/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-400 hover:underline mt-1 inline-block"
                >
                  Gerar admin key →
                </a>
              </div>
            ) : openaiReal?.erro === 'sem_permissao' ? (
              <p className="text-[12px] text-red-400 font-medium">Sem permissão — admin key necessária</p>
            ) : openaiReal?.total_usd != null ? (
              <div>
                <p className="text-[22px] font-bold text-slate-800 dark:text-slate-100 leading-none">{fmtShort(openaiReal.total_usd)}</p>
                <p className="text-[11px] text-slate-400 leading-none mt-0.5">{fmtBRLSimples(openaiReal.total_usd)}</p>
                <p className="text-[11px] text-slate-400 mt-1">cobrado — últimos 30 dias</p>
              </div>
            ) : (
              <p className="text-[13px] text-slate-400">Carregando...</p>
            )}
          </div>
        </div>

        {/* Linha comparativa OpenAI estimado vs real */}
        {openaiReal?.total_usd != null && resumo.openai != null && (
          <p className="text-[10px] text-slate-400 -mt-2">
            OpenAI — Estimado pelo sistema: {fmtShort(resumo.openai)} | Cobrado pela OpenAI: {fmtShort(openaiReal.total_usd)} | Diferença:{' '}
            <span className={(openaiReal.total_usd - resumo.openai) > 0.001 ? 'text-amber-400' : 'text-green-400'}>
              {fmtShort(Math.abs(openaiReal.total_usd - resumo.openai))}
            </span>
          </p>
        )}
        <p className="text-[10px] text-slate-400 -mt-2">Cotação aproximada: 1 USD = R$ 5,75</p>

        {/* Gráfico */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Custo por dia — últimos 14 dias (USD)</p>
            <button
              onClick={carregar}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>

          {graficoDados.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-[12px] text-slate-400">
              {loading ? 'Carregando...' : 'Nenhum registro nos últimos 14 dias'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={graficoDados} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(4)}`} width={68} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #e2e8f0' }}
                  formatter={(v, name) => [`$ ${Number(v).toFixed(6)} (${fmtBRL(v)})`, name === 'anthropic' ? 'Anthropic' : 'OpenAI']}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={v => v === 'anthropic' ? 'Anthropic' : 'OpenAI'} />
                <Bar dataKey="anthropic" fill="#6366f1" radius={[2, 2, 0, 0]} maxBarSize={32} />
                <Bar dataKey="openai" fill="#22c55e" radius={[2, 2, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tabela */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
            <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Últimos 50 registros</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">Data/hora</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">Serviço</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">Operação</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">Tokens in</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">Tokens out</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">Duração</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">Custo</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">Carregando...</td></tr>
                )}
                {!loading && registros.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">Nenhum registro ainda. Execute análises IA ou transcrições Whisper para ver os custos aqui.</td></tr>
                )}
                {registros.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDt(r.created_at)}</td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        r.servico === 'anthropic'
                          ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                          : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      }`}>
                        {r.servico === 'anthropic' ? <Zap size={9} /> : <Mic size={9} />}
                        {r.servico}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{r.operacao}</td>
                    <td className="px-3 py-1.5 text-right text-slate-500 dark:text-slate-400">{r.tokens_input > 0 ? r.tokens_input.toLocaleString('pt-BR') : '—'}</td>
                    <td className="px-3 py-1.5 text-right text-slate-500 dark:text-slate-400">{r.tokens_output > 0 ? r.tokens_output.toLocaleString('pt-BR') : '—'}</td>
                    <td className="px-3 py-1.5 text-right text-slate-500 dark:text-slate-400">
                      {r.duracao_segundos > 0 ? `${Number(r.duracao_segundos).toFixed(1)}s` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      <span className="text-slate-700 dark:text-slate-200">{fmt(r.custo_usd)}</span>
                      <br />
                      <span className="text-[10px] text-slate-400">{fmtBRL(r.custo_usd)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
