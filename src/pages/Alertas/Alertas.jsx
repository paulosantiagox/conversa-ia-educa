import { useState, useEffect } from 'react'
import { Bell, Eye, Check, AlertTriangle, Clock, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { FiltroPeriodo, filtrarPorPeriodo } from '../../components/shared/FiltroPeriodo'
import { ALERTAS } from '../../lib/mockData'
import { formatRelativeTime } from '../../lib/utils'
import { supabase } from '../../lib/supabase'

const SEV_CONFIG = {
  critica: { label: '🔴 Crítico', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  atencao: { label: '🟠 Atenção', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  aviso: { label: '🟡 Aviso', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-400' },
}

export function Alertas() {
  const [alertas, setAlertas] = useState(ALERTAS)
  const [periodo, setPeriodo] = useState('tudo')
  const [janelaCritica, setJanelaCritica] = useState([])
  const [carregandoJanela, setCarregandoJanela] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { carregarJanelaCritica() }, [])

  async function carregarJanelaCritica() {
    setCarregandoJanela(true)
    try {
      const { data } = await supabase
        .from('ci_conversas')
        .select('id, contato_nome, contato_numero, consultora, ultima_mensagem_at')
        .eq('janela_24h_status', 'critica')
        .order('ultima_mensagem_at', { ascending: true })
        .limit(50)
      setJanelaCritica(data ?? [])
    } finally {
      setCarregandoJanela(false)
    }
  }

  const alertasFiltrados = filtrarPorPeriodo(alertas, 'created_at', periodo)
  const naoLidos = alertasFiltrados.filter(a => !a.lido)
  const lidos = alertasFiltrados.filter(a => a.lido)

  function marcarLido(id) {
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, lido: true } : a))
  }

  function AlCol({ list }) {
    return list.map(a => {
      const cfg = SEV_CONFIG[a.severidade] || SEV_CONFIG.aviso
      return (
        <div key={a.id} className={`flex items-start gap-3 p-3 border rounded-[6px] mb-2 ${cfg.bg} ${cfg.border} ${a.lido ? 'opacity-50' : ''}`}>
          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[11px] font-semibold ${cfg.text}`}>{cfg.label}</span>
              <span className="text-[10px] text-slate-400">{formatRelativeTime(a.created_at)}</span>
            </div>
            <p className="text-[12px] text-slate-700 dark:text-slate-200">{a.descricao}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {a.contato_nome} · {a.consultora}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => navigate('/inbox')}
              className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              <Eye size={10} /> Ver
            </button>
            {!a.lido && (
              <button
                onClick={() => marcarLido(a.id)}
                className="flex items-center gap-1 px-2 py-1 bg-slate-800 dark:bg-slate-600 text-white rounded text-[11px] hover:bg-slate-700 dark:hover:bg-slate-500 transition-colors"
              >
                <Check size={10} /> Lido
              </button>
            )}
          </div>
        </div>
      )
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Central de Alertas" />
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900">
        {/* ─── Janela WhatsApp Crítica ─── */}
        <div className="mb-4 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-800 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-orange-100 dark:border-orange-800 flex items-center justify-between bg-orange-50 dark:bg-orange-900/20">
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-orange-500" />
              <p className="text-[12px] font-semibold text-orange-700 dark:text-orange-400">
                ⚠ Janela WhatsApp Crítica
                {janelaCritica.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full">{janelaCritica.length}</span>
                )}
              </p>
              <span className="text-[10px] text-orange-500">— entre 20h e 24h desde última mensagem do lead</span>
            </div>
            <button
              onClick={carregarJanelaCritica}
              disabled={carregandoJanela}
              className="flex items-center gap-1 px-2 py-1 border border-orange-200 dark:border-orange-700 rounded text-[11px] text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={10} className={carregandoJanela ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
          {carregandoJanela ? (
            <div className="px-3 py-3 text-[11px] text-slate-400 flex items-center gap-2">
              <RefreshCw size={11} className="animate-spin" /> Carregando...
            </div>
          ) : janelaCritica.length === 0 ? (
            <div className="px-3 py-3 text-[11px] text-slate-400 italic">Nenhuma conversa com janela crítica no momento.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-400 uppercase">Contato</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-400 uppercase">Consultora</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-400 uppercase">Última mensagem</th>
                    <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-400 uppercase">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {janelaCritica.map(c => {
                    const horasAtras = c.ultima_mensagem_at
                      ? Math.round((Date.now() - new Date(c.ultima_mensagem_at).getTime()) / 3600000)
                      : null
                    return (
                      <tr key={c.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-orange-50/50 dark:hover:bg-orange-900/10">
                        <td className="px-3 py-1.5 text-[11px] text-slate-700 dark:text-slate-200">{c.contato_nome || c.contato_numero || '—'}</td>
                        <td className="px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400">{c.consultora ?? '—'}</td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1">
                            <Clock size={10} className="text-orange-400" />
                            <span className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                              {horasAtras != null ? `há ${horasAtras}h` : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <button
                            onClick={() => navigate('/inbox')}
                            className="flex items-center gap-1 px-2 py-1 mx-auto bg-orange-500 hover:bg-orange-600 text-white rounded text-[11px] transition-colors"
                          >
                            <Eye size={10} /> Responder
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

        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] text-slate-400">{alertasFiltrados.length} alerta{alertasFiltrados.length !== 1 ? 's' : ''}</p>
          <FiltroPeriodo value={periodo} onChange={setPeriodo} />
        </div>
        {naoLidos.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell size={13} className="text-red-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{naoLidos.length} alertas pendentes</p>
            </div>
            <AlCol list={naoLidos} />
          </div>
        )}
        {lidos.length > 0 && (
          <div>
            <p className="text-[11px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Resolvidos</p>
            <AlCol list={lidos} />
          </div>
        )}
      </div>
    </div>
  )
}
