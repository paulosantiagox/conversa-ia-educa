import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Copy, Eye, RefreshCw } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function StatCard({ label, value, cor }) {
  const cores = {
    verde:  'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    azul:   'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    cinza:  'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  }
  return (
    <div className={`border rounded-[6px] px-3 py-2.5 flex-1 min-w-0 ${cores[cor] ?? cores.cinza}`}>
      <p className="text-[20px] font-bold leading-none">{value ?? '…'}</p>
      <p className="text-[11px] font-medium mt-1 opacity-80">{label}</p>
    </div>
  )
}

export function Matriculados() {
  const navigate = useNavigate()
  const toast = useToast()
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [abaConsultora, setAbaConsultora] = useState('Todas')

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ci_conversas')
      .select('id, contato_nome, contato_numero, consultora, ultima_mensagem_at, classificacao_ia, datacrazy_id, score_ia, total_mensagens, created_at')
      .eq('classificacao_ia', 'vendido')
      .order('ultima_mensagem_at', { ascending: false })
      .limit(500)
    setLista(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function copiarNumero(numero) {
    navigator.clipboard.writeText(numero)
    toast.success('Número copiado')
  }

  const consultoras = ['Todas', ...[...new Set(lista.map(c => c.consultora).filter(Boolean).filter(c => c !== 'Sem atendente'))].sort()]

  const filtrados = abaConsultora === 'Todas' ? lista : lista.filter(c => c.consultora === abaConsultora)

  const totalEnvolvidas = new Set(lista.map(c => c.consultora).filter(Boolean)).size

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Matriculados" />
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900">

        {/* Stats */}
        <div className="flex gap-2">
          <StatCard label="Total matriculados" value={lista.length} cor="verde" />
          <StatCard label="Consultoras envolvidas" value={totalEnvolvidas} cor="azul" />
          <StatCard label="Score médio" value={
            lista.length > 0
              ? Math.round(lista.filter(c => c.score_ia != null).reduce((s, c) => s + c.score_ia, 0) / (lista.filter(c => c.score_ia != null).length || 1))
              : '—'
          } cor="cinza" />
        </div>

        {/* Aviso */}
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-[6px]">
          <CheckCircle size={13} className="text-green-500 shrink-0" />
          <p className="text-[11px] text-green-700 dark:text-green-400">
            Leads classificados como <strong>vendido</strong> pela IA. Nenhum follow-up automático é enviado para eles.
          </p>
        </div>

        {/* Tabs consultora */}
        <div className="flex items-center gap-0.5 border-b border-slate-200 dark:border-slate-700">
          {consultoras.map(c => (
            <button key={c} onClick={() => setAbaConsultora(c)}
              className={`px-3 py-1.5 text-[11px] font-medium border-b-2 -mb-px transition-colors ${abaConsultora === c ? 'border-green-500 text-green-600 dark:text-green-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:border-slate-300'}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Tabela */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={12} className="text-green-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                {loading ? '…' : `${filtrados.length} matriculados`}
              </p>
            </div>
            <button onClick={carregar} disabled={loading}
              className="text-[11px] text-slate-400 hover:text-blue-500 flex items-center gap-1 disabled:opacity-50">
              <RefreshCw size={10} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>

          {loading ? (
            <p className="text-center text-[12px] text-slate-400 py-10">Carregando...</p>
          ) : filtrados.length === 0 ? (
            <p className="text-center text-[12px] text-slate-400 py-10">Nenhum matriculado encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Contato</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Consultora</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Última mensagem</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Msgs</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Score</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(c => (
                    <tr key={c.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle size={11} className="text-green-400 shrink-0" />
                          <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200">{c.contato_nome || c.contato_numero || '—'}</p>
                        </div>
                        {c.contato_numero && (
                          <button onClick={() => copiarNumero(c.contato_numero)}
                            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-500 transition-colors mt-0.5 font-mono ml-4">
                            <Copy size={9} /> {c.contato_numero}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-500 dark:text-slate-400">{c.consultora ?? '—'}</td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-400">{fmt(c.ultima_mensagem_at)}</td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-500">{c.total_mensagens ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        {c.score_ia != null ? (
                          <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">{c.score_ia}/100</span>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => navigate(`/inbox?id=${c.id}`)}
                          className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">
                          <Eye size={10} /> Ver
                        </button>
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
