import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Send, Trash2, Clock } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import type { Tarefa } from '../types'

export function ExecucaoCicloPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [descricaoTarefa, setDescricaoTarefa] = useState('')
  const [horasRealizadas, setHorasRealizadas] = useState('1.0')

  const { data: ciclo, isLoading } = useQuery({
    queryKey: ['ciclo_detail', id],
    queryFn: () => (id ? clientService.ciclos.get(Number(id)) : null),
    enabled: Boolean(id),
  })

  const addTarefaMutation = useMutation({
    mutationFn: (data: Partial<Tarefa>) => clientService.tarefas.create(data),
    onSuccess: () => {
      setDescricaoTarefa('')
      setHorasRealizadas('1.0')
      queryClient.invalidateQueries({ queryKey: ['ciclo_detail', id] })
    },
  })

  const deleteTarefaMutation = useMutation({
    mutationFn: (tarefaId: number) => clientService.tarefas.delete(tarefaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ciclo_detail', id] }),
  })

  const solicitarAceiteMutation = useMutation({
    mutationFn: () => (id ? clientService.ciclos.solicitarAceite(Number(id)) : Promise.reject()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ciclo_detail', id] }),
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
          <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 mb-3 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
            <span>Voltar ao Painel Operacional</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Execução do Ciclo #{ciclo.id} ({ciclo.tipo_display})</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">{ciclo.contexto || 'Sem contexto informado.'}</p>
            </div>
            <span className="text-xs font-black px-3.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-full uppercase tracking-wider border border-indigo-200 self-start sm:self-auto">
              {ciclo.status_display}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Apontar Nova Tarefa / Horas Gastas</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <input
                type="text"
                value={descricaoTarefa}
                onChange={(e) => setDescricaoTarefa(e.target.value)}
                placeholder="Descreva a atividade técnica realizada..."
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300/80 rounded-2xl p-3.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              />
            </div>
            <div>
              <input
                type="number"
                step="0.5"
                value={horasRealizadas}
                onChange={(e) => setHorasRealizadas(e.target.value)}
                placeholder="Horas gastas"
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300/80 rounded-2xl p-3.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              disabled={!descricaoTarefa.trim()}
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
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Tarefa</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <span className="font-extrabold text-sm text-slate-900">Tarefas Apontadas ({tarefas.length})</span>
            <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Total Gasto: {Number(ciclo.horas_realizadas).toFixed(1)}h
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {tarefas.map((t) => (
              <div key={t.id} className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition">
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-slate-900">{t.descricao}</div>
                  <div className="text-xs text-slate-400 font-medium">Status: {t.status_display}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-sm text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                    {Number(t.horas_realizadas).toFixed(1)}h
                  </span>
                  <button
                    onClick={() => deleteTarefaMutation.mutate(t.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Excluir Apontamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {tarefas.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Nenhum apontamento lançado até o momento.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={() => solicitarAceiteMutation.mutate()}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm px-7 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Finalizar & Solicitar Aceite do Cliente ({Number(ciclo.horas_realizadas).toFixed(1)}h)</span>
          </button>
        </div>
      </div>
    </AppLayout>
  )
}