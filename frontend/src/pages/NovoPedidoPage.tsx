import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'
import type { PrioridadePedido } from '../types'

export function NovoPedidoPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [contratoId, setContratoId] = useState<number | ''>('')
  const [assunto, setAssunto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState<PrioridadePedido>('media')

  const { data: contratos = [] } = useQuery({
    queryKey: ['contratos'],
    queryFn: clientService.contratos.list,
  })

  const createMutation = useMutation({
    mutationFn: clientService.pedidos.create,
    onSuccess: (pedido) => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      navigate(`/pedidos/${pedido.id}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!contratoId || !assunto.trim() || !descricao.trim()) return
    createMutation.mutate({
      contrato: Number(contratoId),
      assunto: assunto.trim(),
      descricao: descricao.trim(),
      prioridade,
    })
  }

  return (
    <AppLayout showSidebar={false}>
      {() => (
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 mb-3">
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Painel</span>
            </Link>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Novo Pedido de Suporte</h1>
            <p className="text-xs text-slate-500 mt-1">Descreva sua solicitação para análise técnica e orçamento em ciclos.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Contrato Vinculado *
              </label>
              <select
                required
                value={contratoId}
                onChange={(e) => setContratoId(e.target.value ? Number(e.target.value) : '')}
                className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
              >
                <option value="">Selecione um contrato ativo...</option>
                {contratos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numero} — Saldo disponível: {c.saldo}h
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Assunto / Resumo *
              </label>
              <input
                type="text"
                required
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="ex: Erro ao emitir relatório de notas ou solicitação de novo layout"
                className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Descrição Detalhada da Demanda *
              </label>
              <textarea
                required
                rows={5}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Explique o que precisa ser feito, detalhes do problema ou escopo desejado..."
                className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nível de Prioridade
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['baixa', 'media', 'alta', 'urgente'] as PrioridadePedido[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrioridade(p)}
                    className={`py-2 text-xs font-bold rounded-xl border capitalize transition ${
                      prioridade === p
                        ? p === 'urgente'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md shadow-indigo-200 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{createMutation.isPending ? 'Enviando...' : 'Abrir Pedido'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  )
}