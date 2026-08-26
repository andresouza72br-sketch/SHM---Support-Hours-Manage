import React, { useState } from 'react'
import { AlertTriangle, X, ShieldAlert, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import type { Contrato } from '../../types'

interface CancelarContratoModalProps {
  contrato: Contrato | null
  isOpen: boolean
  onClose: () => void
}

export function CancelarContratoModal({ contrato, isOpen, onClose }: CancelarContratoModalProps) {
  const [justificativa, setJustificativa] = useState('')
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const queryClient = useQueryClient()

  const cancelarMutation = useMutation({
    mutationFn: ({ id, justificativa }: { id: number; justificativa: string }) =>
      clientService.contratos.cancelar(id, justificativa),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      queryClient.invalidateQueries({ queryKey: ['extrato'] })
      toast.success(`Contrato ${data.contrato?.numero || contrato?.numero} cancelado com sucesso.`, 'Contrato Cancelado')
      setJustificativa('')
      setError(null)
      onClose()
    },
    onError: (err: any) => {
      const msg = err.response?.data?.justificativa || err.response?.data?.detail || 'Erro ao cancelar o contrato.'
      setError(Array.isArray(msg) ? msg[0] : msg)
    },
  })

  if (!isOpen || !contrato) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!justificativa.trim() || justificativa.trim().length < 5) {
      setError('Por favor, informe uma justificativa detalhada com no mínimo 5 caracteres.')
      return
    }
    setError(null)
    cancelarMutation.mutate({ id: contrato.id, justificativa: justificativa.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden transition-all">
        {/* Header */}
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Cancelar Contrato</h2>
              <span className="font-mono text-xs font-bold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800/60">
                {contrato.numero} — {contrato.cliente_nome}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Informative Alert regarding Immutable System Rule */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Diretriz de Imutabilidade e Auditoria Forense</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                Contratos <strong>nunca são excluídos</strong> do sistema para preservar a integridade jurídica e o histórico financeiro. O cancelamento desativará novas aberturas e registrará a justificativa na timeline oficial.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
              Justificativa do Gerente <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={justificativa}
              onChange={(e) => {
                setJustificativa(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Descreva o motivo do cancelamento do contrato (ex: rescisão amigável, término de escopo, solicitação formal do cliente)..."
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 transition resize-none placeholder:text-slate-400"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1 px-1">
              <span>Mínimo de 5 caracteres</span>
              <span>{justificativa.length} caracteres</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={cancelarMutation.isPending || justificativa.trim().length < 5}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-rose-600/20 transition flex items-center gap-2 cursor-pointer"
            >
              {cancelarMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Cancelando...</span>
                </>
              ) : (
                <span>Confirmar Cancelamento</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
