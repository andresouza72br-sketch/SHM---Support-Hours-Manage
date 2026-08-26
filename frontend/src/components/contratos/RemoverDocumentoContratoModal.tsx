import React, { useState } from 'react'
import { Trash2, X, ShieldAlert, Loader2, Fingerprint, FileText, AlertTriangle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import type { Contrato, ContratoDocumento } from '../../types'

interface RemoverDocumentoContratoModalProps {
  isOpen: boolean
  onClose: () => void
  contrato: Contrato | null
  documento: ContratoDocumento | null
  onSuccess?: () => void
}

export function RemoverDocumentoContratoModal({
  isOpen,
  onClose,
  contrato,
  documento,
  onSuccess,
}: RemoverDocumentoContratoModalProps) {
  const [justificativa, setJustificativa] = useState('')
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: ({ contratoId, docId, justificativa }: { contratoId: number; docId: number; justificativa: string }) =>
      clientService.contratos.deleteDocumento(contratoId, docId, justificativa),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      queryClient.invalidateQueries({ queryKey: ['extrato'] })
      toast.success(
        `Documento "${documento?.nome_original}" removido com registro de auditoria forense.`,
        'Remoção Concluída'
      )
      setJustificativa('')
      setError(null)
      if (onSuccess) onSuccess()
      onClose()
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.justificativa ||
        err.response?.data?.detail ||
        'Erro ao remover documento do contrato. Apenas o Gerente da Empresa possui autorização.'
      setError(Array.isArray(msg) ? msg[0] : msg)
    },
  })

  if (!isOpen || !contrato || !documento) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = justificativa.trim()
    if (!trimmed || trimmed.length < 5) {
      setError('Por favor, informe uma justificativa detalhada com no mínimo 5 caracteres.')
      return
    }
    setError(null)
    deleteMutation.mutate({
      contratoId: contrato.id,
      docId: documento.id,
      justificativa: trimmed,
    })
  }

  const handleClose = () => {
    if (deleteMutation.isPending) return
    setJustificativa('')
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 shadow-2xl max-w-lg w-full overflow-hidden transition-all">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Remover Documento Anexo</h2>
              <p className="font-mono text-xs font-bold text-rose-800 dark:text-rose-300 mt-0.5">
                {contrato.numero} — {contrato.cliente_nome}
              </p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Card com Detalhes do Documento a ser Excluído */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate block">
                  {documento.nome_original}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {documento.tipo_documento_display || 'Documento'} • {documento.tamanho_formatado}
                </span>
              </div>
            </div>

            {documento.hash_sha256 && (
              <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700/60 text-[9px] font-mono text-slate-600 dark:text-slate-400">
                <Fingerprint className="w-3 h-3 text-indigo-500 shrink-0" />
                <span className="font-semibold text-slate-500">SHA-256:</span>
                <span className="truncate font-bold text-slate-800 dark:text-slate-300" title={documento.hash_sha256}>
                  {documento.hash_sha256}
                </span>
              </div>
            )}
          </div>

          {/* Aviso Forense e Regra de Segurança */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Auditoria Forense Permanente</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                A remoção física é <strong>irreversível</strong> e será carimbada na trilha de auditoria do contrato com seu usuário (Gerente da Empresa), IP, User-Agent, hash SHA-256 e a justificativa técnica informada.
              </p>
            </div>
          </div>

          {/* Campo de Justificativa Obrigatória */}
          <div>
            <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
              Justificativa da Remoção <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={justificativa}
              onChange={(e) => {
                setJustificativa(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Descreva obrigatoriamente o motivo da remoção (ex: substituição por versão aditiva atualizada, documento inserido em contrato incorreto)..."
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 transition resize-none placeholder:text-slate-400"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1 px-1">
              <span>Mínimo de 5 caracteres</span>
              <span>{justificativa.trim().length} caracteres</span>
            </div>
          </div>

          {/* Mensagem de Erro */}
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
              Cancelar
            </button>
            <button
              type="submit"
              disabled={deleteMutation.isPending || justificativa.trim().length < 5}
              className="px-5 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs shadow-rose-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Removendo com Auditoria...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirmar Remoção (Auditado)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
