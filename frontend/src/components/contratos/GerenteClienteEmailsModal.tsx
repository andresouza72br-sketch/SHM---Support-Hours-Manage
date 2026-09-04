import { useState, useEffect, useRef } from 'react'
import {
  Mail,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Send,
  Clock,
  XCircle,
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import type { Contrato, EmailNotificacao } from '../../types'
import { ScrollToTopButton } from '../ui/ScrollToTopButton'

interface GerenteClienteEmailsModalProps {
  contrato: Contrato | null
  isOpen: boolean
  onClose: () => void
}

export function GerenteClienteEmailsModal({ contrato, isOpen, onClose }: GerenteClienteEmailsModalProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const emailsListRef = useRef<HTMLDivElement>(null)

  const [emails, setEmails] = useState<EmailNotificacao[]>(() => {
    if (!contrato) return []
    return Array.isArray(contrato.destinatarios) && contrato.destinatarios.length > 0
      ? [...contrato.destinatarios]
      : Array.isArray(contrato.emails_notificacao)
      ? [...contrato.emails_notificacao]
      : []
  })

  const [novoEmail, setNovoEmail] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [reenviandoEmail, setReenviandoEmail] = useState<string | null>(null)

  // Reset emails state when modal opens or contract changes
  useEffect(() => {
    if (contrato) {
      const lista =
        Array.isArray(contrato.destinatarios) && contrato.destinatarios.length > 0
          ? [...contrato.destinatarios]
          : Array.isArray(contrato.emails_notificacao)
          ? [...contrato.emails_notificacao]
          : []
      setEmails(lista)
      setError(null)
    }
  }, [contrato, isOpen])

  const mutation = useMutation({
    mutationFn: ({ id, lista }: { id: number; lista: EmailNotificacao[] }) =>
      clientService.contratos.atualizarEmails(id, lista),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      queryClient.invalidateQueries({ queryKey: ['extrato'] })
      toast.success(
        'Lista de e-mails atualizada! Convites de confirmação com validade de 15 dias foram disparados para novos endereços.',
        'E-mails e Convites Sincronizados'
      )
      onClose()
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Erro ao salvar a lista de e-mails.'
      setError(msg)
    },
  })

  const resendMutation = useMutation({
    mutationFn: (emailAlvo: string) =>
      clientService.contratos.reenviarConviteEmail(contrato!.id, { email: emailAlvo }),
    onSuccess: (res, emailAlvo) => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      queryClient.invalidateQueries({ queryKey: ['extrato'] })
      toast.success(
        res.detail || `Convite com validade de 15 dias reenviado para ${emailAlvo}!`,
        'Convite Reenviado'
      )
      setReenviandoEmail(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erro ao reenviar convite.', 'Erro')
      setReenviandoEmail(null)
    },
  })

  if (!isOpen || !contrato) return null

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault()
    const emailLimpo = novoEmail.trim().toLowerCase()
    if (!emailLimpo) return

    // Validação básica de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailLimpo)) {
      setError('Por favor, informe um endereço de e-mail válido.')
      return
    }

    if (emails.some((item) => item.email.toLowerCase() === emailLimpo)) {
      setError('Este endereço de e-mail já está presente na lista.')
      return
    }

    setEmails((prev) => [
      ...prev,
      {
        email: emailLimpo,
        nome: novoNome.trim() || undefined,
        ativo: true,
        status: 'pendente',
        dias_restantes: 15,
      },
    ])
    setNovoEmail('')
    setNovoNome('')
    setError(null)
  }

  const handleToggleAtivo = (index: number) => {
    setEmails((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ativo: !item.ativo } : item))
    )
  }

  const handleRemove = (index: number) => {
    setEmails((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleReenviar = (emailStr: string) => {
    setReenviandoEmail(emailStr)
    resendMutation.mutate(emailStr)
  }

  const handleSave = () => {
    mutation.mutate({
      id: contrato.id,
      lista: emails,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden transition-all flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">E-mails de Notificação & Confirmações</h2>
              <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                {contrato.numero} — {contrato.cliente_nome}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed space-y-1">
              <p>
                Marque com o <strong>check</strong> os e-mails da sua equipe que devem receber alertas de saldo baixo, pedidos, relatórios e extratos periódicos deste contrato.
              </p>
              <p className="text-indigo-700 dark:text-indigo-300 font-semibold">
                ✉️ Todo novo e-mail cadastrado recebe automaticamente um <strong>Magic Link com validade de 15 dias</strong> para confirmar o aceite.
              </p>
            </div>
          </div>

          {/* Adicionar Novo E-mail */}
          <form onSubmit={handleAddEmail} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">Adicionar Contato para Notificação</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="email"
                placeholder="E-mail (ex: contato@empresa.com)"
                value={novoEmail}
                onChange={(e) => {
                  setNovoEmail(e.target.value)
                  if (error) setError(null)
                }}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
              <input
                type="text"
                placeholder="Nome / Setor (ex: Roberto - Gestor)"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
            </div>
            <button
              type="submit"
              disabled={!novoEmail.trim()}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs shadow-indigo-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Incluir na Lista</span>
            </button>
          </form>

          {error && (
            <div className="p-3 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Lista de E-mails com Checkboxes e Status de Confirmação */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300 px-1">
              <span>Destinatários Cadastrados ({emails.length})</span>
              <span className="text-[10px] text-slate-500">
                {emails.filter((e) => e.ativo).length} ativos para envio
              </span>
            </div>

            <div className="relative">
              <ScrollToTopButton
                targetRef={emailsListRef}
                title="Rolar para o início dos destinatários"
                className="absolute top-2 left-1/2 -translate-x-1/2 z-20"
              />
              <div ref={emailsListRef} className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scroll-smooth">
              {emails.map((item, index) => {
                const status = item.status || 'pendente'
                const isConfirmado = status === 'confirmado'
                const isExpirado = status === 'expirado' || item.is_expirado
                const isRecusado = status === 'recusado'
                const isPendente = status === 'pendente' && !isExpirado

                return (
                  <div
                    key={index}
                    onClick={() => handleToggleAtivo(index)}
                    className={`p-3 rounded-2xl border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none ${
                      item.ativo
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800/80 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.ativo}
                        onChange={() => handleToggleAtivo(index)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                          {item.email}
                        </div>
                        {item.nome && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate">
                            {item.nome}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {/* Badge de Status de Confirmação */}
                      {isConfirmado && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Confirmado</span>
                        </span>
                      )}

                      {isPendente && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Pendente ({item.dias_restantes ?? 15}d)</span>
                        </span>
                      )}

                      {isExpirado && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          <span>Expirado (15d)</span>
                        </span>
                      )}

                      {isRecusado && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          <span>Recusado</span>
                        </span>
                      )}

                      {/* Botão Reenviar Convite se pendente ou expirado */}
                      {(!isConfirmado && contrato.id) && (
                        <button
                          type="button"
                          disabled={reenviandoEmail === item.email}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReenviar(item.email)
                          }}
                          className="px-2 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Reenviar e-mail de confirmação com novo link de 15 dias"
                        >
                          {reenviandoEmail === item.email ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          <span>Reenviar</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemove(index)
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Remover este e-mail"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {emails.length === 0 && (
                <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                  Nenhum e-mail de notificação cadastrado. Adicione acima os e-mails que devem receber avisos.
                </div>
              )}
            </div>
          </div>
        </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Salvando & Enviando Convites...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Salvar & Disparar Convites</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
