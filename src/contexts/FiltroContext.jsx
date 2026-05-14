import { createContext, useContext, useState } from 'react'

const FiltroContext = createContext(null)

export function FiltroProvider({ children }) {
  const [filtros, setFiltros] = useState({
    status: '',
    consultora: '',
    classificacao: '',
    periodo: '7d',
    busca: '',
  })

  const [conversaSelecionada, setConversaSelecionada] = useState(null)

  function atualizarFiltro(key, value) {
    setFiltros(prev => ({ ...prev, [key]: value }))
  }

  function resetarFiltros() {
    setFiltros({ status: '', consultora: '', classificacao: '', periodo: '7d', busca: '' })
  }

  return (
    <FiltroContext.Provider value={{
      filtros,
      atualizarFiltro,
      resetarFiltros,
      conversaSelecionada,
      setConversaSelecionada,
    }}>
      {children}
    </FiltroContext.Provider>
  )
}

export function useFiltros() {
  const ctx = useContext(FiltroContext)
  if (!ctx) throw new Error('useFiltros must be used within FiltroProvider')
  return ctx
}
