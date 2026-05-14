import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { FiltroProvider } from './contexts/FiltroContext'
import { Dashboard } from './pages/Dashboard/Dashboard'
import { Inbox } from './pages/Inbox/Inbox'
import { LeadsQuentes } from './pages/LeadsQuentes/LeadsQuentes'
import { Funil } from './pages/Funil/Funil'
import { Ranking } from './pages/Ranking/Ranking'
import { Insights } from './pages/Insights/Insights'
import { Alertas } from './pages/Alertas/Alertas'
import { Marcacoes } from './pages/Marcacoes/Marcacoes'
import { FollowUp } from './pages/FollowUp/FollowUp'

export default function App() {
  return (
    <BrowserRouter>
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
          </Routes>
        </MainLayout>
      </FiltroProvider>
    </BrowserRouter>
  )
}
