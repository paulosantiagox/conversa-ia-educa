import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Search, SlidersHorizontal, ChevronDown, Copy, RefreshCw, Sparkles, Send, X, AlertTriangle } from 'lucide-react'
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
import { getScoreColor } from '../../lib/utils'
import { gerarMensagemFollowUp, salvarFollowUp, marcarFollowUpEnviado } from '../../lib/gerarFollowUp'
import { enviarMensagem } from '../../lib/datacrazy'
import { supabase } from '../../lib/supabase'

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
  const [searchParams] = useSearchParams()
  const [nota, setNota] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroClassificacao, setFiltroClassificacao] = useState('')
  const [abaConsultora, setAbaConsultora] = useState('')
  const mensagensEndRef = useRef(null)
  const mensagensContainerRef = useRef(null)

  const filtros = useMemo(() => ({
    busca,
    classificacao: filtroClassificacao,
    consultora: abaConsultora,
  }), [busca, filtroClassificacao, abaConsultora])

  const { conversas, loading: loadingConversas, loadingMore, hasMore, total, loadMore, refresh } = useConversas(filtros)
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    refresh()
    setTimeout(() => setRefreshing(false), 800)
  }
  const [skeletonDone, setSkeletonDone] = useState(false)
  useEffect(() => { const t = setTimeout(() => setSkeletonDone(true), 800); return () => clearTimeout(t) }, [])
  const showSkeleton = !skeletonDone || loadingConversas

  const [conversaSelecionada, setConversaSelecionada] = useState(null)
  const [statusLocal, setStatusLocal] = useState(null)
  const statusAtual = statusLocal ?? conversaSelecionada?.classificacao_ia

  // Follow-up IA
  const [followUpAberto, setFollowUpAberto] = useState(false)
  const [followUpTexto, setFollowUpTexto] = useState('')
  const [followUpCarregando, setFollowUpCarregando] = useState(false)
  const [followUpEnviando, setFollowUpEnviando] = useState(false)
  const [followUpId, setFollowUpId] = useState(null)
  const [autoFollowUp] = useState(() => localStorage.getItem('conversia_followup_auto') === 'true')

  const janela24h = conversaSelecionada?.janela_24h_status
  const podeFollowUp = janela24h === 'aberta' || janela24h === 'critica'

  async function abrirFollowUp() {
    if (followUpCarregando) return
    setFollowUpAberto(true)
    setFollowUpTexto('')
    setFollowUpId(null)
    setFollowUpCarregando(true)
    try {
      const texto = await gerarMensagemFollowUp(conversaSelecionada, mensagens)
      if (!texto) { toast.error('Erro ao gerar mensagem'); setFollowUpAberto(false); return }
      setFollowUpTexto(texto)
      const saved = await salvarFollowUp(conversaSelecionada.id, texto)
      setFollowUpId(saved.id)
    } catch {
      toast.error('Erro ao gerar follow-up')
      setFollowUpAberto(false)
    } finally {
      setFollowUpCarregando(false)
    }
  }

  async function enviarFollowUp() {
    if (!followUpTexto.trim() || !conversaSelecionada?.datacrazy_id) return
    setFollowUpEnviando(true)
    try {
      await enviarMensagem(conversaSelecionada.datacrazy_id, followUpTexto.trim())
      if (followUpId) await marcarFollowUpEnviado(followUpId)
      toast.success('Follow-up enviado!')
      setFollowUpAberto(false)
      setFollowUpTexto('')
    } catch (err) {
      toast.error('Erro ao enviar: ' + err.message)
    } finally {
      setFollowUpEnviando(false)
    }
  }

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

  // Auto-selecionar conversa por URL param ?id=xxx (vindo da página Follow-up)
  useEffect(() => {
    const idParam = searchParams.get('id')
    if (!idParam) return
    const found = conversas.find(c => c.id === idParam)
    if (found) {
      setConversaSelecionada(found)
      return
    }
    // Conversa não está na lista paginada — busca diretamente pelo id
    supabase.from('ci_conversas').select('*').eq('id', idParam).maybeSingle()
      .then(({ data }) => { if (data) setConversaSelecionada(data) })
  }, [searchParams, conversas])

  useEffect(() => {
    setStatusLocal(null)
    setFollowUpAberto(false)
    setFollowUpTexto('')
  }, [conversaSelecionada?.id])

  function handleSelectConversa(c) {
    setConversaSelecionada(c)
  }

  function handleAnaliseAtualizada(conversaAtualizada) {
    setConversaSelecionada(conversaAtualizada)
  }

  function limparFiltros() {
    setBusca('')
    setFiltroClassificacao('')
    setAbaConsultora('')
  }

  const scoreColor = getScoreColor(conversaSelecionada?.score_ia)

  return (
    <div className="flex h-full overflow-hidden">
      {/* ─── Coluna esquerda — lista ─── */}
      <div className="w-[280px] shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {/* Abas por consultora */}
        <div className="flex border-b border-slate-100 dark:border-slate-700 px-1">
          {[
            { label: 'Todas', valor: '' },
            { label: 'Júlia', valor: 'Júlia Cristina ' },
            { label: 'Tatiane', valor: 'Tatiane Virmes' },
            { label: 'Ketlen', valor: 'Ketlen Michelly' },
          ].map(({ label, valor }) => (
            <button
              key={valor}
              onClick={() => setAbaConsultora(valor)}
              className={`px-3 py-1.5 text-[11px] font-medium border-b-2 transition-colors ${
                abaConsultora === valor
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

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
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              {total != null ? `${total.toLocaleString('pt-BR')} conversas` : '…'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                title="Atualizar lista"
                className="text-slate-400 hover:text-blue-500 transition-colors"
              >
                <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button onClick={limparFiltros} className="text-[10px] text-blue-500 hover:text-blue-700">Limpar filtros</button>
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto"
          onScroll={e => {
            const el = e.currentTarget
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && hasMore && !loadingMore) {
              loadMore()
            }
          }}
        >
          {showSkeleton ? (
            <SkeletonList count={5} />
          ) : conversas.length === 0 ? (
            <p className="text-center text-[12px] text-slate-400 mt-8">Nenhuma conversa encontrada</p>
          ) : (
            <>
              {conversas.map(c => (
                <ConversaItem
                  key={c.id}
                  conversa={c}
                  selected={conversaSelecionada?.id === c.id}
                  onClick={() => handleSelectConversa(c)}
                />
              ))}
              {loadingMore && (
                <div className="py-3 flex justify-center">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                </div>
              )}
              {!hasMore && conversas.length > 0 && (
                <p className="text-center text-[10px] text-slate-400 py-2">— fim —</p>
              )}
            </>
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
                {podeFollowUp && (
                  <button
                    onClick={followUpAberto ? () => setFollowUpAberto(false) : abrirFollowUp}
                    disabled={followUpCarregando}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                      janela24h === 'critica'
                        ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100'
                        : 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-100'
                    }`}
                  >
                    {followUpCarregando
                      ? <><RefreshCw size={10} className="animate-spin" /> Gerando...</>
                      : followUpAberto
                      ? <><X size={10} /> Fechar</>
                      : <><Sparkles size={10} /> Follow-up IA {janela24h === 'critica' ? '⚠' : ''}</>
                    }
                  </button>
                )}
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

            {/* Painel Follow-up IA */}
            {followUpAberto && !followUpCarregando && followUpTexto && (
              <div className="shrink-0 border-b border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                    <Sparkles size={12} />
                    Mensagem sugerida pela IA
                    {janela24h === 'critica' && (
                      <span className="flex items-center gap-1 text-red-500 font-normal">
                        <AlertTriangle size={10} /> Janela crítica — envie logo
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-purple-400">Edite antes de enviar</span>
                </div>
                <textarea
                  value={followUpTexto}
                  onChange={e => setFollowUpTexto(e.target.value)}
                  rows={3}
                  className="w-full text-[12px] bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded px-2.5 py-2 outline-none resize-none text-slate-700 dark:text-slate-200 focus:border-purple-400 dark:focus:border-purple-500"
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={abrirFollowUp}
                    className="text-[11px] text-purple-400 hover:text-purple-600 flex items-center gap-1"
                  >
                    <RefreshCw size={10} /> Regerar
                  </button>
                  <button
                    onClick={enviarFollowUp}
                    disabled={followUpEnviando || !followUpTexto.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-[11px] font-medium rounded transition-colors"
                  >
                    {followUpEnviando
                      ? <><RefreshCw size={10} className="animate-spin" /> Enviando...</>
                      : <><Send size={10} /> Enviar agora</>
                    }
                  </button>
                </div>
              </div>
            )}

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
