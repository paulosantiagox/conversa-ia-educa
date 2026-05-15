import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { BuscaGlobal } from '../shared/BuscaGlobal'

export function MainLayout({ children }) {
  const [buscaAberta, setBuscaAberta] = useState(false)

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setBuscaAberta(prev => !prev)
      }
    }
    function onEvento() { setBuscaAberta(true) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('conversia:open-busca', onEvento)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('conversia:open-busca', onEvento)
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
      <BuscaGlobal aberto={buscaAberta} onFechar={() => setBuscaAberta(false)} />
    </div>
  )
}
