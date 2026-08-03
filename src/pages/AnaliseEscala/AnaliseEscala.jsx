import { useState, useEffect, useCallback } from 'react'
import { Brain, Play, Pause, RefreshCw, CheckCircle2, Clock, DollarSign, Cpu } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Tiers na ordem de prioridade da fila (vendeu -> valor -> link -> resto)
const TIERS = [
  { cohort: 'vendeu',        label: 'Vendas (compradores)', cor: '#22c55e' },
  { cohort: 'recebeu_valor', label: 'Receberam o valor',    cor: '#f59e0b' },
  { cohort: 'recebeu_link',  label: 'Receberam o link',     cor: '#ef4444' },
  { cohort: 'sem_valor',     label: 'Resto (nem valor)',    cor: '#94a3b8' },
]

function fmtDt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

async function headCount(table, filtros = {}) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true })
  for (const [k, v] of Object.entries(filtros)) q = q.eq(k, v)
  const { count } = await q
  return count ?? 0
}

const STATUS_STYLE = {
  rodando:   { txt: 'Rodando',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  pausado:   { txt: 'Pausado',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  parado:    { txt: 'Parado',    cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  concluido: { txt: 'Concluído', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
}

export function AnaliseEscala() {
  const [fila, setFila] = useState(null)
  const [tiers, setTiers] = useState([])
  const [recentes, setRecentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    const { data: f } = await supabase.from('ci_analise_fila').select('*').eq('id', 1).single()
    setFila(f)

    const linhas = await Promise.all(TIERS.map(async (t) => {
      const [feito, pend] = await Promise.all([
        headCount('ci_analise_recuperacao', { cohort: t.cohort }),
        headCount('ci_analise_pendentes', { cohort: t.cohort }),
      ])
      return { ...t, feito, pend, total: feito + pend }
    }))
    setTiers(linhas)

    const { data: r } = await supabase
      .from('ci_analise_recuperacao')
      .select('conversa_id,cohort,resultado,classificacao,consultora_atribuida,motivo_perda,energia_consultora,resumo,analisado_em')
      .order('analisado_em', { ascending: false })
      .limit(15)
    setRecentes(r ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 8000)
    return () => clearInterval(t)
  }, [carregar])

  async function setStatus(status) {
    setSalvando(true)
    await supabase.from('ci_analise_fila').update({ status, updated_at: new Date().toISOString() }).eq('id', 1)
    await carregar()
    setSalvando(false)
  }

  const totalFeito = tiers.reduce((s, t) => s + t.feito, 0)
  const totalGeral = tiers.reduce((s, t) => s + t.total, 0)
  const pctGeral = totalGeral ? Math.round((totalFeito / totalGeral) * 100) : 0
  const st = STATUS_STYLE[fila?.status] ?? STATUS_STYLE.parado

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
            <Brain size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 leading-none">Análise em Escala</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Progresso da análise de IA das conversas (won × lost)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold px-2 py-1 rounded ${st.cls}`}>{st.txt}</span>
          {fila?.modo && (
            <span className="text-[11px] font-medium px-2 py-1 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              modo: {fila.modo === 'aqui' ? 'aqui (sessão)' : 'lá (automático)'}
            </span>
          )}
          <button onClick={carregar} className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Cards de topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card icon={CheckCircle2} color="#22c55e" label="Analisadas" value={totalFeito.toLocaleString('pt-BR')} sub={`${pctGeral}% da base`} />
        <Card icon={Cpu} color="#3b82f6" label="Na fila" value={(totalGeral - totalFeito).toLocaleString('pt-BR')} sub="pendentes" />
        <Card icon={DollarSign} color="#f59e0b" label="Custo API" value={`$ ${Number(fila?.custo_acumulado ?? 0).toFixed(2)}`} sub={`teto $ ${Number(fila?.teto_usd ?? 0).toFixed(0)} · modo aqui = $0`} />
        <Card icon={Clock} color="#8b5cf6" label="Último update" value={fmtDt(fila?.ultimo_tick).split(' ')[1] ?? '—'} sub={fmtDt(fila?.ultimo_tick).split(' ')[0] ?? ''} />
      </div>

      {/* Controles */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] p-3 mb-4 flex items-center justify-between">
        <div className="text-[12px] text-slate-600 dark:text-slate-300">
          {fila?.mensagem || 'Motor de análise'}
          {fila?.modo === 'aqui' && (
            <span className="block text-[11px] text-slate-400 mt-0.5">No modo “aqui”, a análise é conduzida pela sessão do assistente (sem custo de tokens). Pausar interrompe o processamento.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {fila?.status !== 'rodando' ? (
            <button onClick={() => setStatus('rodando')} disabled={salvando}
              className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
              <Play size={13} /> Começar análise
            </button>
          ) : (
            <button onClick={() => setStatus('pausado')} disabled={salvando}
              className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">
              <Pause size={13} /> Pausar
            </button>
          )}
        </div>
      </div>

      {/* Progresso por tier */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] p-4 mb-4">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Progresso por prioridade</p>
        <div className="flex flex-col gap-3">
          {tiers.map((t) => {
            const pct = t.total ? Math.round((t.feito / t.total) * 100) : 0
            return (
              <div key={t.cohort}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{t.label}</span>
                  <span className="tabular-nums text-slate-500 dark:text-slate-400">{t.feito.toLocaleString('pt-BR')} / {t.total.toLocaleString('pt-BR')} · {pct}%</span>
                </div>
                <div className="h-2.5 rounded bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: t.cor }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Últimas analisadas */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-3 py-2 border-b border-slate-100 dark:border-slate-700">Últimas analisadas</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="text-left font-semibold px-3 py-1.5">Cohort</th>
                <th className="text-left font-semibold px-3 py-1.5">Consultora</th>
                <th className="text-left font-semibold px-3 py-1.5">Resultado</th>
                <th className="text-left font-semibold px-3 py-1.5">Motivo</th>
                <th className="text-left font-semibold px-3 py-1.5">Resumo</th>
                <th className="text-left font-semibold px-3 py-1.5">Quando</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-400">Carregando…</td></tr>}
              {!loading && recentes.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-400">Nada analisado ainda.</td></tr>}
              {recentes.map((r) => (
                <tr key={r.conversa_id} className="border-b border-slate-50 dark:border-slate-700/50">
                  <td className="px-3 py-1.5"><span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{r.cohort}</span></td>
                  <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{r.consultora_atribuida || '—'}</td>
                  <td className="px-3 py-1.5">
                    <span className={r.resultado === 'ganhou' ? 'text-green-600 font-medium' : r.resultado === 'perdeu' ? 'text-red-500 font-medium' : 'text-slate-500'}>
                      {r.resultado || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.motivo_perda || '—'}</td>
                  <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300 max-w-[360px] truncate" title={r.resumo || ''}>{r.resumo || '—'}</td>
                  <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap tabular-nums">{fmtDt(r.analisado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Card({ icon: Icon, color, label, value, sub }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
        <Icon size={14} style={{ color }} />
      </div>
      <p className="text-[22px] font-bold text-slate-800 dark:text-slate-100 leading-none tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}
