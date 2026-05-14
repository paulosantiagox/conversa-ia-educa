import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { ConversaItem } from '../../components/shared/ConversaItem'
import { ChatBubble } from '../../components/shared/ChatBubble'
import { PainelIA } from '../../components/shared/PainelIA'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { useConversas } from '../../hooks/useConversas'
import { MENSAGENS } from '../../lib/mockData'
import { CONSULTORAS } from '../../lib/mockData'

const STATUS_OPTIONS = ['', 'quente', 'morno', 'frio', 'vendido', 'perdido']

export function Inbox() {
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroConsultora, setFiltroConsultora] = useState('')
  const [selecionada, setSelecionada] = useState(null)

  const filtros = useMemo(() => ({
    busca,
    status: filtroStatus,
    consultora: filtroConsultora,
  }), [busca, filtroStatus, filtroConsultora])

  const { conversas } = useConversas(filtros)
  const mensagens = selecionada ? (MENSAGENS[selecionada.id] || []) : []

  return (
    <div className="flex h-full overflow-hidden">
      {/* Coluna esquerda */}
      <div className="w-[280px] shrink-0 flex flex-col border-r border-slate-200 bg-white">
        {/* Filtros */}
        <div className="p-2 border-b border-slate-100 space-y-1.5">
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded px-2 py-1.5">
            <Search size={12} className="text-slate-400 shrink-0" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar conversa..."
              className="bg-transparent text-[12px] outline-none flex-1 placeholder-slate-400"
            />
          </div>
          <div className="flex gap-1.5">
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              className="flex-1 text-[11px] border border-slate-200 rounded px-1.5 py-1 bg-white text-slate-600 outline-none"
            >
              <option value="">Todos status</option>
              {STATUS_OPTIONS.filter(Boolean).map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <select
              value={filtroConsultora}
              onChange={e => setFiltroConsultora(e.target.value)}
              className="flex-1 text-[11px] border border-slate-200 rounded px-1.5 py-1 bg-white text-slate-600 outline-none"
            >
              <option value="">Todas</option>
              {CONSULTORAS.filter(c => c.ativo).map(c => (
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">{conversas.length} conversa{conversas.length !== 1 ? 's' : ''}</span>
            <button className="text-[10px] text-blue-500 hover:text-blue-700">Limpar filtros</button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {conversas.length === 0 && (
            <p className="text-center text-[12px] text-slate-400 mt-8">Nenhuma conversa encontrada</p>
          )}
          {conversas.map(c => (
            <ConversaItem
              key={c.id}
              conversa={c}
              selected={selecionada?.id === c.id}
              onClick={() => setSelecionada(c)}
            />
          ))}
        </div>
      </div>

      {/* Coluna centro */}
      <div className="flex-1 flex flex-col bg-slate-50 min-w-0">
        {!selecionada ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <SlidersHorizontal size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-[13px]">Selecione uma conversa</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header da conversa */}
            <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
              <div>
                <p className="text-[13px] font-semibold text-slate-800">{selecionada.contato_nome}</p>
                <p className="text-[11px] text-slate-400">{selecionada.contato_numero} · {selecionada.consultora}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selecionada.status} />
                <span className="text-[11px] text-slate-400">{selecionada.total_mensagens} msgs</span>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {mensagens.length === 0 && (
                <p className="text-center text-[12px] text-slate-400 mt-4">Nenhuma mensagem carregada para esta conversa.</p>
              )}
              {mensagens.map(m => (
                <ChatBubble key={m.id} mensagem={m} />
              ))}
            </div>

            {/* Nota interna */}
            <div className="shrink-0 border-t border-slate-200 bg-white p-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 shrink-0">📝 Nota interna</span>
                <input
                  placeholder="Adicionar anotação sobre esta conversa..."
                  className="flex-1 text-[12px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none placeholder-slate-400 focus:border-blue-300"
                />
                <button className="px-3 py-1.5 bg-slate-800 text-white text-[11px] rounded hover:bg-slate-700 transition-colors">
                  Salvar
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Coluna direita — Painel IA */}
      <div className="w-[300px] shrink-0 flex flex-col border-l border-slate-200 bg-white overflow-hidden">
        <div className="shrink-0 px-3 py-2 border-b border-slate-100">
          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Análise IA</p>
        </div>
        <PainelIA conversa={selecionada} />
      </div>
    </div>
  )
}
