import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Clock, CheckCircle2 } from 'lucide-react'
import { clientService } from '../api/client'

export function MagicLinkPage() {
  const { token } = useParams<{ token: string }>()
  const [justificativa] = useState('')
  const [sucesso, setSucesso] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['magic_link', token],
    queryFn: () => (token ? clientService.ciclos.getMagicLink(token) : null),
    enabled: Boolean(token),
  })

  const actionMutation = useMutation({
    mutationFn: ({ acao, justificativa }: { acao: string; justificativa?: string }) =>
      token ? clientService.ciclos.postMagicLink(token, { acao, justificativa }) : Promise.reject(),
    onSuccess: (res: any) => {
      setSucesso(res.detail)
      refetch()
    },
  })

  if (isLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Carregando aprovação...</div>
  if (!data) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-rose-400">Token inválido ou expirado.</div>

  const { ciclo, pedido_protocolo, pedido_assunto, cliente_nome } = data

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-indigo-600 font-black text-lg">
            <Clock className="w-6 h-6" />
            <span>SHM Magic Link</span>
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold">
            {pedido_protocolo}
          </span>
        </div>

        <div>
          <div className="text-xs text-slate-400 font-semibold">{cliente_nome}</div>
          <h2 className="text-xl font-black text-slate-900 mt-1">{pedido_assunto}</h2>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500">
            <span>Ciclo: <strong className="text-slate-800">{ciclo.tipo_display}</strong></span>
            <span>Status: <strong className="text-indigo-600 uppercase">{ciclo.status_display}</strong></span>
          </div>
          <p className="text-xs text-slate-700">{ciclo.contexto || 'Sem contexto detalhado.'}</p>
          <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold">
            <span>Estimadas: {ciclo.horas_estimadas}h</span>
            <span>Realizadas: {ciclo.horas_realizadas}h</span>
          </div>
        </div>

        {sucesso ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-bold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{sucesso}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {ciclo.status === 'aguardando_aprovacao' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => actionMutation.mutate({ acao: 'rejeitar', justificativa })}
                  className="py-3 text-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition"
                >
                  Rejeitar Orçamento
                </button>
                <button
                  onClick={() => actionMutation.mutate({ acao: 'aprovar' })}
                  className="py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
                >
                  Aprovar Orçamento
                </button>
              </div>
            )}

            {ciclo.status === 'aguardando_aceite' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => actionMutation.mutate({ acao: 'recusar', justificativa })}
                  className="py-3 text-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition"
                >
                  Recusar Aceite
                </button>
                <button
                  onClick={() => actionMutation.mutate({ acao: 'aceitar' })}
                  className="py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
                >
                  Conceder Aceite Final
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}