import React, { useState } from 'react'
import { Trash2, X, ShieldAlert, Loader2, AlertTriangle, Building2, Shield } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import type { Cliente } from '../../types'

interface RemoverClienteModalProps {
  cliente: Cliente | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function RemoverClienteModal({ cliente, isOpen, onClose, onSuccess }: RemoverClienteModalProps) {
  const [justificativa, setJustificativa] = useState('')
  const [aceiteForense, setAceiteForense] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: ({ id, justificativa }: { id: number; justificativa: string }) =>
      clientService.clientes.delete(id, justificativa),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      queryClient.invalidateQueries({ queryKey: ['clientes_select'] })
      toast.success(
        `Cliente "${data?.cliente_nome || cliente?.display_name}" excluído com registro de auditoria forense.`,
        'Exclusão Concluída'
      )
      setJustificativa('')
      setAceiteForense(false)
      setError(null)
      if (onSuccess) onSuccess()
      onClose()
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.justificativa ||
        err.response?.data?.detail ||
        'Não foi possível excluir o cliente. Verifique se ele possui contratos ou pedidos vinculados.'
      setError(Array.isArray(msg) ? msg[0] : msg)
    },
  })

  if (!isOpen || !cliente) return null

  const totalContratos = cliente.total_contratos || 0
  const possuiContratos = totalContratos > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (possuiContratos) {
      setError('A exclusão está bloqueada: este cliente possui contratos vinculados.')
      return
    }
    const trimmed = justificativa.trim()
    if (!trimmed || trimmed.length < 5) {
      setError('Por favor, informe uma justificativa detalhada com no mínimo 5 caracteres.')
      return
    }
    if (!aceiteForense) {
      setError('É obrigatório marcar o termo de ciência e aceite forense para prosseguir.')
      return
    }

    setError(null)
    deleteMutation.mutate({ id: cliente.id, justificativa: trimmed })
  }

  const handleClose = () => {
    if (deleteMutation.isPending) return
    setJustificativa('')
    setAceiteForense(false)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 shadow-2xl max-w-lg w-full overflow-hidden transition-all">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Excluir Cadastro do Cliente</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs font-bold text-rose-800 dark:text-rose-300 truncate max-w-[220px]">
                  {cliente.display_name}
                </span>
                {(cliente.cnpj || cliente.cpf) && (
                  <span className="text-[10px] font-mono bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                    {cliente.cnpj || cliente.cpf}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Card com Detalhes do Cliente */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-3">
              {cliente.logo_url ? (
                <img
                  src={cliente.logo_url}
                  alt={cliente.display_name}
                  className="w-10 h-10 rounded-xl object-contain bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                  {cliente.display_name ? cliente.display_name[0].toUpperCase() : 'C'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate block">
                    {cliente.razao_social || cliente.nome_completo || cliente.display_name}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                    {cliente.tipo}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  <span>{cliente.email_contato}</span>
                  {cliente.cidade && (
                    <>
                      <span>•</span>
                      <span>
                        {cliente.cidade} - {cliente.estado}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Badges de Contratos e Usuários */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/60 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                <span>Contratos Vinculados:</span>
                <span className={`font-black ${possuiContratos ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {totalContratos}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                <Shield className="w-3.5 h-3.5 text-violet-600" />
                <span>Usuários da Organização:</span>
                <span className="font-black text-slate-900 dark:text-slate-100">
                  {cliente.total_usuarios || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Cenário 1: CLIENTE POSSUI CONTRATOS -> EXCLUSÃO BLOQUEADA */}
          {possuiContratos ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 space-y-2 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-amber-950 dark:text-amber-200">
                    Exclusão Bloqueada por Diretriz de Conformidade
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-1 leading-relaxed">
                    Este cliente possui <strong>{totalContratos} contrato(s)</strong> no sistema. De acordo com as normas de governança, auditoria forense e integridade contábil do SHM, clientes com contratos vinculados <strong>nunca podem ser excluídos fisicamente</strong> para manter o histórico fiscal e contratual intacto.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200">
                <span className="font-black block mb-0.5">Orientações de Operação:</span>
                <p>
                  Caso esta empresa não esteja mais em atividade, você pode <strong>inativar</strong> ou <strong>suspender</strong> seu acesso editando o cadastro e alterando seu status para "Inativo" ou "Suspenso".
                </p>
              </div>
            </div>
          ) : (
            /* Cenário 2: CLIENTE SEM CONTRATOS -> PERMITE EXCLUSÃO COM AUDITORIA FORENSE */
            <>
              {/* Alerta de Auditoria Forense */}
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Auditoria Forense Permanente e Imutabilidade</p>
                  <p className="text-[11px] text-rose-800 dark:text-rose-300/90 mt-0.5 leading-relaxed">
                    A exclusão removerá o registro cadastral definitivamente. A operação será carimbada de forma indelével na trilha de auditoria forense com seu usuário (Administrador da Empresa), carimbo de data/hora, endereço IP de origem, User-Agent e a justificativa técnica informada.
                  </p>
                </div>
              </div>

              {/* Justificativa Obrigatória */}
              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                  Justificativa da Exclusão <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={justificativa}
                  onChange={(e) => {
                    setJustificativa(e.target.value)
                    if (error) setError(null)
                  }}
                  placeholder="Descreva detalhadamente o motivo da exclusão definitiva (ex: cadastro de teste criado por equívoco, cancelamento prévio de proposta antes da assinatura de contrato)..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 transition resize-none placeholder:text-slate-400"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1 px-1">
                  <span>Mínimo de 5 caracteres</span>
                  <span>{justificativa.trim().length} caracteres</span>
                </div>
              </div>

              {/* Aceite e Declaração de Ciência */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={aceiteForense}
                    onChange={(e) => {
                      setAceiteForense(e.target.checked)
                      if (error) setError(null)
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                  />
                  <div className="text-[11px] leading-relaxed">
                    <span className="font-black text-slate-900 dark:text-slate-100 block">
                      Declaração de Ciência e Aceite Forense <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Declaro estar ciente de que esta organização não possui contratos ou pedidos ativos, que esta ação é irreversível e autorizo o registro formal desta operação na auditoria forense do sistema.
                    </span>
                  </div>
                </label>
              </div>
            </>
          )}

          {/* Feedback de Erro */}
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={handleClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              {possuiContratos ? 'Fechar' : 'Cancelar'}
            </button>

            {possuiContratos ? (
              <button
                type="button"
                disabled
                className="px-5 py-2.5 text-xs font-black text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-800 rounded-xl cursor-not-allowed border border-slate-300 dark:border-slate-700"
              >
                Exclusão Bloqueada (Possui Contratos)
              </button>
            ) : (
              <button
                type="submit"
                disabled={deleteMutation.isPending || justificativa.trim().length < 5 || !aceiteForense}
                className="px-5 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs shadow-rose-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo com Auditoria...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão (Auditado)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
