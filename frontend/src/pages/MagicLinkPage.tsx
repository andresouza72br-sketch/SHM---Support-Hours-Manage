import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Clock, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react'
import { clientService } from '../api/client'
import { useToast } from '../contexts/ToastContext'

export function MagicLinkPage() {
  const { token } = useParams<{ token: string }>()
  const toast = useToast()
  const [sucesso, setSucesso] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['magic_link', token],
    queryFn: () => (token ? clientService.ciclos.getMagicLink(token) : null),
    enabled: Boolean(token),
    refetchInterval: false,
  })

  const actionMutation = useMutation({
    mutationFn: ({ acao }: { acao: string }) =>
      token ? clientService.ciclos.postMagicLink(token, { acao }) : Promise.reject(),
    onSuccess: (res: any) => {
      setSucesso(res.detail)
      toast.success(res.detail || 'Operação processada com sucesso via Magic Link!', 'Segurança & Compliance')
      refetch()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Erro ao processar ação via link seguro.'
      toast.error(msg, 'Falha')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3 text-sm font-semibold">
        <Clock className="w-8 h-8 text-indigo-500 animate-pulse" />
        <span>Validando token seguro e credenciais forenses...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-white">Link Não Encontrado</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Este link seguro não é válido ou já foi revogado. Se precisar de assistência, acesse o portal ou entre em contato com o suporte.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition"
          >
            <span>Ir para Plataforma SHM</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const { ciclo, pedido_protocolo, pedido_assunto, cliente_nome, contrato_numero, contrato_saldo, tipo_acao, expirado, expira_em, usado, usado_em } = data

  const formatarData = (isoStr: string | null) => {
    if (!isoStr) return ''
    try {
      return new Date(isoStr).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    } catch {
      return isoStr
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col justify-center items-center p-4">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 relative z-10 border border-slate-100">
        {/* Header com Protocolo e Badge de Segurança */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-indigo-600 font-extrabold text-lg">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span>SHM Secure Link</span>
          </div>
          <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
            {pedido_protocolo}
          </span>
        </div>

        {/* Informações do Pedido e Cliente */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-600 font-black uppercase tracking-wider">{cliente_nome}</span>
            {contrato_numero && (
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                Contrato: {contrato_numero} {contrato_saldo !== undefined && `(Saldo: ${Number(contrato_saldo).toFixed(1)}h)`}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5">{pedido_assunto}</h2>
        </div>

        {/* Card Resumo do Atendimento */}
        <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
            <span>Tipo de Atendimento: <strong className="text-slate-900">{ciclo.tipo_display}</strong></span>
            <span className="text-indigo-600 font-extrabold uppercase">{ciclo.status_display}</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">{ciclo.contexto || 'Sem contexto detalhado.'}</p>
          <div className="flex justify-between pt-3 border-t border-slate-200 text-xs font-black">
            <span>Horas Estimadas: {Number(ciclo.horas_estimadas).toFixed(1)}h</span>
            <span className="text-indigo-600">Horas Realizadas: {Number(ciclo.horas_realizadas).toFixed(1)}h</span>
          </div>
        </div>

        {/* Estado 1: Link Expirado (> 7 dias) */}
        {expirado ? (
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 text-sm font-black">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Link Expirado (Validade de 7 dias)</span>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              Este link seguro expirou em <strong>{formatarData(expira_em)}</strong>. Para aprovar ou revisar este ciclo, faça login na plataforma ou solicite um novo link à equipe técnica.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 hover:text-indigo-700"
              >
                <span>Acessar plataforma autenticada</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : usado || sucesso ? (
          /* Estado 2: Link Já Consumido (Uso Único / Single-Use) */
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 text-sm font-black">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Ação Processada com Sucesso</span>
            </div>
            <p className="text-xs text-emerald-700 leading-relaxed">
              {sucesso || `Este link de uso único foi utilizado com sucesso em ${formatarData(usado_em)}.`}
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 hover:text-indigo-700"
              >
                <span>Acompanhar na plataforma SHM</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          /* Estado 3: Ações Ativas Disponíveis */
          <div className="space-y-5">
            {/* A2: Aprovação de Orçamento */}
            {(ciclo.status === 'aguardando_aprovacao' || tipo_acao === 'aprovacao_orcamento') && (
              <div className="space-y-4">
                <button
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate({ acao: 'aprovar' })}
                  className="w-full py-4 text-sm font-black text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-2xl shadow-xl shadow-indigo-500/25 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>Aprovar Orçamento ({Number(ciclo.horas_estimadas).toFixed(1)}h)</span>
                </button>

                {/* Caixa Informativa sobre Rejeição Exclusiva via App */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                  <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Deseja Não Aprovar / Recusar este orçamento?</span>
                  </div>
                  <p className="leading-relaxed">
                    Por motivos de governança e auditoria, a recusa com justificativa técnica deve ser realizada exclusivamente através da nossa plataforma web.
                  </p>
                  <div className="pt-1">
                    <Link
                      to="/login"
                      className="text-indigo-600 hover:text-indigo-700 font-extrabold inline-flex items-center gap-1"
                    >
                      <span>Entrar no App para Recusar</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* A3: Aceite Final de Ciclo */}
            {(ciclo.status === 'aguardando_aceite' || tipo_acao === 'aceite_ciclo') && (
              <div className="space-y-4">
                <button
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate({ acao: 'aceitar' })}
                  className="w-full py-4 text-sm font-black text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-2xl shadow-xl shadow-emerald-500/25 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Aceitar Entrega / De acordo em Debitar horas realizadas ({Number(ciclo.horas_realizadas).toFixed(1)}h)</span>
                </button>

                {/* Caixa Informativa sobre Recusa de Aceite Exclusiva via App */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                  <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Identificou inconformidades na entrega?</span>
                  </div>
                  <p className="leading-relaxed">
                    A recusa formal do aceite exige justificativa técnica obrigatória e deve ser realizada exclusivamente via app/plataforma para acompanhamento da equipe técnica.
                  </p>
                  <div className="pt-1">
                    <Link
                      to="/login"
                      className="text-indigo-600 hover:text-indigo-700 font-extrabold inline-flex items-center gap-1"
                    >
                      <span>Entrar no App para Recusar Aceite</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rodapé com Validade do Token */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
          <span>Validade do Link: 7 dias</span>
          {expira_em && <span>Expira em: {formatarData(expira_em)}</span>}
        </div>
      </div>
    </div>
  )
}