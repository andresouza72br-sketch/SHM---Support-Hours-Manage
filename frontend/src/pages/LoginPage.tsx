import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, ArrowRight, Shield, UserCheck, Sparkles, Building2 } from 'lucide-react'
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
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col justify-center items-center p-4">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glass-panel-dark rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-800/80 relative z-10 space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-500 text-white rounded-2xl shadow-xl shadow-indigo-500/25 ring-4 ring-indigo-500/10">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/50 text-indigo-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Plataforma de Governança 2.0</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">SHM Portal</h1>
            <p className="text-xs text-slate-400 font-normal mt-1">Gestão, Orçamento & Aceite de Horas Técnicas</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs font-medium rounded-xl flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Usuário</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: gerente.acme ou admin"
              className="w-full text-sm bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? 'Autenticando...' : 'Acessar Plataforma'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
            Acesso Rápido para Demonstração (1-Clique)
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => quickLogin('gerente.acme', 'cliente123')}
              className="text-left p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl transition duration-150 group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs group-hover:text-indigo-300">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Gerente Cliente</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Aprova orçamentos e aceites</div>
            </button>

            <button
              type="button"
              onClick={() => quickLogin('admin', 'admin123')}
              className="text-left p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-violet-500/50 rounded-xl transition duration-150 group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-violet-400 font-bold text-xs group-hover:text-violet-300">
                <Building2 className="w-3.5 h-3.5" />
                <span>Admin Empresa</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Gestão geral e contratos</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}