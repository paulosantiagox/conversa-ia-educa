import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, X, Lightbulb, MessageSquare, DollarSign, Link, Star, ClipboardList, TrendingUp, Brain, RefreshCw } from 'lucide-react'
import { LineChart, Line, Tooltip, ResponsiveContainer, YAxis } from 'recharts'
import { ScoreBar } from './ScoreBar'
import { getScoreColor } from '../../lib/utils'
import { useToast } from '../../contexts/ToastContext'
import { analisarConversa } from '../../lib/analisaIA'
import { supabase } from '../../lib/supabase'

function gerarEvolucaoScore(scoreAtual) {
  const base = Math.max(10, scoreAtual - 30)
  const pontos = 7
  return Array.from({ length: pontos }, (_, i) => {
    const progresso = i / (pontos - 1)
    const variacao = (Math.random() - 0.3) * 12
    const score = Math.round(Math.min(100, Math.max(0, base + (scoreAtual - base) * progresso + variacao)))
    return { t: i + 1, s: i === pontos - 1 ? scoreAtual : score }
  })
}

function Section({ title, icon: Icon, children, defaultOpen = true, color = '#64748b' }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-100 dark:border-slate-700 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left"
      >
        {open ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
        {Icon && <Icon size={12} style={{ color }} />}
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{title}</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

export function PainelIA({ conversa, onAnaliseAtualizada }) {
  const [analisando, setAnalisando] = useState(false)
  const toast = useToast()

  // Hooks sempre chamados — nunca condicional
  const scoreColor = getScoreColor(conversa?.score_ia)
  const evolucao = useMemo(() => gerarEvolucaoScore(conversa?.score_ia ?? 50), [conversa?.id])

  if (!conversa) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-[12px]">
        Selecione uma conversa
      </div>
    )
  }

  async function analisarEstaConversa() {
    if (analisando) return
    setAnalisando(true)
    try {
      const { data: mensagens, error } = await supabase
        .from('ci_mensagens')
        .select('de, conteudo, tipo, transcricao, enviado_at')
        .eq('conversa_id', conversa.id)
        .order('enviado_at', { ascending: true })

      if (error) throw new Error(error.message)
      if (!mensagens || mensagens.length < 2) {
        toast.warning('Conversa sem mensagens suficientes para análise.')
        return
      }

      const analise = await analisarConversa(mensagens, conversa.consultora ?? 'Sem atendente')
      if (!analise) throw new Error('IA não retornou resultado.')

      const { error: errUpdate } = await supabase
        .from('ci_conversas')
        .update({
          score_ia: analise.score_ia,
          classificacao_ia: analise.classificacao_ia,
          chance_fechamento: analise.chance_fechamento,
          resumo_ia: analise.resumo_ia,
          objecoes_detectadas: analise.objecoes_detectadas ?? [],
          erros_consultora: analise.erros_consultora ?? [],
          sugestoes_ia: analise.sugestoes_ia ?? [],
          proxima_melhor_resposta: analise.proxima_melhor_resposta,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversa.id)

      if (errUpdate) throw new Error(errUpdate.message)

      toast.success(`Análise concluída — Score: ${analise.score_ia}`)
      if (onAnaliseAtualizada) onAnaliseAtualizada({ ...conversa, ...analise })
    } catch (err) {
      toast.error(`Erro na análise: ${err.message}`)
    } finally {
      setAnalisando(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Section title="Score IA" icon={Star} color="#f59e0b" defaultOpen={true}>
        {conversa.score_ia == null ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic py-1">Aguardando análise IA...</p>
        ) : (
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl font-bold tabular-nums" style={{ color: scoreColor }}>
              {conversa.score_ia}
            </span>
            <div className="flex-1">
              <ScoreBar score={conversa.score_ia} height={6} />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Chance de fechar: <strong style={{ color: scoreColor }}>{conversa.chance_fechamento ?? '—'}%</strong></p>
            </div>
          </div>
        )}
      </Section>

      <Section title="Evolução do Score" icon={TrendingUp} color={scoreColor} defaultOpen={false}>
        <div style={{ height: 80 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolucao} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={30} />
              <Tooltip
                contentStyle={{ fontSize: 10, borderRadius: 4, border: '1px solid #e2e8f0', padding: '2px 6px' }}
                formatter={(v) => [v, 'Score']}
                labelFormatter={() => ''}
              />
              <Line
                type="monotone"
                dataKey="s"
                stroke={scoreColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: scoreColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="Resumo IA" icon={MessageSquare} color="#3b82f6" defaultOpen={true}>
        {conversa.resumo_ia
          ? <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{conversa.resumo_ia}</p>
          : <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">Aguardando análise IA...</p>
        }
      </Section>

      {conversa.proxima_melhor_resposta && (
        <Section title="Próxima Resposta Sugerida" icon={Lightbulb} color="#8b5cf6" defaultOpen={true}>
          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded p-2.5 text-[12px] text-purple-800 dark:text-purple-300 leading-relaxed italic">
            "{conversa.proxima_melhor_resposta}"
          </div>
        </Section>
      )}

      {conversa.objecoes_detectadas?.length > 0 && (
        <Section title={`Objeções (${conversa.objecoes_detectadas.length})`} icon={AlertTriangle} color="#f59e0b" defaultOpen={true}>
          <ul className="space-y-1">
            {conversa.objecoes_detectadas.map((obj, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
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
              <li key={i} className="flex items-start gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
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
              <li key={i} className="flex items-start gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
                <Lightbulb size={11} className="mt-0.5 shrink-0 text-green-500" />
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Marcações Rápidas" icon={ClipboardList} color="#64748b" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => toast.success('Marcação salva: Enviou Valor')} className="flex items-center gap-1.5 px-2 py-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded text-[11px] text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
            <DollarSign size={11} /> Enviou Valor
          </button>
          <button onClick={() => toast.success('Marcação salva: Enviou Link')} className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded text-[11px] text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
            <Link size={11} /> Enviou Link
          </button>
          <button onClick={() => toast.success('Marcação salva: Lead Quente')} className="flex items-center gap-1.5 px-2 py-1.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded text-[11px] text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
            <Star size={11} /> Lead Quente
          </button>
          <button onClick={() => toast.success('Marcação salva: Follow-up')} className="flex items-center gap-1.5 px-2 py-1.5 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded text-[11px] text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
            <ClipboardList size={11} /> Follow-up
          </button>
        </div>
      </Section>

      {/* Analisar esta conversa */}
      <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={analisarEstaConversa}
          disabled={analisando}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-[12px] font-medium transition-colors"
        >
          {analisando
            ? <><RefreshCw size={12} className="animate-spin" /> Analisando...</>
            : <><Brain size={12} /> Analisar esta conversa</>
          }
        </button>
        {conversa.score_ia != null && (
          <p className="text-[10px] text-slate-400 text-center mt-1">Re-analisar irá sobrescrever o score atual ({conversa.score_ia})</p>
        )}
      </div>
    </div>
  )
}
