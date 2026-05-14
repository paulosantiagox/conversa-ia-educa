import { Brain, Clock, MessageCircle, AlertTriangle, X, TrendingUp } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'

const INSIGHTS = [
  {
    icon: Clock,
    color: '#3b82f6',
    title: 'Horário com mais conversões',
    valor: '10h–12h',
    descricao: '68% das vendas fechadas neste período',
    sub: 'Manhã ainda é o melhor horário para follow-up',
  },
  {
    icon: MessageCircle,
    color: '#22c55e',
    title: 'Palavra/frase com mais conversões',
    valor: '"parcelar em 12x"',
    descricao: 'Aparece em 82% das conversas que fecharam',
    sub: 'Apresentar o parcelamento antes do preço cheio aumenta conversão',
  },
  {
    icon: AlertTriangle,
    color: '#f59e0b',
    title: 'Objeção mais comum',
    valor: '"Vou pensar"',
    descricao: 'Aparece em 45% das conversas mornas',
    sub: 'Consultoras que respondem com urgência convertem 3x mais após esta objeção',
  },
  {
    icon: X,
    color: '#ef4444',
    title: 'Erro mais frequente',
    valor: 'Demora no envio do link',
    descricao: '38% das conversas quentes perdem momentum por atraso no link',
    sub: 'Consultor que envia link em até 5min tem 2x mais chance de fechar',
  },
  {
    icon: TrendingUp,
    color: '#8b5cf6',
    title: 'Melhor abordagem do período',
    valor: 'Desconto para casal/família',
    descricao: 'Taxa de conversão 3x maior quando oferecida',
    sub: 'Ketlen é a consultora que mais usa esta técnica com sucesso',
  },
  {
    icon: Brain,
    color: '#0ea5e9',
    title: 'Consultora com melhor follow-up',
    valor: 'Júlia',
    descricao: '100% dos leads respondidos em menos de 30min',
    sub: 'Tempo de resposta médio: 15min contra 95min da média do time',
  },
]

function InsightCard({ insight }) {
  const { icon: Icon, color, title, valor, descricao, sub } = insight
  return (
    <div className="bg-white border border-slate-200 rounded-[6px] p-4 hover:border-slate-300 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1">{title}</p>
          <p className="text-[15px] font-bold text-slate-800 mb-1">{valor}</p>
          <p className="text-[12px] text-slate-600 mb-1">{descricao}</p>
          <p className="text-[11px] text-slate-400 italic">{sub}</p>
        </div>
      </div>
    </div>
  )
}

export function Insights() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Insights da IA" />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={14} className="text-blue-500" />
          <p className="text-[12px] text-slate-500">Padrões detectados com base nas conversas dos últimos 7 dias</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {INSIGHTS.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      </div>
    </div>
  )
}
