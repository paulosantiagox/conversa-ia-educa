import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Flame, Bell, TrendingUp, Trophy,
  Sparkles, Brain, Tag, ChevronLeft, ChevronRight, Zap
} from 'lucide-react'
import { ALERTAS, CONVERSAS, FOLLOWUPS } from '../../lib/mockData'

const alertasAtivos = ALERTAS.filter(a => !a.lido).length
const conversasAbertas = CONVERSAS.filter(c => c.status !== 'vendido' && c.status !== 'perdido').length
const leadsQuentes = CONVERSAS.filter(c => c.classificacao_ia === 'quente').length
const followupsPendentes = FOLLOWUPS.filter(f => f.status === 'pendente').length

const NAV = [
  {
    section: 'VISÃO GERAL',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'CONVERSAS',
    items: [
      { to: '/inbox', label: 'Inbox', icon: MessageSquare, badge: conversasAbertas },
      { to: '/leads-quentes', label: 'Leads Quentes', icon: Flame, badge: leadsQuentes, badgeColor: 'bg-red-500' },
      { to: '/alertas', label: 'Alertas', icon: Bell, badge: alertasAtivos, badgeColor: 'bg-orange-500' },
    ],
  },
  {
    section: 'COMERCIAL',
    items: [
      { to: '/funil', label: 'Funil', icon: TrendingUp },
      { to: '/ranking', label: 'Ranking', icon: Trophy },
      { to: '/followup', label: 'Follow-up IA', icon: Sparkles, badge: followupsPendentes, badgeColor: 'bg-purple-500' },
    ],
  },
  {
    section: 'ANÁLISE',
    items: [
      { to: '/insights', label: 'Insights', icon: Brain },
      { to: '/marcacoes', label: 'Marcações', icon: Tag },
    ],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const width = collapsed ? 52 : 220

  return (
    <aside
      className="flex flex-col h-screen shrink-0 transition-all duration-200 sidebar-scrollbar overflow-y-auto"
      style={{ width, backgroundColor: '#0f172a', borderRight: '1px solid #1e293b' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-800" style={{ minHeight: 44 }}>
        <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center shrink-0">
          <Zap size={14} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-white text-[13px] font-bold leading-none">ConversIA</p>
            <p className="text-slate-500 text-[10px]">EJA Educa Brasil</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {NAV.map(({ section, items }) => (
          <div key={section} className="mb-1">
            {!collapsed && (
              <p className="px-3 py-1 text-[10px] font-semibold tracking-widest text-slate-600 uppercase">{section}</p>
            )}
            {items.map(({ to, label, icon: Icon, badge, badgeColor = 'bg-blue-500' }) => {
              const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
              return (
                <NavLink
                  key={to}
                  to={to}
                  title={collapsed ? label : undefined}
                  className={`flex items-center gap-2.5 mx-1 px-2 py-1.5 rounded text-[12px] transition-colors relative ${
                    isActive
                      ? 'bg-slate-800 text-white border-l-2 border-blue-500'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{label}</span>}
                  {!collapsed && badge > 0 && (
                    <span className={`text-[10px] ${badgeColor} text-white rounded-full px-1.5 min-w-[18px] text-center leading-5`}>
                      {badge}
                    </span>
                  )}
                  {collapsed && badge > 0 && (
                    <span className={`absolute top-0 right-0 w-2 h-2 rounded-full ${badgeColor}`} />
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Collapse button */}
      <div className="border-t border-slate-800 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-1.5 text-slate-500 hover:text-slate-300 text-[11px] rounded hover:bg-slate-800 transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Recolher</span></>}
        </button>
      </div>
    </aside>
  )
}
