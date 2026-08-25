import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Send, Trash2, Clock, MessageSquare, Loader2 } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { Tarefa } from '../types'

export function ExecucaoCicloPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [descricaoTarefa, setDescricaoTarefa] = useState('')
  const [horasRealizadas, setHorasRealizadas] = useState('1.0')

  const { data: ciclo, isLoading } = useQuery({
    queryKey: ['ciclo_detail', id],
    queryFn: () => (id ? clientService.ciclos.get(Number(id)) : null),
    enabled: Boolean(id),
    refetchInterval: 5000,
  })

  const addTarefaMutation = useMutation({
    mutationFn: (data: Partial<Tarefa>) => clientService.tarefas.create(data),
    onSuccess: () => {
      setDescricaoTarefa('')
      setHorasRealizadas('1.0')
      queryClient.invalidateQueries({ queryKey: ['ciclo_detail', id] })
      toast.success('Apontamento de horas lançado com sucesso!', 'Tarefa Registrada')
    },
    onError: () => toast.error('Erro ao registrar tarefa.', 'Falha'),
  })

  const deleteTarefaMutation = useMutation({
    mutationFn: (tarefaId: number) => clientService.tarefas.delete(tarefaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ciclo_detail', id] })
      toast.info('Apontamento de tarefa excluído com sucesso.', 'Tarefa Excluída')
    },
    onError: () => toast.error('Erro ao excluir tarefa.', 'Falha'),
  })

  const solicitarAceiteMutation = useMutation({
    mutationFn: () => (id ? clientService.ciclos.solicitarAceite(Number(id)) : Promise.reject()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ciclo_detail', id] })
      toast.success('Solicitação de aceite enviada ao cliente com sucesso!', 'Aceite Solicitado')
    },
    onError: () => toast.error('Erro ao solicitar aceite.', 'Falha'),
  })

  if (isLoading) {
    return (
      <AppLayout showSidebar={false}>
        <div className="p-12 text-center text-slate-400 font-semibold">Carregando ciclo...</div>
      </AppLayout>
    )
  }

  if (!ciclo) {
    return (
      <AppLayout showSidebar={false}>
        <div className="p-12 text-center text-rose-500 font-bold">Ciclo não encontrado.</div>
      </AppLayout>
    )
  }

  const tarefas = Array.isArray(ciclo.tarefas) ? ciclo.tarefas : []

  return (
    <AppLayout showSidebar={false}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mb-3 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
            <span>Voltar ao Painel Operacional</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Execução do Ciclo #{ciclo.id} ({ciclo.tipo_display})</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{ciclo.contexto || 'Sem contexto informado.'}</p>
            </div>
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <Link
                to={`/pedidos/${ciclo.pedido}`}
                className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Ver Comentários</span>
              </Link>
              <span className="text-xs font-black px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full uppercase tracking-wider border border-indigo-200 dark:border-indigo-800/60">
                {ciclo.status_display}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-5 transition-colors">
          <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Apontar Nova Tarefa / Horas Gastas</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <input
                type="text"
                value={descricaoTarefa}
                onChange={(e) => setDescricaoTarefa(e.target.value)}
                placeholder="Descreva a atividade técnica realizada..."
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 rounded-2xl p-3.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <input
                type="number"
                step="0.5"
                value={horasRealizadas}
                onChange={(e) => setHorasRealizadas(e.target.value)}
                placeholder="Horas gastas"
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 rounded-2xl p-3.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              disabled={!descricaoTarefa.trim() || addTarefaMutation.isPending}
              onClick={() => {
                addTarefaMutation.mutate({
                  ciclo: ciclo.id,
                  descricao: descricaoTarefa.trim(),
                  horas_estimadas: Number(horasRealizadas),
                  horas_realizadas: Number(horasRealizadas),
                  status: 'realizada',
                  operador: user?.id,
                })
              }}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-md transition disabled:opacity-50 disabled:cursor-wait cursor-pointer"
            >
              {addTarefaMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando Tarefa...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Registrar Tarefa</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs transition-colors">
          <div className="p-5 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="font-extrabold text-sm text-slate-900 dark:text-white">Tarefas Apontadas ({tarefas.length})</span>
            <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/60">
              Total Gasto: {Number(ciclo.horas_realizadas).toFixed(1)}h
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tarefas.map((t) => (
              <div key={t.id} className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{t.descricao}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-400 font-medium">Status: {t.status_display}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-sm text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700">
                    {Number(t.horas_realizadas).toFixed(1)}h
                  </span>
                  <button
                    disabled={deleteTarefaMutation.isPending && (deleteTarefaMutation.variables as any) === t.id}
                    onClick={() => deleteTarefaMutation.mutate(t.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer disabled:opacity-50"
                    title="Excluir Apontamento"
                  >
                    {deleteTarefaMutation.isPending && (deleteTarefaMutation.variables as any) === t.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}

            {tarefas.length === 0 && (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs italic">
                Nenhum apontamento lançado até o momento.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            disabled={solicitarAceiteMutation.isPending}
            onClick={() => solicitarAceiteMutation.mutate()}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm px-7 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-75 disabled:cursor-wait"
          >
            {solicitarAceiteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Solicitando Aceite do Cliente...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Finalizar & Solicitar Aceite do Cliente ({Number(ciclo.horas_realizadas).toFixed(1)}h)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  )
}