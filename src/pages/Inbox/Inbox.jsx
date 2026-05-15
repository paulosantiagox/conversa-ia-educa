import { useState, useMemo, useEffect, useRef } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Search, SlidersHorizontal, ChevronDown, Copy } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ConversaItem } from '../../components/shared/ConversaItem'
import { ChatBubble } from '../../components/shared/ChatBubble'
import { PainelIA } from '../../components/shared/PainelIA'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { SkeletonList } from '../../components/shared/SkeletonLoader'
import { useConversas } from '../../hooks/useConversas'
import { useMensagens } from '../../hooks/useMensagens'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'
import { getScoreColor } from '../../lib/utils'

const CLASS_OPTIONS = ['', 'quente', 'morno', 'frio', 'vendido', 'perdido']

function DivisorDia({ data }) {
  const label = isToday(data) ? 'Hoje'
    : isYesterday(data) ? 'Ontem'
    : format(data, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
  return (
    <div className="flex items-center gap-2 my-3">
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}

function SkeletonBubble({ right }) {
  return (
    <div className={`flex ${right ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`h-8 rounded-lg animate-pulse ${right ? 'bg-blue-200 dark:bg-blue-900' : 'bg-slate-200 dark:bg-slate-700'}`}
        style={{ width: `${120 + Math.random() * 80}px` }} />
    </div>
  )
}

export function Inbox() {
  const toast = useToast()
  const [nota, setNota] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroClassificacao, setFiltroClassificacao] = useState('')
  const [filtroConsultora, setFiltroConsultora] = useState('')
  const [consultoras, setConsultoras] = useState([])
  const mensagensEndRef = useRef(null)
  const mensagensContainerRef = useRef(null)

  // Buscar consultoras únicas do banco
  useEffect(() => {
    supabase
      .from('ci_conversas')
      .select('consultora')
      .not('consultora', 'is', null)
      .then(({ data }) => {
        if (!data) return
        const unicas = [...new Set(data.map(r => r.consultora).filter(Boolean))].sort()
        setConsultoras(unicas)
      })
  }, [])

  const filtros = useMemo(() => ({
    busca,
    classificacao: filtroClassificacao,
    consultora: filtroConsultora,
  }), [busca, filtroClassificacao, filtroConsultora])

  const { conversas, loading: loadingConversas } = useConversas(filtros)
  const [skeletonDone, setSkeletonDone] = useState(false)
  useEffect(() => { const t = setTimeout(() => setSkeletonDone(true), 800); return () => clearTimeout(t) }, [])
  const showSkeleton = !skeletonDone || loadingConversas

  const [conversaSelecionada, setConversaSelecionada] = useState(null)
  const [statusLocal, setStatusLocal] = useState(null)
  const statusAtual = statusLocal ?? conversaSelecionada?.classificacao_ia

  // useMensagens hook
  const { mensagens, loading: loadingMensagens } = useMensagens(conversaSelecionada?.id)

  // Scroll para fim quando mensagens carregam
  useEffect(() => {
    if (!loadingMensagens && mensagens.length > 0) {
      setTimeout(() => {
        const el = mensagensContainerRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 50)
    }
  }, [mensagens, loadingMensagens])

  useEffect(() => { setStatusLocal(null) }, [conversaSelecionada?.id])

  function handleSelectConversa(c) {
    setConversaSelecionada(c)
  }

  function handleAnaliseAtualizada(conversaAtualizada) {
    setConversaSelecionada(conversaAtualizada)
  }

  function limparFiltros() {
    setBusca('')
    setFiltroClassificacao('')
    setFiltroConsultora('')
  }

  const scoreColor = getScoreColor(conversaSelecionada?.score_ia)

  return (
    <div className="flex h-full overflow-hidden">
      {/* ─── Coluna esquerda — lista ─── */}
      <div className="w-[280px] shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="p-2 border-b border-slate-100 dark:border-slate-700 space-y-1.5">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5">
            <Search size={12} className="text-slate-400 shrink-0" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar conversa..."
              className="bg-transparent text-[12px] outline-none flex-1 placeholder-slate-400 text-slate-700 dark:text-slate-200"
            />
          </div>
          <div className="flex gap-1.5">
            <select
              value={filtroClassificacao}
              onChange={e => setFiltroClassificacao(e.target.value)}
              className="flex-1 text-[11px] border border-slate-200 dark:border-slate-600 rounded px-1.5 py-1 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 outline-none"
            >
              <option value="">Todas classificações</option>
              {CLASS_OPTIONS.filter(Boolean).map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <select
              value={filtroConsultora}
              onChange={e => setFiltroConsultora(e.target.value)}
              className="flex-1 text-[11px] border border-slate-200 dark:border-slate-600 rounded px-1.5 py-1 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 outline-none"
            >
              <option value="">Todas</option>
              {consultoras.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">{conversas.length} conversa{conversas.length !== 1 ? 's' : ''}</span>
            <button onClick={limparFiltros} className="text-[10px] text-blue-500 hover:text-blue-700">Limpar filtros</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showSkeleton ? (
            <SkeletonList count={5} />
          ) : conversas.length === 0 ? (
            <p className="text-center text-[12px] text-slate-400 mt-8">Nenhuma conversa encontrada</p>
          ) : (
            conversas.map(c => (
              <ConversaItem
                key={c.id}
                conversa={c}
                selected={conversaSelecionada?.id === c.id}
                onClick={() => handleSelectConversa(c)}
              />
            ))
          )}
        </div>
      </div>

      {/* ─── Coluna centro — chat ─── */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 min-w-0">
        {!conversaSelecionada ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <SlidersHorizontal size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-[13px]">Selecione uma conversa</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header da conversa */}
            <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                    {conversaSelecionada.contato_nome || conversaSelecionada.contato_numero}
                  </p>
                  {conversaSelecionada.score_ia != null && (
                    <span
                      className="text-[11px] font-bold px-1.5 py-0.5 rounded border"
                      style={{ color: scoreColor, borderColor: scoreColor + '40', background: scoreColor + '10' }}
                    >
                      Score {conversaSelecionada.score_ia}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <button
                    onClick={() => {
                      if (conversaSelecionada.contato_numero) {
                        navigator.clipboard.writeText(conversaSelecionada.contato_numero)
                        toast.success('Número copiado')
                      }
                    }}
                    title="Clique para copiar"
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Copy size={9} />
                    {conversaSelecionada.contato_numero}
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-[11px] text-slate-400">{conversaSelecionada.consultora ?? 'Sem atendente'}</span>
                  {conversaSelecionada.ultima_mensagem_at && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(conversaSelecionada.ultima_mensagem_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="flex items-center gap-1 outline-none">
                      <StatusBadge status={statusAtual} />
                      <ChevronDown size={11} className="text-slate-400" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] shadow-lg py-1 min-w-[140px]"
                      align="end"
                      sideOffset={4}
                    >
                      {CLASS_OPTIONS.filter(Boolean).map(s => (
                        <DropdownMenu.Item
                          key={s}
                          onSelect={() => {
                            setStatusLocal(s)
                            toast.success(`Status alterado para ${s.charAt(0).toUpperCase() + s.slice(1)}`)
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer outline-none"
                        >
                          <StatusBadge status={s} size="xs" />
                          <span className="capitalize">{s}</span>
                          {s === statusAtual && <span className="ml-auto text-blue-500 text-[10px]">✓</span>}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
                <span className="text-[11px] text-slate-400">{conversaSelecionada.total_mensagens ?? 0} msgs</span>
              </div>
            </div>

            {/* Mensagens */}
            <div ref={mensagensContainerRef} className="flex-1 overflow-y-auto px-4 py-3">
              {loadingMensagens ? (
                <div>
                  <SkeletonBubble right={false} />
                  <SkeletonBubble right={true} />
                  <SkeletonBubble right={false} />
                  <SkeletonBubble right={true} />
                  <SkeletonBubble right={false} />
                </div>
              ) : mensagens.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                    Nenhuma mensagem sincronizada ainda.
                  </p>
                  <p className="text-[12px] text-slate-400 dark:text-slate-500">
                    Vá em <strong>Sync DataCrazy → Sync de Mensagens</strong> para importar.
                  </p>
                </div>
              ) : (
                <>
                  {mensagens.map((msg, index) => {
                    const dataAtual = msg.enviado_at ? new Date(msg.enviado_at) : null
                    const dataAnterior = index > 0 && mensagens[index - 1].enviado_at
                      ? new Date(mensagens[index - 1].enviado_at)
                      : null
                    const mudouDia = dataAtual && (
                      !dataAnterior ||
                      dataAtual.toDateString() !== dataAnterior.toDateString()
                    )
                    return (
                      <div key={msg.id}>
                        {mudouDia && <DivisorDia data={dataAtual} />}
                        <ChatBubble mensagem={msg} />
                      </div>
                    )
                  })}
                  <div ref={mensagensEndRef} />
                </>
              )}
            </div>

            {/* Nota interna */}
            <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 shrink-0">📝 Nota interna</span>
                <input
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  placeholder="Adicionar anotação sobre esta conversa..."
                  className="flex-1 text-[12px] bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 outline-none placeholder-slate-400 text-slate-700 dark:text-slate-200 focus:border-blue-300 dark:focus:border-blue-500"
                />
                <button
                  onClick={() => { if (nota.trim()) { toast.success('Nota salva'); setNota('') } else { toast.error('Digite uma nota antes de salvar') } }}
                  className="px-3 py-1.5 bg-slate-800 dark:bg-slate-600 text-white text-[11px] rounded hover:bg-slate-700 dark:hover:bg-slate-500 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── Coluna direita — Painel IA ─── */}
      <div className="w-[300px] shrink-0 flex flex-col border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="shrink-0 px-3 py-2 border-b border-slate-100 dark:border-slate-700">
          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Análise IA</p>
        </div>
        <PainelIA
          conversa={conversaSelecionada}
          onAnaliseAtualizada={handleAnaliseAtualizada}
        />
      </div>
    </div>
  )
}
