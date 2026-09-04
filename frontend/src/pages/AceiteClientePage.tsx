import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  UserCheck,
  MapPin,
  Mail,
  Phone,
  Globe,
  Loader2,
  ArrowRight,
  Sparkles,
  Lock,
  Tag,
} from 'lucide-react'
import { clientService } from '../api/client'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useToast } from '../contexts/ToastContext'

export function AceiteClientePage() {
  const { token } = useParams<{ token: string }>()
  const toast = useToast()

  const [concordouTermos, setConcordouTermos] = useState(false)
  const [feedbackState, setFeedbackState] = useState<'idle' | 'aceito'>('idle')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['aceite_cliente', token],
    queryFn: () => (token ? clientService.clientes.obterAceite(token) : null),
    enabled: Boolean(token),
    retry: false,
  })

  const aceiteMutation = useMutation({
    mutationFn: () => (token ? clientService.clientes.concederAceite(token) : Promise.reject()),
    onSuccess: (res: any) => {
      setFeedbackState('aceito')
      toast.success(
        res.detail || 'Cadastro aprovado e e-mail verificado com sucesso! Conta ativa no SHM.',
        'Organização Aprovada'
      )
      refetch()
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Erro ao formalizar aprovação do cadastro.'
      toast.error(msg, 'Falha na Aprovação')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-600 dark:text-slate-400 gap-3 text-sm font-bold relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
          <ThemeToggle />
        </div>
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span>Validando link de aprovação e dados cadastrais...</span>
      </div>
    )
  }

  if (error || !data || !data.cliente) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
          <ThemeToggle />
        </div>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Link de Aprovação Não Encontrado</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Este link seguro não é válido, foi cancelado ou expirou. Solicite um novo link de aprovação ao administrador do sistema.
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

  const { cliente, expirado, expira_em, usado, usado_em } = data
  const isJaAceito = usado || feedbackState === 'aceito' || (cliente.status === 'ativo' && cliente.email_verificado)

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

  const isPJ = cliente.tipo === 'PJ'

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
                Confirmação Cadastral & Validação de E-mail do Gestor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Validação Segura</span>
          </div>
        </div>

        {/* ESTADO 1: CADASTRO JÁ ACEITO / ATIVO COM E-MAIL VERIFICADO */}
        {isJaAceito && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400">
                  Organização Ativa & E-mail Verificado
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  Aprovação Cadastral Formalizada com Sucesso!
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                O cadastro de <strong>{cliente.display_name}</strong> foi formalizado em{' '}
                <strong>{formatarDataHora(usado_em || cliente.aprovado_em)}</strong>. O endereço de e-mail{' '}
                <strong>{cliente.email_contato}</strong> foi autenticado e a conta está ativa para acompanhamento de pedidos e suporte.
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

        {/* ESTADO 2: LINK EXPIRADO (7 DIAS) */}
        {!isJaAceito && expirado && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 sm:p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Prazo de Aprovação Expirado</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Este link seguro expirou após o prazo de validade de 7 dias (em {formatarDataHora(expira_em)}). Solicite o reenvio de um novo Magic Link ao administrador do sistema para ativar o cadastro da organização.
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

        {/* ESTADO 3: PENDENTE DE APROVAÇÃO (FLUXO PRINCIPAL) */}
        {!isJaAceito && !expirado && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Bloco de Boas-Vindas & Alerta */}
            <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
              <div className="font-extrabold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Novo Cadastro de Cliente — Aguardando Aprovação do Gestor</span>
              </div>
              <p className="text-[11px] leading-relaxed text-indigo-900/80 dark:text-indigo-300">
                Por favor, confira os dados cadastrais da organização abaixo. Ao concordar e formalizar o aceite, o seu e-mail será verificado automaticamente e a organização ativada no Portal SHM.
              </p>
            </div>

            {/* Card com Detalhes Completos do Cliente */}
            <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-4">
              {/* Topo do Card com Identificação */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  {cliente.logo_url ? (
                    <img
                      src={cliente.logo_url}
                      alt={cliente.display_name}
                      className="w-12 h-12 rounded-2xl object-contain bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                      {cliente.display_name ? cliente.display_name[0].toUpperCase() : 'C'}
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">
                      {isPJ ? 'Organização Contratante (PJ)' : 'Pessoa Física (PF)'}
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">
                      {cliente.display_name}
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-black self-start sm:self-auto">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pendente de Aprovação (7 dias)</span>
                </div>
              </div>

              {/* Grid 1: Dados Fiscais / Identificação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {isPJ ? (
                  <>
                    <div className="flex items-start gap-2.5">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">Razão Social</div>
                        <div className="font-extrabold text-slate-900 dark:text-white">{cliente.razao_social || 'Não informada'}</div>
                        {cliente.nome_fantasia && (
                          <div className="text-[11px] text-slate-500">Fantasia: {cliente.nome_fantasia}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Tag className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">CNPJ & Inscrições</div>
                        <div className="font-mono font-black text-slate-900 dark:text-white">{cliente.cnpj || 'Não informado'}</div>
                        {(cliente.inscricao_estadual || cliente.inscricao_municipal) && (
                          <div className="text-[10px] text-slate-500">
                            {cliente.inscricao_estadual ? `IE: ${cliente.inscricao_estadual}` : ''}
                            {cliente.inscricao_estadual && cliente.inscricao_municipal ? ' • ' : ''}
                            {cliente.inscricao_municipal ? `IM: ${cliente.inscricao_municipal}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">Nome Completo</div>
                        <div className="font-extrabold text-slate-900 dark:text-white">{cliente.nome_completo}</div>
                        {cliente.rg && <div className="text-[10px] text-slate-500">RG: {cliente.rg}</div>}
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Tag className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">CPF & Nascimento</div>
                        <div className="font-mono font-black text-slate-900 dark:text-white">{cliente.cpf}</div>
                        {cliente.data_nascimento && (
                          <div className="text-[10px] text-slate-500">Nasc: {formatarData(cliente.data_nascimento)}</div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {cliente.ramo_atividade && (
                  <div className="sm:col-span-2 flex items-start gap-2.5 pt-1">
                    <Tag className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Segmento / Ramo de Atuação</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{cliente.ramo_atividade}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid 2: Contatos & Gestor */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-2.5">
                  Gestor Responsável & Contatos Cadastrados
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-start gap-2.5">
                    <UserCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Ponto Focal / Gestor</div>
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {cliente.pessoa_contato || cliente.nome_completo || 'Gestor Responsável'}
                      </div>
                      {cliente.cargo_contato && (
                        <div className="text-[10px] text-slate-500">{cliente.cargo_contato}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                        <span>E-mail Principal de Contato</span>
                        <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded-full font-bold">
                          Será validado
                        </span>
                      </div>
                      <div className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-[11px] truncate">
                        {cliente.email_contato}
                      </div>
                    </div>
                  </div>

                  {(cliente.celular_whatsapp || cliente.telefone) && (
                    <div className="flex items-start gap-2.5">
                      <Phone className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">Telefones</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {cliente.celular_whatsapp || cliente.telefone}
                        </div>
                      </div>
                    </div>
                  )}

                  {cliente.site_url && (
                    <div className="flex items-start gap-2.5">
                      <Globe className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">Website Oficial</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {cliente.site_url}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Endereço */}
              {(cliente.logradouro || cliente.cidade || cliente.cep) && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Endereço Cadastrado</span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    {[
                      cliente.logradouro ? `${cliente.logradouro}${cliente.numero ? `, ${cliente.numero}` : ''}${cliente.complemento ? ` - ${cliente.complemento}` : ''}` : '',
                      cliente.bairro,
                      cliente.cidade && cliente.estado ? `${cliente.cidade} - ${cliente.estado}` : cliente.cidade || cliente.estado,
                      cliente.cep ? `CEP: ${cliente.cep}` : '',
                      cliente.pais && cliente.pais !== 'Brasil' ? cliente.pais : '',
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </div>
                </div>
              )}

              {/* E-mails de Notificação Padrão */}
              {cliente.emails_notificacao_padrao && cliente.emails_notificacao_padrao.length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    E-mails Cadastrados para Notificações ({cliente.emails_notificacao_padrao.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cliente.emails_notificacao_padrao.map((e: any, idx: number) => (
                      <span
                        key={idx}
                        className="text-[11px] font-mono px-2.5 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      >
                        {e.email || e} {e.nome ? `(${e.nome})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Termo de Concordância & Checkbox (Idêntico ao Aceite de Contratos) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={concordouTermos}
                  onChange={(e) => setConcordouTermos(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">
                  Declaro que sou o gestor / responsável autorizado e <strong>concordo com todos os dados cadastrais informados</strong>, aprovando a inclusão desta organização no sistema SHM, <strong>validando automaticamente este endereço de e-mail</strong> e autorizando o recebimento de notificações operacionais.
                </div>
              </label>
            </div>

            {/* Botão de Formalização de Aceite & Validação de E-mail */}
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
                    <span>Validando E-mail & Aprovando Cadastro...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Concordar & Aprovar Cadastro</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 text-center">
                <Lock className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  Registro seguro com validação automática de e-mail, captura forense de IP, User-Agent e carimbo temporal oficial.
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
