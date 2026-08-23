import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login({ username, password })
      navigate('/dashboard')
    } catch {
      setError('Credenciais inválidas. Verifique usuário e senha.')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = async (u: string, p: string) => {
    setUsername(u)
    setPassword(p)
    setError(null)
    setLoading(true)
    try {
      await login({ username: u, password: p })
      navigate('/dashboard')
    } catch {
      setError('Falha ao autenticar com usuário de demonstração.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SHM 2.0</h1>
          <p className="text-xs text-slate-500 font-medium">Support Hours Manager — Governança de Contratos Técnicos</p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Usuário</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: admin ou gerente.acme"
              className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xl shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Entrando...' : 'Acessar Plataforma'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
            Acesso Rápido para Demonstração
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => quickLogin('gerente.acme', 'cliente123')}
              className="text-left p-2.5 bg-indigo-50/60 hover:bg-indigo-100 rounded-xl border border-indigo-100 transition text-xs"
            >
              <div className="font-bold text-indigo-900">Gerente Cliente</div>
              <div className="text-[10px] text-indigo-600">Aprova & Aceita Horas</div>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('admin', 'admin123')}
              className="text-left p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition text-xs"
            >
              <div className="font-bold text-slate-900">Admin Empresa</div>
              <div className="text-[10px] text-slate-600">Visão Geral & Contratos</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}