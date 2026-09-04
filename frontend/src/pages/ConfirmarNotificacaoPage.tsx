import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  Building2,
  FileText,
  Loader2,
  ArrowRight,
  BellRing,
  PieChart,
} from 'lucide-react'
import { clientService } from '../api/client'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { useToast } from '../contexts/ToastContext'

export function ConfirmarNotificacaoPage() {
  const { token } = useParams<{ token: string }>()
  const toast = useToast()

  const [feedbackState, setFeedbackState] = useState<'idle' | 'confirmado' | 'recusado'>('idle')
  const [showRecusarModal, setShowRecusarModal] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['convite_notificacao', token],
    queryFn: () => clientService.contratos.obterConviteEmail(token || ''),
    enabled: Boolean(token),
    retry: false,
  })

  const confirmarMutation = useMutation({
    mutationFn: () => clientService.contratos.confirmarEmail(token || ''),
    onSuccess: (res) => {
      setFeedbackState('confirmado')
      toast.success(res.detail || 'E-mail confirmado com sucesso!', 'Notificações Ativadas')
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erro ao confirmar e-mail.', 'Erro')
    },
  })

  const recusarMutation = useMutation({
    mutationFn: () => clientService.contratos.recusarEmail(token || ''),
    onSuccess: (res) => {
      setFeedbackState('recusado')
      toast.info(res.detail || 'Recebimento de notificações recusado.', 'Recusado')
      setShowRecusarModal(false)
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erro ao recusar notificações.', 'Erro')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Verificando token de confirmação seguro...</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 max-w-md w-full p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">Link Inválido ou Não Encontrado</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            O link de confirmação acessado não existe, foi revogado ou já foi processado anteriormente.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition"
            >
              <span>Ir para a Página Inicial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isExpirado = data.is_expirado || data.status === 'expirado'
  const isJaConfirmado = data.status === 'confirmado' || feedbackState === 'confirmado'
  const isJaRecusado = data.status === 'recusado' || feedbackState === 'recusado'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between py-8 px-4 transition-colors">
      {/* Top Navbar */}
      <div className="max-w-xl mx-auto w-full flex items-center justify-between pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-black text-white text-base shadow-sm">
            S
          </div>
          <span className="font-black text-slate-900 dark:text-white text-sm tracking-tight">SHM Notificações</span>
        </div>
        <ThemeToggle size="sm" />
      </div>

      {/* Main Container */}
      <div className="max-w-xl mx-auto w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all">
        {/* Header Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
              Confirmação de E-mail
            </span>
            <span className="text-xs text-indigo-200">•</span>
            <span className="text-xs font-mono font-bold text-indigo-100">{data.contrato_numero}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
            Ativação de Notificações SHM
          </h1>
          <p className="text-xs text-indigo-100/90 font-medium mt-1">
            Receba avisos operacionais, extratos de franquia e alertas do contrato da sua empresa
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Card Informações do Contrato & Quem Convidou */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-black text-slate-900 dark:text-white">{data.cliente_nome}</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                {data.contrato_numero}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200">{data.email}</span>
                {data.nome && <span>({data.nome})</span>}
              </div>
              <div className="text-[11px]">
                Adicionado por: <strong className="text-slate-800 dark:text-slate-200">{data.convidado_por_nome}</strong> ({data.convidado_por_papel})
              </div>
            </div>
          </div>

          {/* STATUS: JÁ CONFIRMADO */}
          {isJaConfirmado && (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-black text-emerald-900 dark:text-emerald-200">
                Notificações Ativas com Sucesso!
              </h2>
              <p className="text-xs text-emerald-800 dark:text-emerald-300/90 leading-relaxed max-w-sm mx-auto font-medium">
                Seu e-mail <strong>{data.email}</strong> foi confirmado e está habilitado para receber os avisos periódicos deste contrato.
              </p>
            </div>
          )}

          {/* STATUS: RECUSADO */}
          {isJaRecusado && (
            <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center mx-auto">
                <XCircle className="w-6 h-6" />
              </div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-200">
                Recebimento Recusado
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto font-medium">
                Você optou por não receber as notificações deste contrato. Nenhuma mensagem automática será enviada para o seu endereço.
              </p>
            </div>
          )}

          {/* STATUS: EXPIRADO (> 15 DIAS) */}
          {isExpirado && !isJaConfirmado && !isJaRecusado && (
            <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h2 className="text-base font-black text-amber-900 dark:text-amber-200">
                Link Expirado (Prazo de 15 Dias Excedido)
              </h2>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed max-w-sm mx-auto font-medium">
                Por motivos de segurança e governança, os links de confirmação de e-mail expiram após <strong>15 dias</strong> do envio.
              </p>
              <div className="pt-2 text-xs text-amber-900 dark:text-amber-200 font-bold">
                Entre em contato com o gestor do contrato (<strong>{data.convidado_por_nome}</strong>) para solicitar o reenvio de um novo convite.
              </div>
            </div>
          )}

          {/* STATUS: PENDENTE & VÁLIDO (Exibe Lista de Benefícios e Botões) */}
          {!isExpirado && !isJaConfirmado && !isJaRecusado && (
            <div className="space-y-5">
              {/* Box de Validade */}
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-bold">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Link válido por mais <strong>{data.dias_restantes} dias</strong> (até {new Date(data.expira_em).toLocaleDateString('pt-BR')})
                </span>
              </div>

              {/* O que vai receber */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Notificações Incluídas ao Confirmar:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                      <PieChart className="w-4 h-4 text-indigo-600" />
                      <span>Saldo & Franquia</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Alertas quando o consumo atingir 80% ou o saldo de horas estiver baixo.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                      <BellRing className="w-4 h-4 text-violet-600" />
                      <span>Abertura de Pedidos</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Avisos de novos pedidos, orçamentos técnicos e aprovação de ciclos.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                      <FileText className="w-4 h-4 text-sky-600" />
                      <span>Extratos & Relatórios</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Cópias de fechamento de ciclos de suporte e extratos de faturamento.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Termos & Vigência</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Comunicações sobre renovações de contrato e termos aditivos.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  disabled={confirmarMutation.isPending || recusarMutation.isPending}
                  onClick={() => confirmarMutation.mutate()}
                  className="w-full sm:flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white font-black text-xs shadow-lg shadow-indigo-600/25 hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {confirmarMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Ativando Notificações...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar e Ativar Notificações</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={confirmarMutation.isPending || recusarMutation.isPending}
                  onClick={() => setShowRecusarModal(true)}
                  className="w-full sm:w-auto px-5 py-3.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
                >
                  {recusarMutation.isPending ? 'Processando...' : 'Recusar Recebimento'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-500 dark:text-slate-400">
          SHM — Plataforma de Governança de Contratos e Suporte Técnico Sob Medida
        </div>
      </div>

      <div className="max-w-xl mx-auto w-full text-center pt-6 text-[11px] text-slate-400 font-medium">
        Privacidade e Segurança: Seus dados são protegidos segundo as normas da LGPD.
      </div>

      {/* Modal de Confirmação: Recusar Recebimento de Notificações */}
      <ConfirmModal
        isOpen={showRecusarModal}
        onClose={() => setShowRecusarModal(false)}
        onConfirm={() => recusarMutation.mutate()}
        title="Recusar Recebimento de Notificações"
        badge={data?.email}
        variant="warning"
        icon={XCircle}
        confirmText="Confirmar Recusa"
        isLoading={recusarMutation.isPending}
        description={
          <div className="space-y-2">
            <p>
              Tem certeza que deseja recusar o recebimento de notificações deste contrato?
            </p>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
              ⚠️ <strong>Impacto:</strong> Ao recusar, seu endereço de e-mail não receberá os comunicados de consumo de horas, saldo em carência e fechamento de ciclos de suporte deste contrato.
            </div>
          </div>
        }
      />
    </div>
  )
}
