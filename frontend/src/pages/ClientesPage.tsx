import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Plus,
  Search,
  Users,
  FileText,
  Clock,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  AlertTriangle,
  XCircle,
  Shield,
  CheckCircle2,
  Copy,
  Sparkles,
} from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { Cliente } from '../types'
import { NovoClienteModal } from '../components/clientes/NovoClienteModal'
import { ClienteUsuariosModal } from '../components/clientes/ClienteUsuariosModal'
import { RemoverClienteModal } from '../components/clientes/RemoverClienteModal'

type StatusFilter = 'todos' | 'pendente_aprovacao' | 'ativo' | 'suspenso' | 'inativo'

export function ClientesPage() {
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')

  // Modals state
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false)
  const [clienteParaEditar, setClienteParaEditar] = useState<Cliente | null>(null)
  const [usuariosModalCliente, setUsuariosModalCliente] = useState<Cliente | null>(null)
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null)

  const isEmpresaAdmin = user?.role === 'EMPRESA_ADMIN' || user?.is_superuser || user?.is_staff

  // Query: Clientes
  const { data: clientes = [], isLoading } = useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: () => clientService.clientes.list(),
    refetchInterval: 8000,
  })

  // Reenviar Aprovação Mutation (Magic Link 7 dias)
  const reenviarAprovacaoMutation = useMutation({
    mutationFn: (clienteId: number) => clientService.clientes.reenviarAprovacao(clienteId),
    onSuccess: (res) => {
      toast.success(res.detail, 'Magic Link Reenviado')
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || 'Erro ao reenviar link de aprovação.',
        'Falha no Reenvio'
      )
    },
  })

  const handleCopyMagicLink = (token?: string | null) => {
    if (!token) {
      toast.info('Nenhum link ativo gerado ainda. Clique em reenviar.', 'Aviso')
      return
    }
    const url = `${window.location.origin}/aceite-cliente/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Magic Link de aprovação (7 dias) copiado para a área de transferência!', 'Link Copiado')
  }

  // Filtered Clients
  const filteredClientes = useMemo(() => {
    return clientes.filter((c) => {
      const matchSearch =
        !searchTerm.trim() ||
        c.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.cnpj && c.cnpj.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.cpf && c.cpf.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.email_contato && c.email_contato.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.pessoa_contato && c.pessoa_contato.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.cidade && c.cidade.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchStatus = statusFilter === 'todos' ? true : c.status === statusFilter

      return matchSearch && matchStatus
    })
  }, [clientes, searchTerm, statusFilter])

  // Global Metrics
  const metrics = useMemo(() => {
    const total = clientes.length
    const pendentes = clientes.filter((c) => c.status === 'pendente_aprovacao').length
    const ativos = clientes.filter((c) => c.status === 'ativo').length
    const suspensos = clientes.filter((c) => c.status === 'suspenso').length
    const inativos = clientes.filter((c) => c.status === 'inativo').length
    const totalContratos = clientes.reduce((acc, c) => acc + (c.total_contratos || 0), 0)
    const totalUsuarios = clientes.reduce((acc, c) => acc + (c.total_usuarios || 0), 0)
    const saldoTotalHoras = clientes.reduce((acc, c) => acc + (c.saldo_total_horas || 0), 0)

    return { total, pendentes, ativos, suspensos, inativos, totalContratos, totalUsuarios, saldoTotalHoras }
  }, [clientes])


  return (
    <AppLayout showSidebar={false}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Title & Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                Governança SHM
              </span>
              <span className="text-xs font-bold text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {isEmpresaAdmin ? 'Painel de Gestão de Clientes' : 'Minha Empresa & Equipe'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              Cadastro e Gestão de Clientes
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
              Organizações tomadoras, contatos fiscais, branding, herança de notificações e equipe autorizada
            </p>
          </div>

          {isEmpresaAdmin && (
            <button
              onClick={() => {
                setClienteParaEditar(null)
                setIsNovoModalOpen(true)
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cliente</span>
            </button>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Total de Clientes
              </span>
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics.total}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex flex-wrap items-center gap-1">
              <span className="text-emerald-700 dark:text-emerald-400 font-black">{metrics.ativos} ativos</span>
              <span>•</span>
              <span className="text-amber-700 dark:text-amber-400 font-black">{metrics.pendentes} pendentes</span>
              <span>•</span>
              <span>{metrics.suspensos + metrics.inativos} inativos</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Contratos Vinculados
              </span>
              <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics.totalContratos}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              Bolsões e franquias ativas na base
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Usuários de Clientes
              </span>
              <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics.totalUsuarios}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              Gerentes e Analistas autorizados
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-indigo-200 dark:border-indigo-800 shadow-2xs space-y-1 bg-gradient-to-br from-white to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                Saldo Total Ativo
              </span>
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-700 dark:text-indigo-400 tracking-tight">
              {metrics.saldoTotalHoras.toFixed(1)}h
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-300 font-bold">
              Disponibilidade global de suporte
            </div>
          </div>
        </div>

        {/* Filter Toolbar & Search */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                statusFilter === 'todos'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>Todos ({metrics.total})</span>
            </button>

            <button
              onClick={() => setStatusFilter('pendente_aprovacao')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'pendente_aprovacao'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Clock className="w-3 h-3 text-amber-500" />
              <span>Pendentes de Aprovação ({metrics.pendentes})</span>
            </button>

            <button
              onClick={() => setStatusFilter('ativo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'ativo'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Ativos ({metrics.ativos})</span>
            </button>

            <button
              onClick={() => setStatusFilter('suspenso')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'suspenso'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span>Suspensos ({metrics.suspensos})</span>
            </button>

            <button
              onClick={() => setStatusFilter('inativo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'inativo'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <XCircle className="w-3 h-3 text-rose-500" />
              <span>Inativos ({metrics.inativos})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome, CNPJ, contato ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClientes.map((c) => {
            const isPendente = c.status === 'pendente_aprovacao'
            const isAtivo = c.status === 'ativo'
            const isSuspenso = c.status === 'suspenso'
            const isInativo = c.status === 'inativo'
            const totalContratos = c.total_contratos || 0
            const totalUsuarios = c.total_usuarios || 0
            const saldoHoras = Number(c.saldo_total_horas) || 0

            return (
              <div
                key={c.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden relative ${
                  isPendente
                    ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/15 dark:bg-amber-950/10'
                    : isInativo
                    ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                    : isSuspenso
                    ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Top Bar: Tipo, Status & E-mail Verificado */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-[10px] text-indigo-950 dark:text-indigo-200 bg-indigo-100 dark:bg-indigo-950/80 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 shadow-2xs">
                        {c.tipo}
                      </span>
                      {c.ramo_atividade && (
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                          {c.ramo_atividade}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* E-mail verification pill */}
                      {c.email_verificado ? (
                        <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800/60 flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>E-mail Verificado</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800/60 flex items-center gap-1 shadow-2xs">
                          <Clock className="w-2.5 h-2.5" />
                          <span>E-mail Pendente</span>
                        </span>
                      )}

                      {/* Status pill */}
                      <span
                        className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border shadow-2xs ${
                          isPendente
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
                            : isAtivo
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60'
                            : isSuspenso
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800/60'
                        }`}
                      >
                        {isPendente ? 'Pendente de Aprovação' : c.status}
                      </span>
                    </div>
                  </div>

                  {/* Client Logo & Name */}
                  <div className="flex items-center gap-3">
                    {c.logo_url ? (
                      <img
                        src={c.logo_url}
                        alt={c.display_name}
                        className="w-12 h-12 rounded-2xl object-contain bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-800 shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                        {c.display_name ? c.display_name[0].toUpperCase() : 'C'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900 dark:text-white text-base truncate" title={c.display_name}>
                        {c.display_name}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {c.cnpj ? `CNPJ: ${c.cnpj}` : c.cpf ? `CPF: ${c.cpf}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Gestor & Contato Info */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-1.5 text-xs">
                    {c.pessoa_contato && (
                      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold truncate">
                        <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">
                          {c.pessoa_contato} {c.cargo_contato ? `(${c.cargo_contato})` : ''}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.email_contato}</span>
                    </div>
                    {(c.celular_whatsapp || c.telefone) && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium truncate">
                        <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{c.celular_whatsapp || c.telefone}</span>
                      </div>
                    )}
                    {c.cidade && c.estado && (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] truncate pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {c.cidade} - {c.estado}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Alerta de Magic Link Pendente de 7 dias */}
                  {isPendente && (
                    <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200 space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 font-bold text-[11px]">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Aguardando Aprovação do Gestor</span>
                        </div>
                        <span className="text-[10px] bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1.5 py-0.2 rounded font-black">
                          7 dias
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                        Notificação enviada para <strong>{c.email_contato}</strong>.
                      </p>
                      {isEmpresaAdmin && (
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => reenviarAprovacaoMutation.mutate(c.id)}
                            disabled={reenviarAprovacaoMutation.isPending}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <Mail className="w-3 h-3" />
                            <span>Reenviar Magic Link</span>
                          </button>
                          {c.aceite_token && (
                            <button
                              type="button"
                              onClick={() => handleCopyMagicLink(c.aceite_token)}
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Copiar Link Seguro de Aprovação (7 dias)"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copiar Link</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Justificativa de Bloqueio se Suspenso */}
                  {c.motivo_bloqueio && (isSuspenso || isInativo) && (
                    <div className="p-3 bg-amber-100/70 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 rounded-2xl text-xs text-amber-900 dark:text-amber-200">
                      <span className="font-black text-[10px] block uppercase tracking-wider mb-0.5">Motivo do Bloqueio:</span>
                      <p className="italic text-[11px] leading-relaxed line-clamp-2">{c.motivo_bloqueio}</p>
                    </div>
                  )}

                  {/* Quick Metrics Badges */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-center border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-500 block">Contratos</span>
                      <span className="text-xs font-black text-slate-900 dark:text-white">{totalContratos}</span>
                    </div>

                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-center border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-500 block">Usuários</span>
                      <span className="text-xs font-black text-violet-600 dark:text-violet-400">{totalUsuarios}</span>
                    </div>

                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-center border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-500 block">Saldo</span>
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {saldoHoras.toFixed(1)}h
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setUsuariosModalCliente(c)}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-violet-700 dark:text-violet-400 hover:text-violet-900 dark:hover:text-violet-300 px-3 py-1.5 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-950/60 transition cursor-pointer"
                    title="Acessos ao Sistema SHM (Usuários e Convites)"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Equipe ({totalUsuarios})</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <Link
                      to={`/contratos`}
                      className="p-1.5 text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/40 transition cursor-pointer"
                      title="Ver Contratos desta empresa"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </Link>

                    {isEmpresaAdmin && (
                      <>
                        {isPendente && (
                          <button
                            type="button"
                            onClick={() => reenviarAprovacaoMutation.mutate(c.id)}
                            disabled={reenviarAprovacaoMutation.isPending}
                            className="p-1.5 text-amber-600 hover:text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                            title="Reenviar Magic Link de Aprovação (7 dias)"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setClienteParaEditar(c)
                            setIsNovoModalOpen(true)
                          }}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="Editar Cadastro do Cliente"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setClienteParaExcluir(c)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Excluir Cliente (com Auditoria Forense)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}


          {filteredClientes.length === 0 && !isLoading && (
            <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
              <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                Nenhum cliente encontrado para os filtros selecionados.
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tente ajustar os termos da busca ou clique em <strong>"Novo Cliente"</strong> acima.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modais Integrados */}
      <NovoClienteModal
        isOpen={isNovoModalOpen}
        onClose={() => {
          setIsNovoModalOpen(false)
          setClienteParaEditar(null)
        }}
        clienteParaEditar={clienteParaEditar}
        onOpenUsuariosModal={(cli) => setUsuariosModalCliente(cli)}
      />

      <ClienteUsuariosModal
        isOpen={Boolean(usuariosModalCliente)}
        onClose={() => setUsuariosModalCliente(null)}
        cliente={usuariosModalCliente}
      />

      <RemoverClienteModal
        isOpen={Boolean(clienteParaExcluir)}
        onClose={() => setClienteParaExcluir(null)}
        cliente={clientes.find((c) => c.id === clienteParaExcluir?.id) || clienteParaExcluir}
      />
    </AppLayout>
  )
}

