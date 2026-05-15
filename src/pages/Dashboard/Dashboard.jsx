import { useState, useEffect } from 'react'
import { MessageSquare, Flame, Bell, Sparkles, TrendingDown, ShoppingBag, Percent, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Topbar } from '../../components/layout/Topbar'
import { MetricCard } from '../../components/shared/MetricCard'
import { ScoreBar } from '../../components/shared/ScoreBar'
import { SkeletonCard, SkeletonRow } from '../../components/shared/SkeletonLoader'
import { FiltroPeriodo, filtrarPorPeriodo } from '../../components/shared/FiltroPeriodo'
import { METRICAS_DASHBOARD, METRICAS_POR_CONSULTORA, HISTORICO_SEMANA } from '../../lib/mockData'
import { formatRelativeTime } from '../../lib/utils'
import { exportToCsv } from '../../lib/exportCsv'

const CHART_COLORS = {
  quente: '#ef4444',
  morno: '#f59e0b',
  frio: '#94a3b8',
  vendido: '#22c55e',
}

export function Dashboard() {
  const m = METRICAS_DASHBOARD
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('tudo')
  useEffect(() => { const t = setTimeout(() => setLoading(false), 800); return () => clearTimeout(t) }, [])

  const consultoras = filtrarPorPeriodo(METRICAS_POR_CONSULTORA, 'ultima_atividade', periodo)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Dashboard — Visão Geral" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">

        {/* Linha 1 de métricas */}
        <div className="grid grid-cols-4 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} height={72} />)
          ) : (
            <>
              <MetricCard label="Conversas Abertas" value={m.conversas_abertas} icon={MessageSquare} color="#3b82f6" trend={5} />
              <MetricCard label="Leads Quentes" value={m.leads_quentes} icon={Flame} color="#ef4444" trend={12} />
              <MetricCard label="Alertas Ativos" value={m.alertas_ativos} icon={Bell} color="#f97316" sub="Requer atenção" />
              <MetricCard label="Follow-ups Pendentes" value={m.followups_pendentes} icon={Sparkles} color="#8b5cf6" />
            </>
          )}
        </div>

        {/* Linha 2 de métricas */}
        <div className="grid grid-cols-4 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} height={72} />)
          ) : (
            <>
              <MetricCard label="Score Médio do Time" value={m.score_medio_time} icon={TrendingDown} color="#0ea5e9" sub="0-100" />
              <MetricCard label="Sem Resposta +24h" value={m.sem_resposta_24h} icon={MessageSquare} color="#ef4444" />
              <MetricCard label="Vendas Hoje" value={m.vendas_hoje} icon={ShoppingBag} color="#22c55e" trend={-25} />
              <MetricCard label="Taxa de Fechamento" value={`${m.taxa_fechamento}%`} icon={Percent} color="#f59e0b" trend={3} />
            </>
          )}
        </div>

        <div className="grid grid-cols-5 gap-3">
          {/* Tabela por consultora */}
          <div className="col-span-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Desempenho por Consultora</p>
              <div className="flex items-center gap-2">
                <FiltroPeriodo value={periodo} onChange={setPeriodo} />
                <button
                  onClick={() => exportToCsv(consultoras, 'desempenho-consultoras')}
                  className="flex items-center gap-1 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-[11px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 h-[28px] transition-colors"
                >
                  <Download size={11} /> CSV
                </button>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Consultora</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Abertas</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Quentes</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-32">Score Médio</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Vendas</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Última Ativ.</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                  : consultoras.map((c) => (
                    <tr key={c.consultora} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {c.consultora[0]}
                          </div>
                          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">{c.consultora}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-[12px] text-slate-600 dark:text-slate-300">{c.abertas}</td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-[12px] font-semibold text-red-500">{c.quentes}</span>
                      </td>
                      <td className="px-3 py-2">
                        <ScoreBar score={c.score_medio} height={4} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-[12px] font-semibold text-green-600">{c.vendas}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-[11px] text-slate-400 dark:text-slate-500">
                        {formatRelativeTime(c.ultima_atividade)}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>

          {/* Gráfico */}
          <div className="col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Conversas por Status — Últimos 7 dias</p>
            </div>
            <div className="p-2" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={HISTORICO_SEMANA} barSize={8} barGap={2}>
                  <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #e2e8f0', backgroundColor: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="quente" name="Quente" fill={CHART_COLORS.quente} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="morno" name="Morno" fill={CHART_COLORS.morno} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="vendido" name="Vendido" fill={CHART_COLORS.vendido} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="frio" name="Frio" fill={CHART_COLORS.frio} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
