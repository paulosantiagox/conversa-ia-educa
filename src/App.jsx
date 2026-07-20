import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { FiltroProvider } from './contexts/FiltroContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { SyncProvider } from './contexts/SyncContext'
import { Dashboard } from './pages/Dashboard/Dashboard'
import { Inbox } from './pages/Inbox/Inbox'
import { LeadsQuentes } from './pages/LeadsQuentes/LeadsQuentes'
import { Funil } from './pages/Funil/Funil'
import { Ranking } from './pages/Ranking/Ranking'
import { Insights } from './pages/Insights/Insights'
import { Alertas } from './pages/Alertas/Alertas'
import { Marcacoes } from './pages/Marcacoes/Marcacoes'
import { FollowUp } from './pages/FollowUp/FollowUp'
import { Configuracoes } from './pages/Configuracoes/Configuracoes'
import { Sync } from './pages/Sync/Sync'
import { AnaliseIA } from './pages/AnaliseIA/AnaliseIA'
import { Custos } from './pages/Custos/Custos'
import { Matriculados } from './pages/Matriculados/Matriculados'
import { AcaoFimMes } from './pages/AcaoFimMes/AcaoFimMes'
import { Vendas } from './pages/Vendas/Vendas'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <ToastProvider>
      <SyncProvider>
      <FiltroProvider>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/leads-quentes" element={<LeadsQuentes />} />
            <Route path="/funil" element={<Funil />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/alertas" element={<Alertas />} />
            <Route path="/marcacoes" element={<Marcacoes />} />
            <Route path="/followup" element={<FollowUp />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/sync" element={<Sync />} />
            <Route path="/analise-ia" element={<AnaliseIA />} />
            <Route path="/custos" element={<Custos />} />
            <Route path="/matriculados" element={<Matriculados />} />
            <Route path="/acao-fim-mes" element={<AcaoFimMes />} />
            <Route path="/vendas" element={<Vendas />} />
          </Routes>
        </MainLayout>
      </FiltroProvider>
      </SyncProvider>
      </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
