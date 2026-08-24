import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { DetalhePedidoPage } from './pages/DetalhePedidoPage'
import { NovoPedidoPage } from './pages/NovoPedidoPage'
import { ExtratoContratoPage } from './pages/ExtratoContratoPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AnalisePedidoPage } from './pages/AnalisePedidoPage'
import { ExecucaoCicloPage } from './pages/ExecucaoCicloPage'
import { MagicLinkPage } from './pages/MagicLinkPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Carregando SHM...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Carregando SHM...</div>
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/pedidos/novo" element={<ProtectedRoute><NovoPedidoPage /></ProtectedRoute>} />
            <Route path="/pedidos/:id" element={<ProtectedRoute><DetalhePedidoPage /></ProtectedRoute>} />
            <Route path="/contratos/:id/extrato" element={<ProtectedRoute><ExtratoContratoPage /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
            <Route path="/admin/pedidos/:id/analise" element={<ProtectedRoute><AnalisePedidoPage /></ProtectedRoute>} />
            <Route path="/admin/ciclos/:id/execucao" element={<ProtectedRoute><ExecucaoCicloPage /></ProtectedRoute>} />
            <Route path="/publico/ciclo/:token" element={<MagicLinkPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}