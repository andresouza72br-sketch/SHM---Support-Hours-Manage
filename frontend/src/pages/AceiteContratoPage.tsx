import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  UserCheck,
  Download,
  Loader2,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react'
import { clientService } from '../api/client'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useToast } from '../contexts/ToastContext'

export function AceiteContratoPage() {
  const { token } = useParams<{ token: string }>()
  const toast = useToast()

  const [concordouTermos, setConcordouTermos] = useState(false)
  const [feedbackState, setFeedbackState] = useState<'idle' | 'aceito'>('idle')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['aceite_contrato', token],
    queryFn: () => (token ? clientService.contratos.obterAceite(token) : null),
    enabled: Boolean(token),
    retry: false,
  })

  const aceiteMutation = useMutation({
    mutationFn: () => (token ? clientService.contratos.concederAceite(token) : Promise.reject()),
    onSuccess: (res: any) => {
      setFeedbackState('aceito')
      toast.success(res.detail || 'Aceite formalizado com sucesso! Trabalhos autorizados.', 'Contrato Ativo')
      refetch()
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Erro ao formalizar aceite do contrato.'
      toast.error(msg, 'Falha no Aceite')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-600 dark:text-slate-400 gap-3 text-sm font-bold relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
          <ThemeToggle />
        </div>
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span>Validando link de aceite e termos contratuais...</span>
      </div>
    )
  }

  if (error || !data || !data.contrato) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
          <ThemeToggle />
        </div>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Link de Aceite Não Encontrado</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Este link seguro não é válido, foi cancelado ou já expirou. Solicite um novo link ao gestor do contrato.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition"
          >
            <span>Ir para o Portal SHM</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const { contrato, cliente_nome, expirado, expira_em, usado, usado_em } = data
  const isJaAceito = usado || feedbackState === 'aceito' || contrato.status === 'ativo'

  const formatarData = (isoStr?: string | null) => {
    if (!isoStr) return 'Não informada'
    try {
      const [ano, mes, dia] = isoStr.split('T')[0].split('-')
      if (ano && mes && dia) return `${dia}/${mes}/${ano}`
      return new Date(isoStr).toLocaleDateString('pt-BR')
    } catch {
      return isoStr
    }
  }

  const formatarDataHora = (isoStr?: string | null) => {
    if (!isoStr) return ''
    try {
      return new Date(isoStr).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    } catch {
      return isoStr
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex flex-col justify-between items-center py-10 px-4 transition-colors duration-200">
      {/* Top Controls */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 dark:bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-600/10 dark:bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 relative z-10 border border-slate-200/90 dark:border-slate-800 transition-colors">
        {/* Header com Logo e Badge */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-500/20">
              S
            </div>
            <div>
              <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>SHM</span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Governança
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Formalização de Aceite do Contrato & Autorização de Trabalhos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Conformidade Legal</span>
          </div>
        </div>

        {/* ESTADO 1: CONTRATO JÁ ACEITO / ATIVO */}
        {isJaAceito && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400">
                  Contrato Ativo & Formalizado
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  Aceite Eletrônico Concluído com Sucesso!
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                O aceite do Contrato <strong>{contrato.numero}</strong> foi formalizado em{' '}
                <strong>{formatarDataHora(usado_em || contrato.data_aceite)}</strong>. O início da prestação de serviços técnicos,
                a franquia de <strong>{Number(contrato.horas_contratadas).toFixed(1)}h</strong> e o uso do sistema estão oficialmente liberados.
              </p>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-500/20"
                >
                  <span>Acessar Portal SHM</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ESTADO 2: LINK EXPIRADO */}
        {!isJaAceito && expirado && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 sm:p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Prazo de Aceite Expirado</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Este link seguro expirou após o prazo de 30 dias (em {formatarDataHora(expira_em)}). Solicite o reenvio de um novo link ao administrador do contrato para formalizar o início dos trabalhos.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-black text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition"
              >
                <span>Ir para a Página Inicial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ESTADO 3: PENDENTE DE ACEITE (FLUXO PRINCIPAL) */}
        {!isJaAceito && !expirado && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Bloco de Boas-Vindas */}
            <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
              <div className="font-extrabold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Novo Contrato Cadastrado — Aguardando Concordância do Responsável</span>
              </div>
              <p className="text-[11px] leading-relaxed text-indigo-900/80 dark:text-indigo-300">
                Por favor, revise as condições comerciais, escopo dos serviços e franquia de horas abaixo para autorizar o início da execução técnica e o uso do sistema.
              </p>
            </div>

            {/* Card com Detalhes do Contrato */}
            <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">
                    Contrato de Suporte Técnico
                  </div>
                  <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                    {contrato.numero}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-black self-start sm:self-auto">
                  <span>{contrato.tipo_display || 'Novo Contrato'}</span>
                </div>
              </div>

              {/* Grid com Dados do Contrato */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Cliente Contratante</div>
                    <div className="font-extrabold text-slate-900 dark:text-white">{cliente_nome}</div>
                    {data.cliente_cnpj_cpf && (
                      <div className="text-[10px] text-slate-500 font-mono">{data.cliente_cnpj_cpf}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <UserCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Gestor / Ponto Focal</div>
                    <div className="font-extrabold text-slate-900 dark:text-white">
                      {contrato.gestor_nome || 'Responsável pelo Contrato'}
                    </div>
                    {contrato.gestor_email && (
                      <div className="text-[10px] text-slate-500">{contrato.gestor_email}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Vigência</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {formatarData(contrato.data_inicio)} até {formatarData(contrato.data_termino)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <DollarSign className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Franquia & Faturamento</div>
                    <div className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                      {Number(contrato.horas_contratadas).toFixed(1)}h contratadas
                    </div>
                    {contrato.valor_mensal && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        R$ {Number(contrato.valor_mensal).toFixed(2)}/mês{' '}
                        {contrato.dia_faturamento ? `(Venc. dia ${contrato.dia_faturamento})` : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Objeto dos Serviços */}
              {contrato.descricao_servicos && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Objeto & Escopo dos Serviços
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    {contrato.descricao_servicos}
                  </div>
                </div>
              )}

              {/* Documentos Anexados */}
              {contrato.documentos && contrato.documentos.length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    Documentos e Minutas do Contrato ({contrato.documentos.length})
                  </div>
                  <div className="space-y-1.5">
                    {contrato.documentos.map((doc: any) => (
                      <a
                        key={doc.id}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-indigo-400 transition"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="truncate">{doc.nome_original}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({doc.tipo_documento_display})</span>
                        </div>
                        <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Termo de Concordância & Checkbox */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={concordouTermos}
                  onChange={(e) => setConcordouTermos(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">
                  Declaro que sou o responsável autorizado e <strong>concordo com a inclusão deste contrato</strong>, autorizando o início dos trabalhos técnicos pela equipe prestadora e o uso do sistema SHM para acompanhamento e controle de franquia de horas.
                </div>
              </label>
            </div>

            {/* Botão de Formalização de Aceite */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                disabled={!concordouTermos || aceiteMutation.isPending}
                onClick={() => aceiteMutation.mutate()}
                className="w-full py-4 px-6 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {aceiteMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Formalizando Aceite & Ativando Contrato...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Concordar & Autorizar Início dos Trabalhos</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 text-center">
                <Lock className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  Registro seguro com captura forense de IP, User-Agent e carimbo de data/hora oficial.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé do Card */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400 font-medium">
          SHM — Support Hours Manager • Gestão de Contratos de Suporte & Controle de Franquia de Horas
        </div>
      </div>
    </div>
  )
}
