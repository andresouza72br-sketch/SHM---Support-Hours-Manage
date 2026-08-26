import React, { useState } from 'react'
import {
  Trash2,
  X,
  ShieldAlert,
  Loader2,
  Fingerprint,
  FileCheck,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import type { Contrato, ContratoDocumento } from '../../types'

interface ConfirmarRemoverDocumentoModalProps {
  contrato: Contrato | null
  documento: ContratoDocumento | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ConfirmarRemoverDocumentoModal({
  contrato,
  documento,
  isOpen,
  onClose,
  onSuccess,
}: ConfirmarRemoverDocumentoModalProps) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copiedHash, setCopiedHash] = useState(false)
  const toast = useToast()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: ({ contratoId, docId, motivo }: { contratoId: number; docId: number; motivo: string }) =>
      clientService.contratos.deleteDocumento(contratoId, docId, motivo),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      queryClient.invalidateQueries({ queryKey: ['extrato'] })
      toast.success(data?.detail || 'Documento removido com sucesso e auditado!', 'Exclusão Registrada')
      setMotivo('')
      setError(null)
      if (onSuccess) onSuccess()
      onClose()
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.motivo ||
        err.response?.data?.justificativa ||
        err.response?.data?.detail ||
        'Erro ao remover documento.'
      setError(Array.isArray(msg) ? msg[0] : msg)
    },
  })

  if (!isOpen || !contrato || !documento) return null

  const handleCopyHash = () => {
    if (!documento.hash_sha256) return
    navigator.clipboard.writeText(documento.hash_sha256)
    setCopiedHash(true)
    toast.success('Hash SHA-256 copiado para a área de transferência!', 'Copiado')
    setTimeout(() => setCopiedHash(false), 2000)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const motivoTrimmed = motivo.trim()
    if (!motivoTrimmed || motivoTrimmed.length < 5) {
      setError('Por favor, informe um motivo detalhado com no mínimo 5 caracteres para fins de auditoria.')
      return
    }
    setError(null)
    deleteMutation.mutate({
      contratoId: contrato.id,
      docId: documento.id,
      motivo: motivoTrimmed,
    })
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden transition-all">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Remover Documento</h2>
              <p className="font-mono text-xs font-bold text-rose-800 dark:text-rose-300 mt-0.5">
                {contrato.numero} — {contrato.cliente_nome}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-rose-100/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Card do Documento Alvo */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                <FileCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate" title={documento.nome_original}>
                  {documento.nome_original}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                    {documento.tipo_documento_display || documento.tipo_documento}
                  </span>
                  <span>•</span>
                  <span>{documento.tamanho_formatado}</span>
                  {documento.enviado_por_nome && (
                    <>
                      <span>•</span>
                      <span>Enviado por {documento.enviado_por_nome}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Hash SHA-256 */}
            {documento.hash_sha256 && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5 truncate">
                  <Fingerprint className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="font-semibold text-slate-400">SHA-256:</span>
                  <span className="truncate">{documento.hash_sha256}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="ml-2 p-1 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-400 transition shrink-0 cursor-pointer"
                  title="Copiar Hash SHA-256"
                >
                  {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Alerta de Auditoria Forense Obrigatória */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Auditoria Forense Obrigatória</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                Apenas o <strong>Gerente da Empresa</strong> pode remover arquivos anexos. A exclusão, o motivo fornecido, o IP e o hash criptográfico original serão gravados permanentemente no log de auditoria forense deste contrato.
              </p>
            </div>
          </div>

          {/* Campo Motivo */}
          <div>
            <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
              Motivo da Remoção <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Descreva o motivo da exclusão (ex: substituição por minuta assinada atualizada, documento anexado em duplicidade, rescisão formal)..."
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 transition resize-none placeholder:text-slate-400"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1 px-1">
              <span>Mínimo de 5 caracteres</span>
              <span>{motivo.length} caracteres</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold">
              {error}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={deleteMutation.isPending}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={deleteMutation.isPending || motivo.trim().length < 5}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-rose-600/20 transition flex items-center gap-2 cursor-pointer"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Removendo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirmar Remoção</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
