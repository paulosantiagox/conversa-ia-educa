import { useState, useEffect } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Settings, Users, Bell, Monitor, CheckCircle, XCircle, Save } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { CONSULTORAS } from '../../lib/mockData'
import { useToast } from '../../contexts/ToastContext'

const WHATSAPP_MAP = {
  c1: '+55 11 99001-1111',
  c2: '+55 11 99001-2222',
  c3: '+55 11 99001-3333',
  c4: '+55 11 99001-4444',
  c5: '+55 11 99001-5555',
}

const REGRAS_PADRAO = [
  { id: 'r1', label: 'Alerta: sem resposta após', campo: 'sem_resposta_h', valor: 24, sufixo: 'horas', tipo: 'number', min: 1, max: 72 },
  { id: 'r2', label: 'Score mínimo para lead quente', campo: 'score_quente', valor: 70, sufixo: 'pontos', tipo: 'number', min: 1, max: 100 },
  { id: 'r3', label: 'Chance de fechamento mínima', campo: 'chance_min', valor: 60, sufixo: '%', tipo: 'number', min: 1, max: 100 },
  { id: 'r4', label: 'Follow-up automático após', campo: 'followup_h', valor: 48, sufixo: 'horas sem resposta', tipo: 'number', min: 1, max: 168 },
  { id: 'r5', label: 'Máximo de conversas por consultora', campo: 'max_conversas', valor: 30, sufixo: 'conversas ativas', tipo: 'number', min: 1, max: 200 },
]

function TabConsultoras() {
  const [consultoras, setConsultoras] = useState(() =>
    CONSULTORAS.map(c => ({ ...c, whatsapp: WHATSAPP_MAP[c.id] ?? '' }))
  )
  const toast = useToast()

  function toggleAtivo(id) {
    setConsultoras(prev => prev.map(c => c.id === id ? { ...c, ativo: !c.ativo } : c))
    const c = consultoras.find(x => x.id === id)
    toast.success(`${c.nome} ${c.ativo ? 'desativada' : 'ativada'} com sucesso`)
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
        <Users size={13} className="text-blue-500" />
        <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Consultoras cadastradas</p>
        <span className="ml-auto text-[11px] text-slate-400">{consultoras.filter(c => c.ativo).length} ativas</span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nome</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">WhatsApp</th>
            <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
            <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Ação</th>
          </tr>
        </thead>
        <tbody>
          {consultoras.map(c => (
            <tr key={c.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${c.ativo ? 'bg-blue-500' : 'bg-slate-400'}`}>
                    {c.nome[0]}
                  </div>
                  <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">{c.nome}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-[12px] text-slate-500 dark:text-slate-400">{c.whatsapp}</td>
              <td className="px-3 py-2 text-center">
                {c.ativo
                  ? <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-medium"><CheckCircle size={11} /> Ativa</span>
                  : <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium"><XCircle size={11} /> Inativa</span>
                }
              </td>
              <td className="px-3 py-2 text-center">
                <button
                  onClick={() => toggleAtivo(c.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    c.ativo
                      ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
                      : 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50'
                  }`}
                >
                  {c.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TabRegras() {
  const toast = useToast()
  const [regras, setRegras] = useState(() => {
    try {
      const saved = localStorage.getItem('conversia:regras_alerta')
      if (saved) return JSON.parse(saved)
    } catch {}
    return REGRAS_PADRAO
  })

  function handleChange(id, novoValor) {
    setRegras(prev => prev.map(r => r.id === id ? { ...r, valor: Number(novoValor) } : r))
  }

  function salvar() {
    try {
      localStorage.setItem('conversia:regras_alerta', JSON.stringify(regras))
      toast.success('Regras de alerta salvas com sucesso')
    } catch {
      toast.error('Erro ao salvar regras')
    }
  }

  function restaurar() {
    setRegras(REGRAS_PADRAO)
    localStorage.removeItem('conversia:regras_alerta')
    toast.info('Regras restauradas para o padrão')
  }

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <Bell size={13} className="text-orange-500" />
          <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Regras de alerta e automação</p>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {regras.map(r => (
            <div key={r.id} className="px-3 py-2.5 flex items-center justify-between gap-4">
              <label className="text-[12px] text-slate-600 dark:text-slate-300 flex-1">{r.label}</label>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={r.min}
                  max={r.max}
                  value={r.valor}
                  onChange={e => handleChange(r.id, e.target.value)}
                  className="w-16 px-2 py-1 text-[12px] text-center border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-400"
                />
                <span className="text-[11px] text-slate-400 w-32">{r.sufixo}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={restaurar}
          className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-[12px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Restaurar padrão
        </button>
        <button
          onClick={salvar}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[12px] font-medium transition-colors"
        >
          <Save size={12} /> Salvar regras
        </button>
      </div>
    </div>
  )
}

function TabSistema() {
  const toast = useToast()
  const [useMock, setUseMock] = useState(false)

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <Monitor size={13} className="text-blue-500" />
          <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Configurações do sistema</p>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
          <div className="px-3 py-3 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200">Modo de dados</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {useMock
                  ? 'Usando dados mockados (desenvolvimento)'
                  : 'Conectado ao Supabase (produção)'}
              </p>
            </div>
            <button
              onClick={() => { setUseMock(v => !v); toast.info('Reinicie o servidor para aplicar a mudança') }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useMock ? 'bg-amber-500' : 'bg-blue-600'}`}
            >
              <span className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${useMock ? 'translate-x-1' : 'translate-x-4'}`} />
            </button>
          </div>
          <div className="px-3 py-3 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200">Versão do sistema</p>
              <p className="text-[11px] text-slate-400 mt-0.5">ConversIA v1.0.0</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 rounded font-medium">Estável</span>
          </div>
          <div className="px-3 py-3 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200">Último sync Supabase</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Hoje, 14:32 — 847 conversas sincronizadas</p>
            </div>
            <button
              onClick={() => toast.info('Sincronização iniciada...')}
              className="px-2.5 py-1 border border-slate-200 dark:border-slate-600 rounded text-[11px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Sincronizar
            </button>
          </div>
          <div className="px-3 py-3 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200">Projeto Supabase</p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">dfrfeirfllwmdkenylwk · schema: conversa_ia</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-green-500" title="Conectado" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function Configuracoes() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Configurações" />
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900">
        <Tabs.Root defaultValue="consultoras">
          <Tabs.List className="flex items-center gap-1 mb-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] p-1">
            {[
              { value: 'consultoras', label: 'Consultoras', icon: Users },
              { value: 'regras', label: 'Regras de Alerta', icon: Bell },
              { value: 'sistema', label: 'Sistema', icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-800 dark:data-[state=active]:text-slate-100"
              >
                <Icon size={12} />
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Tabs.Content value="consultoras"><TabConsultoras /></Tabs.Content>
          <Tabs.Content value="regras"><TabRegras /></Tabs.Content>
          <Tabs.Content value="sistema"><TabSistema /></Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  )
}
