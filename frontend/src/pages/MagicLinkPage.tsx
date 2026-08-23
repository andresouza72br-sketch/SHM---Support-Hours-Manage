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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm font-semibold">
        Carregando aprovação segura...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-rose-400 text-sm font-bold">
        Token inválido ou expirado.
      </div>
    )
  }

  const { ciclo, pedido_protocolo, pedido_assunto, cliente_nome } = data

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col justify-center items-center p-4">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 relative z-10 border border-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-indigo-600 font-extrabold text-lg">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <span>SHM Magic Link</span>
          </div>
          <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
            {pedido_protocolo}
          </span>
        </div>

        <div>
          <div className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">{cliente_nome}</div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{pedido_assunto}</h2>
        </div>

        <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
            <span>Ciclo: <strong className="text-slate-900">{ciclo.tipo_display}</strong></span>
            <span className="text-indigo-600 font-extrabold uppercase">{ciclo.status_display}</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">{ciclo.contexto || 'Sem contexto detalhado.'}</p>
          <div className="flex justify-between pt-3 border-t border-slate-200 text-xs font-black">
            <span>Estimadas: {Number(ciclo.horas_estimadas).toFixed(1)}h</span>
            <span className="text-indigo-600">Realizadas: {Number(ciclo.horas_realizadas).toFixed(1)}h</span>
          </div>
        </div>

        {sucesso ? (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-extrabold text-center flex items-center justify-center gap-2 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{sucesso}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {ciclo.status === 'aguardando_aprovacao' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => actionMutation.mutate({ acao: 'rejeitar', justificativa })}
                  className="py-3.5 text-xs font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-2xl transition cursor-pointer"
                >
                  Rejeitar Orçamento
                </button>
                <button
                  onClick={() => actionMutation.mutate({ acao: 'aprovar' })}
                  className="py-3.5 text-xs font-extrabold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-2xl shadow-lg shadow-indigo-500/20 transition cursor-pointer"
                >
                  Aprovar Orçamento ({Number(ciclo.horas_estimadas).toFixed(1)}h)
                </button>
              </div>
            )}

            {ciclo.status === 'aguardando_aceite' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => actionMutation.mutate({ acao: 'recusar', justificativa })}
                  className="py-3.5 text-xs font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-2xl transition cursor-pointer"
                >
                  Recusar Aceite
                </button>
                <button
                  onClick={() => actionMutation.mutate({ acao: 'aceitar' })}
                  className="py-3.5 text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                >
                  Conceder Aceite Final ({Number(ciclo.horas_realizadas).toFixed(1)}h)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}