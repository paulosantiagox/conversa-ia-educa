import { Trophy } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Topbar } from '../../components/layout/Topbar'
import { ScoreBar } from '../../components/shared/ScoreBar'
import { METRICAS_POR_CONSULTORA } from '../../lib/mockData'

const MEDALS = ['🥇', '🥈', '🥉']

const rankingData = [...METRICAS_POR_CONSULTORA]
  .sort((a, b) => b.vendas - a.vendas || b.score_medio - a.score_medio)
  .map((c, i) => ({ ...c, posicao: i + 1, taxa_conv: Math.round((c.vendas / c.abertas) * 100) || 0 }))

export function Ranking() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Ranking de Consultoras" />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {rankingData.slice(0, 3).map((c) => (
            <div key={c.consultora} className="bg-white border border-slate-200 rounded-[6px] p-3 text-center">
              <p className="text-2xl mb-1">{MEDALS[c.posicao - 1]}</p>
              <p className="text-[13px] font-bold text-slate-800">{c.consultora}</p>
              <p className="text-[11px] text-slate-400 mb-2">{c.vendas} vendas · {c.taxa_conv}% conv.</p>
              <ScoreBar score={c.score_medio} />
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <Trophy size={14} className="text-amber-500" />
            <p className="text-[12px] font-semibold text-slate-700">Ranking Completo</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">#</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Consultora</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Abertas</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Quentes</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide w-32">Score Médio</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Vendas</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Taxa Conv.</th>
              </tr>
            </thead>
            <tbody>
              {rankingData.map((c) => (
                <tr key={c.consultora} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 text-[14px]">{MEDALS[c.posicao - 1] || c.posicao}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {c.consultora[0]}
                      </div>
                      <span className="text-[12px] font-medium text-slate-700">{c.consultora}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-[12px] text-slate-600">{c.abertas}</td>
                  <td className="px-3 py-2 text-right text-[12px] text-red-500 font-semibold">{c.quentes}</td>
                  <td className="px-3 py-2"><ScoreBar score={c.score_medio} height={4} /></td>
                  <td className="px-3 py-2 text-right text-[12px] font-bold text-green-600">{c.vendas}</td>
                  <td className="px-3 py-2 text-right text-[12px] text-slate-600">{c.taxa_conv}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-slate-200 rounded-[6px] p-3">
          <p className="text-[12px] font-semibold text-slate-700 mb-3">Score Médio por Consultora</p>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankingData} barSize={32}>
                <XAxis dataKey="consultora" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} width={25} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="score_medio" name="Score Médio" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
