import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag, RefreshCw, Eye, Copy, Play, Search, Filter } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { syncTagsModo } from '../../lib/syncTags'

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const MODOS = [
  { key: 'teste', label: 'Teste (200)' },
  { key: 'recentes', label: 'Recentes (2 mil)' },
  { key: 'completo', label: 'Completo (todos)' },
]

export function Marcacoes() {
  const navigate = useNavigate()
  const toast = useToast()
  const [resumo, setResumo] = useState([])
  const [linhas, setLinhas] = useState([])
  const [tagFiltro, setTagFiltro] = useState(null)
  const [soAtivas, setSoAtivas] = useState(true)
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modo, setModo] = useState('recentes')
  const [rodando, setRodando] = useState(false)
  const [syncLog, setSyncLog] = useState('')
  const cancelRef = useRef(false)

  const carregar = useCallback(async () => {
    let q = supabase.from('ci_tags_conversas')
      .select('id, contato_final8, contato_numero, tag_nome, tag_cor, primeira_vez_em, ultima_vez_em, ativa, conversa_id, contato_nome, consultora, classificacao_ia, score_ia')
      .order('ultima_vez_em', { ascending: false }).limit(500)
    if (soAtivas) q = q.eq('ativa', true)
    if (tagFiltro) q = q.eq('tag_nome', tagFiltro)
    if (busca.trim()) q = q.or(`contato_nome.ilike.%${busca.trim()}%,contato_numero.ilike.%${busca.trim()}%`)
    const [{ data: res }, { data: lista }] = await Promise.all([
      supabase.rpc('get_tags_resumo'),
      q,
    ])
    setResumo(res ?? [])
    setLinhas(lista ?? [])
  }, [soAtivas, tagFiltro, busca])

  useEffect(() => { setLoading(true); carregar().finally(() => setLoading(false)) }, [carregar])

  async function sincronizar() {
    if (rodando) return
    cancelRef.current = false
    setRodando(true)
    setSyncLog('Iniciando…')
    try {
      const r = await syncTagsModo(modo, (msg) => setSyncLog(msg), () => cancelRef.current)
      toast.success(`Tags: ${r.comTags} leads · ${r.tagsGravadas} tags`)
      await carregar()
    } catch (err) {
      toast.error('Erro: ' + err.message)
    } finally {
      setRodando(false)
    }
  }

  function copiar(txt) { navigator.clipboard.writeText(txt); toast.success('Copiado!') }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Marcações (Tags)" />
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900">

        {/* Barra de sync */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] px-3 py-2.5 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mr-1">
            <Tag size={13} /> Sincronizar tags do DataCrazy
          </span>
          {MODOS.map(m => (
            <button key={m.key} onClick={() => setModo(m.key)} disabled={rodando}
              className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors disabled:opacity-50 ${
                modo === m.key ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-blue-400'
              }`}>{m.label}</button>
          ))}
          {rodando ? (
            <button onClick={() => { cancelRef.current = true }} className="px-3 py-1 rounded text-[11px] font-medium bg-red-50 border border-red-200 text-red-600">Parar</button>
          ) : (
            <button onClick={sincronizar} className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-700">
              <Play size={11} /> Sincronizar
            </button>
          )}
          {syncLog && <span className="text-[10px] text-slate-400 truncate max-w-[35%]">{rodando && <RefreshCw size={9} className="inline animate-spin mr-1" />}{syncLog}</span>}
          <span className="ml-auto text-[10px] text-slate-400">Auto-sync já inclui tags a cada 10 min</span>
        </div>

        {/* Cards por tag */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTagFiltro(null)}
            className={`border rounded-[6px] px-3 py-2 text-left min-w-[120px] transition-all ${
              tagFiltro === null ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-offset-1 ring-blue-400' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Todas</p>
            <p className="text-[18px] font-bold text-slate-800 dark:text-slate-100">{resumo.reduce((s, r) => s + Number(r.ativas || 0), 0)}</p>
            <p className="text-[10px] text-slate-400">tags ativas</p>
          </button>
          {resumo.map(r => (
            <button key={r.tag_nome} onClick={() => setTagFiltro(tagFiltro === r.tag_nome ? null : r.tag_nome)}
              className={`border rounded-[6px] px-3 py-2 text-left min-w-[140px] transition-all ${
                tagFiltro === r.tag_nome ? 'ring-2 ring-offset-1 ring-blue-400 bg-slate-50 dark:bg-slate-700/50 border-slate-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50'
              }`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.tag_cor || '#94a3b8' }} />
                <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[110px]" title={r.tag_nome}>{r.tag_nome}</p>
              </div>
              <p className="text-[18px] font-bold text-slate-800 dark:text-slate-100">{r.ativas}</p>
              <p className="text-[10px] text-slate-400">{r.leads} leads</p>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 flex-1 max-w-[280px]">
            <Search size={12} className="text-slate-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar contato/número…"
              className="text-[12px] bg-transparent outline-none flex-1 text-slate-700 dark:text-slate-200" />
          </div>
          <button onClick={() => setSoAtivas(s => !s)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border ${
              soAtivas ? 'bg-green-50 border-green-200 text-green-600' : 'border-slate-200 text-slate-500'
            }`}>
            <Filter size={11} /> {soAtivas ? 'Só ativas' : 'Todas (incl. removidas)'}
          </button>
          <span className="ml-auto text-[11px] text-slate-400">{loading ? '…' : `${linhas.length} marcações`}</span>
          <button onClick={carregar} disabled={loading} className="text-slate-400 hover:text-blue-500 disabled:opacity-50"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /></button>
        </div>

        {/* Tabela */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16"><RefreshCw size={18} className="animate-spin text-slate-400" /></div>
          ) : linhas.length === 0 ? (
            <p className="text-center text-[12px] text-slate-400 py-12">Nenhuma tag encontrada. Rode a sincronização acima (Completo pega tudo).</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Contato</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Tag</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Recebeu em</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Última vez</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Consultora</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Conversa</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map(l => (
                    <tr key={l.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-3 py-2.5">
                        <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200">{l.contato_nome || '—'}</p>
                        {l.contato_numero && (
                          <button onClick={() => copiar(l.contato_numero)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-500 font-mono"><Copy size={9} /> {l.contato_numero}</button>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: (l.tag_cor || '#94a3b8') + '22', color: l.tag_cor || '#64748b' }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.tag_cor || '#94a3b8' }} />
                          {l.tag_nome}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-500 whitespace-nowrap">{fmtData(l.primeira_vez_em)}</td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-400 whitespace-nowrap">{fmt(l.ultima_vez_em)}</td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-500 whitespace-nowrap">{l.consultora ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        {l.ativa
                          ? <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">ativa</span>
                          : <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">removida</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {l.conversa_id ? (
                          <button onClick={() => navigate(`/inbox?id=${l.conversa_id}`)}
                            className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] text-slate-600 hover:bg-slate-50 whitespace-nowrap">
                            <Eye size={10} /> Ver
                          </button>
                        ) : <span className="text-[10px] text-slate-300">sem conversa</span>}
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
