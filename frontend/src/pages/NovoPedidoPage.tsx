import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'
import { useToast } from '../contexts/ToastContext'
import type { PrioridadePedido } from '../types'

export function NovoPedidoPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [contratoId, setContratoId] = useState<number | ''>('')
  const [assunto, setAssunto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState<PrioridadePedido>('media')

  const { data: contratos = [] } = useQuery({
    queryKey: ['contratos'],
    queryFn: clientService.contratos.list,
  })

  const listaContratos = Array.isArray(contratos) ? contratos : []

  React.useEffect(() => {
    if (listaContratos.length === 1 && !contratoId) {
      setContratoId(listaContratos[0].id)
    }
  }, [listaContratos, contratoId])

  const createMutation = useMutation({
    mutationFn: clientService.pedidos.create,
    onSuccess: (pedido) => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      toast.success(`Pedido ${pedido.protocolo} aberto com sucesso!`, 'Novo Pedido')
      navigate(`/pedidos/${pedido.id}`)
    },
    onError: () => {
      toast.error('Erro ao abrir pedido. Verifique os dados.', 'Falha')
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
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 mb-3 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
            <span>Voltar ao Painel</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Novo Pedido de Suporte</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Descreva sua demanda para que a equipe técnica realize a triagem e orce os ciclos.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          {createMutation.isError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
              Erro ao abrir pedido. Por favor verifique os campos e tente novamente.
            </div>
          )}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              Contrato Vinculado *
            </label>
            <select
              required
              value={contratoId}
              onChange={(e) => setContratoId(e.target.value ? Number(e.target.value) : '')}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300/80 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 cursor-pointer"
            >
              <option value="">Selecione um contrato ativo...</option>
              {listaContratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero} — Saldo disponível: {Number(c.saldo).toFixed(1)}h
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              Assunto / Título Resumido *
            </label>
            <input
              type="text"
              required
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="ex: Erro ao emitir relatório de notas ou solicitação de novo layout"
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300/80 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              Descrição Detalhada do Problema / Necessidade *
            </label>
            <textarea
              required
              rows={5}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Explique o que precisa ser feito, detalhes do problema, passos para reproduzir ou escopo desejado..."
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300/80 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              Nível de Prioridade
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(['baixa', 'media', 'alta', 'urgente'] as PrioridadePedido[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrioridade(p)}
                  className={`py-3 text-xs font-bold rounded-2xl border capitalize transition duration-150 cursor-pointer ${
                    prioridade === p
                      ? p === 'urgente'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20'
                        : p === 'alta'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                        : 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
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
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs px-6 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{createMutation.isPending ? 'Enviando...' : 'Abrir Pedido'}</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}