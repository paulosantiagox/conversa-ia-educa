import { LayoutDashboard, MessageSquare, Flame, Bell, Sparkles, TrendingDown, ShoppingBag, Percent } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Topbar } from '../../components/layout/Topbar'
import { MetricCard } from '../../components/shared/MetricCard'
import { ScoreBar } from '../../components/shared/ScoreBar'
import { METRICAS_DASHBOARD, METRICAS_POR_CONSULTORA, HISTORICO_SEMANA } from '../../lib/mockData'
import { formatRelativeTime } from '../../lib/utils'

const CHART_COLORS = {
  quente: '#ef4444',
  morno: '#f59e0b',
  frio: '#94a3b8',
  vendido: '#22c55e',
}

export function Dashboard() {
  const m = METRICAS_DASHBOARD

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Dashboard — Visão Geral" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Linha 1 de métricas */}
        <div className="grid grid-cols-4 gap-3">
          <MetricCard label="Conversas Abertas" value={m.conversas_abertas} icon={MessageSquare} color="#3b82f6" trend={5} />
          <MetricCard label="Leads Quentes" value={m.leads_quentes} icon={Flame} color="#ef4444" trend={12} />
          <MetricCard label="Alertas Ativos" value={m.alertas_ativos} icon={Bell} color="#f97316" sub="Requer atenção" />
          <MetricCard label="Follow-ups Pendentes" value={m.followups_pendentes} icon={Sparkles} color="#8b5cf6" />
        </div>

        {/* Linha 2 de métricas */}
        <div className="grid grid-cols-4 gap-3">
          <MetricCard label="Score Médio do Time" value={m.score_medio_time} icon={TrendingDown} color="#0ea5e9" sub="0-100" />
          <MetricCard label="Sem Resposta +24h" value={m.sem_resposta_24h} icon={MessageSquare} color="#ef4444" />
          <MetricCard label="Vendas Hoje" value={m.vendas_hoje} icon={ShoppingBag} color="#22c55e" trend={-25} />
          <MetricCard label="Taxa de Fechamento" value={`${m.taxa_fechamento}%`} icon={Percent} color="#f59e0b" trend={3} />
        </div>

        <div className="grid grid-cols-5 gap-3">
          {/* Tabela por consultora */}
          <div className="col-span-3 bg-white border border-slate-200 rounded-[6px] overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <p className="text-[12px] font-semibold text-slate-700">Desempenho por Consultora</p>
              <span className="text-[10px] text-slate-400">Hoje</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Consultora</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Abertas</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Quentes</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide w-32">Score Médio</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Vendas</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Última Ativ.</th>
                </tr>
              </thead>
              <tbody>
                {METRICAS_POR_CONSULTORA.map((c) => (
                  <tr key={c.consultora} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {c.consultora[0]}
                        </div>
                        <span className="text-[12px] font-medium text-slate-700">{c.consultora}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-[12px] text-slate-600">{c.abertas}</td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-[12px] font-semibold text-red-500">{c.quentes}</span>
                    </td>
                    <td className="px-3 py-2">
                      <ScoreBar score={c.score_medio} height={4} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-[12px] font-semibold text-green-600">{c.vendas}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-slate-400">
                      {formatRelativeTime(c.ultima_atividade)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gráfico */}
          <div className="col-span-2 bg-white border border-slate-200 rounded-[6px] overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-[12px] font-semibold text-slate-700">Conversas por Status — Últimos 7 dias</p>
            </div>
            <div className="p-2" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={HISTORICO_SEMANA} barSize={8} barGap={2}>
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #e2e8f0' }} />
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
