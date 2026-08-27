import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText,
  Plus,
  Search,
  Building2,
  Clock,
  CheckCircle2,
  FileCheck,
  Mail,
  Edit,
  XCircle,
  TrendingUp,
  Flame,
  ArrowRight,
  CheckCheck,
  Send,
  Copy,
  Zap,
} from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { Contrato } from '../types'
import { NovoContratoModal } from '../components/contratos/NovoContratoModal'
import { CancelarContratoModal } from '../components/contratos/CancelarContratoModal'
import { DocumentosContratoModal } from '../components/contratos/DocumentosContratoModal'
import { GerenteClienteEmailsModal } from '../components/contratos/GerenteClienteEmailsModal'
import { MigracaoSaldoModal } from '../components/contratos/MigracaoSaldoModal'

type StatusFilter = 'todos' | 'ativo' | 'concluido' | 'cancelado' | 'pendente_aceite'

export function ContratosPage() {
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')

  // Modals state
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false)
  const [contratoParaEditar, setContratoParaEditar] = useState<Contrato | null>(null)

  const [cancelarModalContrato, setCancelarModalContrato] = useState<Contrato | null>(null)
  const [documentosModalContrato, setDocumentosModalContrato] = useState<Contrato | null>(null)
  const [emailsModalContrato, setEmailsModalContrato] = useState<Contrato | null>(null)
  const [migracaoModalContrato, setMigracaoModalContrato] = useState<Contrato | null>(null)


  const isEmpresaAdmin = user?.role === 'EMPRESA_ADMIN' || user?.is_superuser || user?.is_staff

  const { data: contratos = [], isLoading } = useQuery<Contrato[]>({
    queryKey: ['contratos'],
    queryFn: clientService.contratos.list,
    refetchInterval: 6000,
  })

  // Reenviar Aceite Mutation
  const reenviarAceiteMutation = useMutation({
    mutationFn: (id: number) => clientService.contratos.reenviarAceite(id),
    onSuccess: (res) => {
      toast.success(res.detail || 'E-mail de aceite reenviado ao responsável com sucesso!', 'Aceite Reenviado')
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erro ao reenviar e-mail de aceite.', 'Falha')
    },
  })

  // Concluir Contrato Mutation
  const concluirMutation = useMutation({
    mutationFn: (id: number) => clientService.contratos.concluir(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      queryClient.invalidateQueries({ queryKey: ['extrato'] })
      toast.success(`Contrato ${data.contrato?.numero || ''} concluído com sucesso!`, 'Contrato Concluído')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erro ao concluir contrato.', 'Erro')
    },
  })

  // Filtered Contracts
  const filteredContratos = useMemo(() => {
    return contratos.filter((c) => {
      const matchSearch =
        !searchTerm.trim() ||
        c.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.cliente_nome && c.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.descricao_servicos && c.descricao_servicos.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchStatus =
        statusFilter === 'todos' ? true : c.status === statusFilter

      return matchSearch && matchStatus
    })
  }, [contratos, searchTerm, statusFilter])

  // Global Metrics
  const metrics = useMemo(() => {
    const total = contratos.length
    const horasTotal = contratos.reduce((acc, c) => acc + (Number(c.horas_contratadas) || 0), 0)
    const horasGasto = contratos.reduce((acc, c) => acc + (Number(c.horas_consumidas) || 0), 0)
    const saldoTotal = contratos.reduce((acc, c) => acc + (Number(c.saldo) || 0), 0)
    const emCarencia = contratos.filter((c) => c.em_carencia).length
    const ativos = contratos.filter((c) => c.status === 'ativo').length
    const concluidos = contratos.filter((c) => c.status === 'concluido').length
    const cancelados = contratos.filter((c) => c.status === 'cancelado').length

    return { total, horasTotal, horasGasto, saldoTotal, emCarencia, ativos, concluidos, cancelados }
  }, [contratos])

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
                {isEmpresaAdmin ? 'Painel Administrativo de Contratos' : 'Meus Contratos & Franquias'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              Gestão de Contratos de Suporte
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
              Cadastro, vigência, uploads limitados a 5 cópias de propostas/aditivos, notificações e auditoria de saldo
            </p>
          </div>

          {isEmpresaAdmin && (
            <button
              onClick={() => {
                setContratoParaEditar(null)
                setIsNovoModalOpen(true)
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Contrato</span>
            </button>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Total de Contratos
              </span>
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics.total}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
              <span className="text-emerald-700 dark:text-emerald-400 font-black">{metrics.ativos} ativos</span>
              <span>•</span>
              <span>{metrics.concluidos} concluídos</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Franquia Contratada
              </span>
              <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics.horasTotal.toFixed(1)}h
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              Volume global de horas pactuadas
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Horas Consumidas
              </span>
              <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              {metrics.horasGasto.toFixed(1)}h
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              {metrics.horasTotal > 0
                ? `${Math.round((metrics.horasGasto / metrics.horasTotal) * 100)}% de consumo geral`
                : 'Sem consumo'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-indigo-200 dark:border-indigo-800 shadow-2xs space-y-1 bg-gradient-to-br from-white to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                Saldo Global Disponível
              </span>
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-700 dark:text-indigo-400 tracking-tight">
              {metrics.saldoTotal.toFixed(1)}h
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-300 font-bold">
              Horas líquidas prontas para uso
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
              onClick={() => setStatusFilter('concluido')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'concluido'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Concluídos ({metrics.concluidos})</span>
            </button>

            <button
              onClick={() => setStatusFilter('cancelado')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'cancelado'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <XCircle className="w-3 h-3 text-rose-500" />
              <span>Cancelados ({metrics.cancelados})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por cliente, número ou escopo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Contracts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredContratos.map((c) => {
            const totalHoras = Number(c.horas_contratadas) || 1
            const saldo = Number(c.saldo) || 0
            const consumido = Number(c.horas_consumidas) || 0
            const percentConsumido = Math.min(Math.round((consumido / totalHoras) * 100), 100)
            const totalDocs = Array.isArray(c.documentos) ? c.documentos.length : 0
            const totalEmails = Array.isArray(c.emails_notificacao) ? c.emails_notificacao.length : 0
            const isCancelado = c.status === 'cancelado'
            const isConcluido = c.status === 'concluido'

            return (
              <div
                key={c.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden relative ${
                  isCancelado
                    ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                    : isConcluido
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Top Bar: Number & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-indigo-950 dark:text-indigo-200 bg-indigo-100 dark:bg-indigo-950/80 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 shadow-2xs">
                        {c.numero}
                      </span>
                      {c.tipo && c.tipo !== 'novo' && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {c.tipo_display || c.tipo}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border shadow-2xs ${
                        c.status === 'ativo'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60'
                          : c.status === 'cancelado'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800/60'
                          : c.status === 'concluido'
                          ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800/60'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
                      }`}
                    >
                      {c.status_display}
                    </span>
                  </div>

                  {/* Client Name & Logo */}
                  <div className="flex items-center gap-3">
                    {c.cliente_logo ? (
                      <img
                        src={c.cliente_logo}
                        alt={c.cliente_nome}
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                        {c.cliente_nome ? c.cliente_nome[0].toUpperCase() : 'C'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900 dark:text-white text-sm truncate" title={c.cliente_nome}>
                        {c.cliente_nome}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Início: {new Date(c.data_inicio).toLocaleDateString('pt-BR')}
                        {c.data_termino ? ` • Vence: ${new Date(c.data_termino).toLocaleDateString('pt-BR')}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Scope description */}
                  {c.descricao_servicos && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {c.descricao_servicos}
                    </p>
                  )}

                  {/* Saldo & Progress */}
                  <div className="bg-slate-50 dark:bg-slate-800/70 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Saldo de Horas:</span>
                      <span className="text-sm font-black text-indigo-700 dark:text-indigo-400">{saldo.toFixed(1)}h</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percentConsumido <= 25
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : percentConsumido <= 50
                            ? 'bg-gradient-to-r from-emerald-500 to-amber-400'
                            : percentConsumido <= 75
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                            : 'bg-gradient-to-r from-orange-500 to-rose-600'
                        }`}
                        style={{ width: `${percentConsumido}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 font-bold pt-0.5">
                      <span>Consumo: {consumido.toFixed(1)}h ({percentConsumido}%)</span>
                      <span>Franquia: {totalHoras.toFixed(1)}h</span>
                    </div>
                  </div>

                  {/* Justificativa if cancelado */}
                  {isCancelado && c.justificativa_cancelamento && (
                    <div className="p-3 bg-rose-100/70 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-900 dark:text-rose-200">
                      <span className="font-black text-[10px] block uppercase tracking-wider mb-0.5">Justificativa do Cancelamento:</span>
                      <p className="italic text-[11px] leading-relaxed line-clamp-3">{c.justificativa_cancelamento}</p>
                    </div>
                  )}

                  {/* Documents & Emails Quick Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => setDocumentosModalContrato(c)}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-700 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                      title="Ver/Adicionar cópias de propostas e aditivos (até 5 arquivos)"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{totalDocs}/5 Docs</span>
                    </button>

                    <button
                      onClick={() => setEmailsModalContrato(c)}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-700 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                      title="Gerenciar e-mails para notificações"
                    >
                      <Mail className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                      <span>{totalEmails} e-mails</span>
                    </button>
                  </div>

                  {/* Pending Acceptance Notice & Quick Actions */}
                  {c.status === 'pendente_aceite' && (
                    <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-900 dark:text-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Aguardando Aceite do Responsável</span>
                      </div>
                      <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed font-medium">
                        O início dos trabalhos e uso da franquia dependem da concordância formal do responsável.
                      </p>
                      {isEmpresaAdmin && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            disabled={reenviarAceiteMutation.isPending}
                            onClick={() => reenviarAceiteMutation.mutate(c.id)}
                            className="flex-1 py-1 px-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Reenviar e-mail com link de aceite ao responsável"
                          >
                            <Send className="w-3 h-3" />
                            <span>Reenviar E-mail</span>
                          </button>
                          {c.aceite_token && (
                            <button
                              onClick={() => {
                                const link = `${window.location.origin}/aceite-contrato/${c.aceite_token}`
                                navigator.clipboard.writeText(link)
                                toast.success('Link de aceite copiado!', 'Link Copiado')
                              }}
                              className="py-1 px-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-lg text-[10px] font-bold hover:bg-amber-100 dark:hover:bg-amber-950 transition flex items-center gap-1 cursor-pointer"
                              title="Copiar Link de Aceite"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copiar Link</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <Link
                    to={`/contratos/${c.id}/extrato`}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 px-3 py-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition group"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Extrato & Auditoria</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                  </Link>

                  {/* Actions for Empresa Admin */}
                  {isEmpresaAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setContratoParaEditar(c)
                          setIsNovoModalOpen(true)
                        }}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 transition cursor-pointer"
                        title="Editar Contrato"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {!isCancelado && !isConcluido && (
                        <>
                          <button
                            onClick={() => setMigracaoModalContrato(c)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                            title="Aproveitar / Migrar Saldo de Contratos Vencidos deste Cliente"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                          </button>

                          <button
                            disabled={concluirMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Deseja marcar o contrato ${c.numero} como Concluído?`)) {
                                concluirMutation.mutate(c.id)
                              }
                            }}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                            title="Concluir Contrato"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setCancelarModalContrato(c)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Cancelar Contrato (com justificativa)"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {filteredContratos.length === 0 && !isLoading && (
            <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
              <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                Nenhum contrato encontrado para os filtros selecionados.
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tente ajustar os termos da busca ou selecione outra aba de status acima.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modais Integrados */}
      <NovoContratoModal
        isOpen={isNovoModalOpen}
        onClose={() => {
          setIsNovoModalOpen(false)
          setContratoParaEditar(null)
        }}
        contratoParaEditar={contratoParaEditar}
      />

      <CancelarContratoModal
        isOpen={Boolean(cancelarModalContrato)}
        onClose={() => setCancelarModalContrato(null)}
        contrato={contratos.find((c) => c.id === cancelarModalContrato?.id) || cancelarModalContrato}
      />

      <DocumentosContratoModal
        isOpen={Boolean(documentosModalContrato)}
        onClose={() => setDocumentosModalContrato(null)}
        contrato={contratos.find((c) => c.id === documentosModalContrato?.id) || documentosModalContrato}
      />

      <GerenteClienteEmailsModal
        isOpen={Boolean(emailsModalContrato)}
        onClose={() => setEmailsModalContrato(null)}
        contrato={contratos.find((c) => c.id === emailsModalContrato?.id) || emailsModalContrato}
      />

      <MigracaoSaldoModal
        isOpen={Boolean(migracaoModalContrato)}
        onClose={() => setMigracaoModalContrato(null)}
        contratoDestino={migracaoModalContrato}
      />
    </AppLayout>
  )
}

