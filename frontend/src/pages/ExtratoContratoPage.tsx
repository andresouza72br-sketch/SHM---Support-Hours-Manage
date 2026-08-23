import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'

export function ExtratoContratoPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <AppLayout showSidebar={false}>
      {() => {
        const { data, isLoading } = useQuery({
          queryKey: ['extrato', id],
          queryFn: () => clientService.contratos.extrato(Number(id)),
          enabled: Boolean(id),
        })

        if (isLoading) return <div className="p-12 text-center text-slate-400">Carregando extrato...</div>
        if (!data) return <div className="p-12 text-center text-rose-500 font-bold">Extrato não disponível.</div>

        const { contrato, historico_ciclos } = data
        const total = Number(contrato.horas_contratadas) || 1
        const saldo = Number(contrato.saldo) || 0
        const consumido = Number(contrato.horas_consumidas) || 0

        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 mb-3">
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Painel</span>
              </Link>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Extrato do Contrato {contrato.numero}</h1>
                  <p className="text-xs text-slate-500">{contrato.cliente_nome}</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full uppercase">
                  {contrato.status_display}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase">Horas Contratadas</div>
                <div className="text-2xl font-black text-slate-800 mt-1">{total.toFixed(1)}h</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase">Consumo Acumulado</div>
                <div className="text-2xl font-black text-rose-600 mt-1">{consumido.toFixed(1)}h</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase">Saldo Disponível</div>
                <div className="text-2xl font-black text-indigo-600 mt-1">{saldo.toFixed(1)}h</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-800">Histórico de Consumo por Ciclos Aceitos</h3>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100">
                  <tr>
                    <th className="p-3.5">Pedido</th>
                    <th className="p-3.5">Tipo do Ciclo</th>
                    <th className="p-3.5">Escopo</th>
                    <th className="p-3.5 text-right">Horas Debitadas</th>
                    <th className="p-3.5 text-right">Data de Aceite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historico_ciclos.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 font-mono font-bold text-slate-700">{item.pedido_protocolo}</td>
                      <td className="p-3.5 font-medium text-indigo-700">{item.tipo}</td>
                      <td className="p-3.5 text-slate-600 text-xs">{item.contexto || '-'}</td>
                      <td className="p-3.5 text-right font-black text-slate-900">{item.horas_realizadas.toFixed(1)}h</td>
                      <td className="p-3.5 text-right text-xs text-slate-500">
                        {item.aceito_em ? new Date(item.aceito_em).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))}
                  {historico_ciclos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs italic">
                        Nenhum ciclo debitado até o momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      }}
    </AppLayout>
  )
}