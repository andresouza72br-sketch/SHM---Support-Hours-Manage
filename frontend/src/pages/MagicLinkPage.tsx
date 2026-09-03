import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, ExternalLink, Loader2, Star } from 'lucide-react'
import { clientService } from '../api/client'
import { useToast } from '../contexts/ToastContext'
import { ThemeToggle } from '../components/ui/ThemeToggle'

export function MagicLinkPage() {
  const { token } = useParams<{ token: string }>()
  const toast = useToast()
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [justificativaExcedente, setJustificativaExcedente] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['magic_link', token],
    queryFn: () => (token ? clientService.ciclos.getMagicLink(token) : null),
    enabled: Boolean(token),
    refetchInterval: false,
  })

  const actionMutation = useMutation({
    mutationFn: (payload: { acao: string; nota?: number; comentario?: string; justificativa_excedente?: string }) =>
      token ? clientService.ciclos.postMagicLink(token, payload) : Promise.reject(),
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
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
          <ThemeToggle />
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl max-w-sm w-full text-center space-y-5">
          {/* Animated spinner */}
          <div className="relative w-14 h-14 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
            <div className="absolute inset-2 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-black text-slate-900 dark:text-white text-base">Verificando Link Seguro</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Autenticando token criptográfico e verificando validade de 7 dias...
            </p>
          </div>
          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-indigo-200 dark:bg-indigo-800 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
          <ThemeToggle />
        </div>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Link Não Encontrado</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
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

  const { ciclo, pedido_protocolo, pedido_assunto, cliente_nome, contrato_numero, contrato_saldo, tipo_acao, excede_tolerancia, limite_tolerancia, expirado, expira_em, usado, usado_em } = data

  const formatarData = (isoStr: string | null) => {
    if (!isoStr) return ''
    try {
      return new Date(isoStr).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    } catch {
      return isoStr
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex flex-col justify-center items-center p-4 transition-colors duration-200">
      {/* Switch Light/Dark Mode no Canto Superior Direito */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 dark:bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-600/10 dark:bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 relative z-10 border border-slate-200/90 dark:border-slate-800 transition-colors">
        {/* Header com Protocolo e Badge de Segurança */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 font-extrabold text-lg">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span>SHM Secure Link</span>
          </div>
          <span className="text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/60">
            {pedido_protocolo}
          </span>
        </div>

        {/* Informações do Pedido e Cliente */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider">{cliente_nome}</span>
            {contrato_numero && (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700">
                Contrato: {contrato_numero} {contrato_saldo !== undefined && `(Saldo: ${Number(contrato_saldo).toFixed(1)}h)`}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5">{pedido_assunto}</h2>
        </div>

        {/* Card Resumo do Atendimento */}
        <div className="p-5 bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300">
            <span>Tipo de Atendimento: <strong className="text-slate-900 dark:text-white">{ciclo.tipo_display}</strong></span>
            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold uppercase">{ciclo.status_display}</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{ciclo.contexto || 'Sem contexto detalhado.'}</p>
          <div className="flex justify-between pt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-black">
            <span className="text-slate-700 dark:text-slate-300">Horas Estimadas: {Number(ciclo.horas_estimadas).toFixed(1)}h</span>
            <span className="text-indigo-600 dark:text-indigo-400">Horas Realizadas: {Number(ciclo.horas_realizadas).toFixed(1)}h</span>
          </div>
        </div>

        {/* Estado 1: Link Expirado (> 7 dias) */}
        {expirado ? (
          <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 text-sm font-black">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Link Expirado (Validade de 7 dias)</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              Este link seguro expirou em <strong>{formatarData(expira_em)}</strong>. Para aprovar ou revisar este ciclo, faça login na plataforma ou solicite um novo link à equipe técnica.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                <span>Acessar plataforma autenticada</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : usado || sucesso ? (
          /* Estado 2: Link Já Consumido (Uso Único / Single-Use) */
          <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-900 dark:text-emerald-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 text-sm font-black">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Ação Processada com Sucesso</span>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
              {sucesso || `Este link de uso único foi utilizado com sucesso em ${formatarData(usado_em)}.`}
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
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
            {(['aguardando_aprovacao', 'orcado'].includes(ciclo.status) || tipo_acao === 'aprovacao_orcamento') && (
              <div className="space-y-4">
                <button
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate({ acao: 'aprovar' })}
                  className="w-full py-4 text-sm font-black text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-2xl shadow-xl shadow-indigo-500/25 transition cursor-pointer disabled:opacity-75 disabled:cursor-wait flex items-center justify-center gap-2.5"
                >
                  {actionMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Aprovando Orçamento com Assinatura Digital...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>Aprovar Orçamento ({Number(ciclo.horas_estimadas).toFixed(1)}h)</span>
                    </>
                  )}
                </button>

                {/* Caixa Informativa sobre Rejeição Exclusiva via App */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                  <div className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Deseja Não Aprovar / Recusar este orçamento?</span>
                  </div>
                  <p className="leading-relaxed">
                    Por motivos de governança e auditoria, a recusa com justificativa técnica deve ser realizada exclusivamente através da nossa plataforma web.
                  </p>
                  <div className="pt-1">
                    <Link
                      to="/login"
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-extrabold inline-flex items-center gap-1"
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
                {excede_tolerancia && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2 text-left">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 text-xs font-black">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Aceite de Exceção — Horas Acima da Tolerância (+30%)</span>
                    </div>
                    <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                      O total realizado (<strong>{Number(ciclo.horas_realizadas).toFixed(1)}h</strong>) excede o orçamento aprovado (<strong>{Number(ciclo.horas_estimadas).toFixed(1)}h</strong>) acrescido da margem contratual de 30% (<strong>{Number(limite_tolerancia).toFixed(1)}h</strong>).
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                      Para autorizar o débito integral de <strong>{Number(ciclo.horas_realizadas).toFixed(1)}h</strong> do contrato, é obrigatório informar a justificativa de aprovação desta exceção (gravada na auditoria forense):
                    </p>
                    <textarea
                      rows={3}
                      value={justificativaExcedente}
                      onChange={(e) => setJustificativaExcedente(e.target.value)}
                      placeholder="Descreva o motivo da aprovação do excedente de horas..."
                      className="w-full text-xs p-3 border border-amber-300 dark:border-amber-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                )}

                <button
                  disabled={actionMutation.isPending || (excede_tolerancia && !justificativaExcedente.trim())}
                  onClick={() => actionMutation.mutate({ acao: 'aceitar', justificativa_excedente: justificativaExcedente })}
                  className="w-full py-4 text-sm font-black text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-2xl shadow-xl shadow-emerald-500/25 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                >
                  {actionMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Registrando Aceite Final & Debitando Horas...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>
                        {excede_tolerancia
                          ? `Autorizar Débito de Exceção & Aceitar (${Number(ciclo.horas_realizadas).toFixed(1)}h)`
                          : `Aceitar Entrega / De acordo em Debitar horas realizadas (${Number(ciclo.horas_realizadas).toFixed(1)}h)`}
                      </span>
                    </>
                  )}
                </button>

                {/* Caixa Informativa sobre Recusa de Aceite Exclusiva via App */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 text-left">
                  <div className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Identificou inconformidades na entrega?</span>
                  </div>
                  <p className="leading-relaxed">
                    A recusa formal do aceite exige justificativa técnica obrigatória e deve ser realizada exclusivamente via app/plataforma para acompanhamento da equipe técnica.
                  </p>
                  <div className="pt-1">
                    <Link
                      to="/login"
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-extrabold inline-flex items-center gap-1"
                    >
                      <span>Entrar no App para Recusar Aceite</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* A4: Avaliação de Satisfação */}
            {tipo_acao === 'avaliacao_ciclo' && (
              <div className="space-y-5 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="space-y-3">
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300 text-center">
                    Que nota você dá para este atendimento?
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNota(n)}
                        className="p-1 transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          className={`w-9 h-9 transition-colors ${
                            n <= nota
                              ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                              : 'fill-transparent text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label htmlFor="comentario" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Deixe um comentário (opcional)
                  </label>
                  <textarea
                    id="comentario"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="Conte um pouco sobre sua experiência..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                    rows={3}
                  />
                </div>

                <button
                  disabled={!nota || actionMutation.isPending}
                  onClick={() => actionMutation.mutate({ acao: 'avaliar', nota, comentario })}
                  className="w-full py-3.5 text-sm font-black text-amber-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Enviando Avaliação...</span>
                    </>
                  ) : (
                    <>
                      <Star className="w-5 h-5 fill-amber-900" />
                      <span>Enviar Avaliação</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Rodapé com Validade do Token */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
          <span>Validade do Link: 7 dias</span>
          {expira_em && <span>Expira em: {formatarData(expira_em)}</span>}
        </div>
      </div>
    </div>
  )
}