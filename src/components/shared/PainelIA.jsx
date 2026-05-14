import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, X, Lightbulb, MessageSquare, DollarSign, Link, Star, ClipboardList } from 'lucide-react'
import { ScoreBar } from './ScoreBar'
import { getScoreColor } from '../../lib/utils'

function Section({ title, icon: Icon, children, defaultOpen = true, color = '#64748b' }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-3 py-2 hover:bg-slate-50 text-left"
      >
        {open ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
        {Icon && <Icon size={12} style={{ color }} />}
        <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{title}</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

export function PainelIA({ conversa }) {
  if (!conversa) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-[12px]">
        Selecione uma conversa
      </div>
    )
  }

  const scoreColor = getScoreColor(conversa.score_ia)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Section title="Score IA" icon={Star} color="#f59e0b" defaultOpen={true}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl font-bold tabular-nums" style={{ color: scoreColor }}>
            {conversa.score_ia}
          </span>
          <div className="flex-1">
            <ScoreBar score={conversa.score_ia} height={6} />
            <p className="text-[10px] text-slate-400 mt-1">Chance de fechar: <strong style={{ color: scoreColor }}>{conversa.chance_fechamento}%</strong></p>
          </div>
        </div>
      </Section>

      <Section title="Resumo IA" icon={MessageSquare} color="#3b82f6" defaultOpen={true}>
        <p className="text-[12px] text-slate-600 leading-relaxed">{conversa.resumo_ia}</p>
      </Section>

      {conversa.proxima_melhor_resposta && (
        <Section title="Próxima Resposta Sugerida" icon={Lightbulb} color="#8b5cf6" defaultOpen={true}>
          <div className="bg-purple-50 border border-purple-200 rounded p-2.5 text-[12px] text-purple-800 leading-relaxed italic">
            "{conversa.proxima_melhor_resposta}"
          </div>
        </Section>
      )}

      {conversa.objecoes_detectadas?.length > 0 && (
        <Section title={`Objeções (${conversa.objecoes_detectadas.length})`} icon={AlertTriangle} color="#f59e0b" defaultOpen={true}>
          <ul className="space-y-1">
            {conversa.objecoes_detectadas.map((obj, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12px] text-slate-600">
                <AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-500" />
                {obj}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {conversa.erros_consultora?.length > 0 && (
        <Section title={`Erros da Consultora (${conversa.erros_consultora.length})`} icon={X} color="#ef4444" defaultOpen={true}>
          <ul className="space-y-1">
            {conversa.erros_consultora.map((erro, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12px] text-slate-600">
                <X size={11} className="mt-0.5 shrink-0 text-red-500" />
                {erro}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {conversa.sugestoes_ia?.length > 0 && (
        <Section title={`Sugestões (${conversa.sugestoes_ia.length})`} icon={Lightbulb} color="#22c55e" defaultOpen={false}>
          <ul className="space-y-1">
            {conversa.sugestoes_ia.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12px] text-slate-600">
                <Lightbulb size={11} className="mt-0.5 shrink-0 text-green-500" />
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Marcações Rápidas" icon={ClipboardList} color="#64748b" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-1.5">
          <button className="flex items-center gap-1.5 px-2 py-1.5 bg-green-50 border border-green-200 rounded text-[11px] text-green-700 hover:bg-green-100 transition-colors">
            <DollarSign size={11} /> Enviou Valor
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-700 hover:bg-blue-100 transition-colors">
            <Link size={11} /> Enviou Link
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1.5 bg-red-50 border border-red-200 rounded text-[11px] text-red-700 hover:bg-red-100 transition-colors">
            <Star size={11} /> Lead Quente
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1.5 bg-purple-50 border border-purple-200 rounded text-[11px] text-purple-700 hover:bg-purple-100 transition-colors">
            <ClipboardList size={11} /> Follow-up
          </button>
        </div>
      </Section>
    </div>
  )
}
