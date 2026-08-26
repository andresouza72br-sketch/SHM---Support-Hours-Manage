import React, { useState } from 'react'
import {
  Users,
  X,
  UserPlus,
  Shield,
  Send,
  Lock,
  Unlock,
  AlertCircle,
  Loader2,
  Mail,
  Phone,
  UserCheck,
  Copy,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import type { Cliente, ClienteUser, UserRole } from '../../types'

interface ClienteUsuariosModalProps {
  cliente: Cliente | null
  isOpen: boolean
  onClose: () => void
}

export function ClienteUsuariosModal({ cliente, isOpen, onClose }: ClienteUsuariosModalProps) {
  const toast = useToast()
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  const [novoEmail, setNovoEmail] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [novoSobrenome, setNovoSobrenome] = useState('')
  const [novoRole, setNovoRole] = useState<UserRole>('CLIENTE_ANALISTA')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const isEmpresaAdmin =
    currentUser?.role === 'EMPRESA_ADMIN' || currentUser?.is_superuser || currentUser?.is_staff
  const isClienteGerente =
    currentUser?.role === 'CLIENTE_GERENTE' && currentUser?.cliente === cliente?.id
  const canManage = isEmpresaAdmin || isClienteGerente

  // Query: Usuários do cliente
  const { data: usuarios = [], isLoading } = useQuery<ClienteUser[]>({
    queryKey: ['cliente_usuarios', cliente?.id],
    queryFn: () => (cliente?.id ? clientService.clientes.usuarios.list(cliente.id) : Promise.resolve([])),
    enabled: isOpen && Boolean(cliente?.id),
  })

  // Mutation: Criar Usuário
  const createMutation = useMutation({
    mutationFn: (data: { email: string; first_name: string; last_name?: string; role: string; telefone?: string }) =>
      clientService.clientes.usuarios.create(cliente!.id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cliente_usuarios', cliente?.id] })
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      toast.success(res.detail || `Convite enviado para ${novoEmail}!`, 'Usuário Cadastrado')
      setNovoEmail('')
      setNovoNome('')
      setNovoSobrenome('')
      setNovoTelefone('')
      setNovoRole('CLIENTE_ANALISTA')
      setShowAddForm(false)
      setError(null)
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.email?.[0] ||
        err.response?.data?.detail ||
        'Erro ao cadastrar usuário. Verifique os dados.'
      setError(msg)
    },
  })

  // Mutation: Alternar Status
  const toggleStatusMutation = useMutation({
    mutationFn: (userId: number) => clientService.clientes.usuarios.alternarStatus(cliente!.id, userId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cliente_usuarios', cliente?.id] })
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      toast.success(res.detail, 'Status Atualizado')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erro ao alterar status do usuário.', 'Erro')
    },
  })

  // Mutation: Reenviar Convite
  const resendInviteMutation = useMutation({
    mutationFn: (userId: number) => clientService.clientes.usuarios.reenviarConvite(cliente!.id, userId),
    onSuccess: (res) => {
      toast.success(res.detail || 'Novo link de acesso enviado!', 'Convite Reenviado')
      if (res.token) {
        setCopiedToken(res.token)
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erro ao reenviar convite.', 'Erro')
    },
  })

  // Mutation: Alterar Papel
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: UserRole }) =>
      clientService.clientes.usuarios.update(cliente!.id, userId, { role }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cliente_usuarios', cliente?.id] })
      toast.success(res.detail || 'Perfil do usuário atualizado!', 'Perfil Atualizado')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erro ao atualizar perfil.', 'Erro')
    },
  })

  if (!isOpen || !cliente) return null

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    const emailLimpo = novoEmail.trim().toLowerCase()
    if (!emailLimpo) {
      setError('Por favor, informe o e-mail do colaborador.')
      return
    }
    if (!novoNome.trim()) {
      setError('Por favor, informe o nome do colaborador.')
      return
    }
    setError(null)
    createMutation.mutate({
      email: emailLimpo,
      first_name: novoNome.trim(),
      last_name: novoSobrenome.trim() || undefined,
      role: novoRole,
      telefone: novoTelefone.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden transition-all">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {cliente.logo_url ? (
              <img
                src={cliente.logo_url}
                alt={cliente.display_name}
                className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-500/20 shrink-0">
                <Users className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {cliente.tipo}
                </span>
                <span className="text-xs font-bold text-slate-500">Gestão de Equipe & Acessos</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white truncate max-w-md">
                {cliente.display_name}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Subheader */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Total de <strong>{usuarios.length}</strong> colaborador(es) cadastrado(s) para esta empresa.
          </div>
          {canManage && (
            <button
              onClick={() => {
                setShowAddForm((prev) => !prev)
                setError(null)
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                showAddForm
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{showAddForm ? 'Cancelar' : 'Convidar Novo Colaborador'}</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Add User Form Drawer */}
          {showAddForm && (
            <form
              onSubmit={handleCreateUser}
              className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-center gap-2 text-xs font-black text-indigo-950 dark:text-indigo-200">
                <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Cadastrar e Convidar Colaborador</span>
              </div>
              <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed font-medium">
                O colaborador receberá um convite por e-mail com <strong>Magic Link de 48h</strong> para acesso imediato ao portal, ou poderá autenticar via <strong>Google Workspace SSO</strong>.
              </p>

              {error && (
                <div className="p-3 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 mb-1">
                    E-mail Corporativo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ex: ana.silva@empresa.com"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 mb-1">
                    Perfil de Acesso <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={novoRole}
                    onChange={(e) => setNovoRole(e.target.value as UserRole)}
                    className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                  >
                    <option value="CLIENTE_ANALISTA">Cliente — Analista (Abre chamados e comenta)</option>
                    <option value="CLIENTE_GERENTE">Cliente — Gerente (Aprova orçamentos/aceites e gere equipe)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 mb-1">
                    Primeiro Nome <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Ana"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 mb-1">
                    Sobrenome
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Silva"
                    value={novoSobrenome}
                    onChange={(e) => setNovoSobrenome(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 mb-1">
                    Telefone / Celular
                  </label>
                  <input
                    type="text"
                    placeholder="(99) 99999-9999"
                    value={novoTelefone}
                    onChange={(e) => setNovoTelefone(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Cadastrar & Enviar Convite</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Token Copy Alert (if generated in dev) */}
          {copiedToken && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Link de acesso gerado. Você pode copiar o link direto de login sem senha:</span>
              </div>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/magic-link/${copiedToken}`
                  navigator.clipboard.writeText(url)
                  toast.success('Link de acesso copiado!', 'Copiado')
                }}
                className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-black text-[11px] hover:bg-emerald-700 transition flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Link</span>
              </button>
            </div>
          )}

          {/* Users List */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Usuários Autorizados no Portal
            </h3>

            {isLoading ? (
              <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando usuários...</span>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nenhum colaborador cadastrado ainda para este cliente.
                </p>
                {canManage && (
                  <p className="text-[11px] text-slate-500">
                    Clique em <strong>"Convidar Novo Colaborador"</strong> acima para liberar acesso.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {usuarios.map((u) => {
                  const isGerente = u.role === 'CLIENTE_GERENTE'
                  const isCurrentUser = u.id === currentUser?.id

                  return (
                    <div
                      key={u.id}
                      className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        u.is_active
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300'
                          : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      {/* Avatar & User Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.first_name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 ${
                              isGerente
                                ? 'bg-gradient-to-tr from-indigo-600 to-violet-600'
                                : 'bg-gradient-to-tr from-slate-600 to-slate-700'
                            }`}
                          >
                            {(u.first_name ? u.first_name[0] : u.username[0]).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {u.first_name} {u.last_name}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[9px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-1.5 py-0.2 rounded-md">
                                Você
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                isGerente
                                  ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {isGerente ? 'Gerente / Tomador' : 'Analista'}
                            </span>
                            {!u.is_active && (
                              <span className="text-[9px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-full uppercase">
                                Bloqueado
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{u.email}</span>
                            </span>
                            {u.telefone && (
                              <span className="hidden md:flex items-center gap-1 shrink-0">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{u.telefone}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {canManage && (
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {/* Reenviar Convite */}
                          <button
                            disabled={resendInviteMutation.isPending}
                            onClick={() => resendInviteMutation.mutate(u.id)}
                            className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-xl transition cursor-pointer text-xs flex items-center gap-1"
                            title="Reenviar link seguro de acesso por e-mail"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline text-[10px] font-bold">Reenviar Link</span>
                          </button>

                          {/* Alternar Papel */}
                          <button
                            onClick={() => {
                              const novo = isGerente ? 'CLIENTE_ANALISTA' : 'CLIENTE_GERENTE'
                              if (
                                window.confirm(
                                  `Deseja alterar o perfil de ${u.first_name} para ${
                                    novo === 'CLIENTE_GERENTE' ? 'Gerente / Tomador' : 'Analista'
                                  }?`
                                )
                              ) {
                                updateRoleMutation.mutate({ userId: u.id, role: novo })
                              }
                            }}
                            className="p-2 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 bg-slate-100 dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-950 rounded-xl transition cursor-pointer text-xs flex items-center gap-1"
                            title="Alternar entre Gerente e Analista"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline text-[10px] font-bold">Mudar Perfil</span>
                          </button>

                          {/* Bloquear / Desbloquear */}
                          {!isCurrentUser && (
                            <button
                              onClick={() => toggleStatusMutation.mutate(u.id)}
                              className={`p-2 rounded-xl transition cursor-pointer text-xs flex items-center gap-1 ${
                                u.is_active
                                  ? 'text-slate-600 hover:text-rose-600 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950'
                                  : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
                              }`}
                              title={u.is_active ? 'Bloquear Acesso' : 'Desbloquear Acesso'}
                            >
                              {u.is_active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
