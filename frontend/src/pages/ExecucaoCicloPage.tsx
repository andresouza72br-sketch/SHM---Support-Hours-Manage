import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Send, Trash2 } from 'lucide-react'
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
        <div className="p-12 text-center text-slate-400">Carregando ciclo...</div>
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

  const tarefas = ciclo.tarefas || []

  return (
    <AppLayout showSidebar={false}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 mb-3">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Painel Operacional</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Execução do Ciclo #{ciclo.id} ({ciclo.tipo_display})</h1>
              <p className="text-xs text-slate-500">{ciclo.contexto || 'Sem contexto informado.'}</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full uppercase">
              {ciclo.status_display}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-800">Apontar Nova Tarefa / Horas Gastas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <input
                type="text"
                value={descricaoTarefa}
                onChange={(e) => setDescricaoTarefa(e.target.value)}
                placeholder="Descreva a atividade realizada..."
                className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <input
                type="number"
                step="0.5"
                value={horasRealizadas}
                onChange={(e) => setHorasRealizadas(e.target.value)}
                placeholder="Horas gastas"
                className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Tarefa</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-sm text-slate-800">Tarefas Apontadas ({tarefas.length})</span>
            <span className="text-xs font-black text-indigo-700">Total Gasto: {ciclo.horas_realizadas}h</span>
          </div>
          <div className="divide-y divide-slate-100">
            {tarefas.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-sm text-slate-800">{t.descricao}</div>
                  <div className="text-xs text-slate-400">Status: {t.status_display}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-sm text-slate-900">{t.horas_realizadas}h</span>
                  <button
                    onClick={() => deleteTarefaMutation.mutate(t.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={() => solicitarAceiteMutation.mutate()}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md shadow-emerald-200 transition"
          >
            <Send className="w-4 h-4" />
            <span>Finalizar & Solicitar Aceite do Cliente</span>
          </button>
        </div>
      </div>
    </AppLayout>
  )
}