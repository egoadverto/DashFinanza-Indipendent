import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './lib/auth'
import { PrivacyProvider } from './lib/privacy'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Posizioni from './pages/Posizioni'
import Transazioni from './pages/Transazioni'
import Analisi from './pages/Analisi'
import Impostazioni from './pages/Impostazioni'
import Manuale from './pages/Manuale'

function AppGate() {
  const { session, loading } = useAuth()

  if (loading) return null
  if (!session) return <Login />

  return (
    <PrivacyProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="posizioni" element={<Posizioni />} />
            <Route path="transazioni" element={<Transazioni />} />
            <Route path="analisi" element={<Analisi />} />
            <Route path="impostazioni" element={<Impostazioni />} />
            <Route path="manuale" element={<Manuale />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PrivacyProvider>
  )
}

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
