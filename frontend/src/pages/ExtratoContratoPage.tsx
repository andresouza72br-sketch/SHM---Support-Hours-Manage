import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'

export function ExtratoContratoPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['extrato', id],
    queryFn: () => clientService.contratos.extrato(Number(id)),
    enabled: Boolean(id),
  })

  if (isLoading) {
    return (
      <AppLayout showSidebar={false}>
        <div className="p-12 text-center text-slate-400 font-semibold">Carregando extrato...</div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout showSidebar={false}>
        <div className="p-12 text-center text-rose-500 font-bold">Extrato não disponível.</div>
      </AppLayout>
    )
  }

  const { contrato, historico_ciclos = [] } = data
  const total = Number(contrato.horas_contratadas) || 1
  const saldo = Number(contrato.saldo) || 0
  const consumido = Number(contrato.horas_consumidas) || 0
  const percentConsumido = Math.min(Math.round((consumido / total) * 100), 100)

  return (
    <AppLayout showSidebar={false}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 mb-3 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
            <span>Voltar ao Painel</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                  {contrato.numero}
                </span>
                <span className="text-xs font-bold text-slate-400">•</span>
                <span className="text-xs font-bold text-slate-600">{contrato.cliente_nome}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Extrato do Contrato</h1>
            </div>
            <span className="text-xs font-extrabold px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full uppercase tracking-wider self-start sm:self-auto">
              {contrato.status_display}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-1">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Horas Contratadas</div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">{total.toFixed(1)}h</div>
            <div className="text-[11px] text-slate-400 font-medium">Franquia total contratual</div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Consumo Acumulado</div>
            <div className="text-3xl font-black text-rose-600 tracking-tight">{consumido.toFixed(1)}h</div>
            <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentConsumido <= 25
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : percentConsumido <= 50
                    ? 'bg-gradient-to-r from-emerald-500 to-amber-400'
                    : percentConsumido <= 75
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : 'bg-gradient-to-r from-orange-500 to-rose-600'
                }`}
                style={{ width: `${percentConsumido}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 font-medium">{percentConsumido}% do pacote consumido</div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-indigo-200/80 shadow-xs space-y-1 bg-gradient-to-br from-white to-indigo-50/40">
            <div className="text-[11px] font-extrabold text-indigo-500 uppercase tracking-wider">Saldo Disponível</div>
            <div className="text-3xl font-black text-indigo-600 tracking-tight">{saldo.toFixed(1)}h</div>
            <div className="text-[11px] text-indigo-400 font-semibold">Disponível para novos ciclos</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Histórico de Débitos por Ciclos Aceitos</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Registro oficial e auditável de consumo de horas técnicas</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{historico_ciclos.length} eventos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4">Pedido / Protocolo</th>
                  <th className="p-4">Tipo do Ciclo</th>
                  <th className="p-4">Escopo Técnico</th>
                  <th className="p-4 text-right">Horas Debitadas</th>
                  <th className="p-4 text-right">Data de Aceite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {historico_ciclos.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-mono font-bold text-slate-900">{item.pedido_protocolo}</td>
                    <td className="p-4 font-bold text-indigo-600">{item.tipo}</td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">{item.contexto || '-'}</td>
                    <td className="p-4 text-right font-black text-slate-900 text-sm">-{item.horas_realizadas.toFixed(1)}h</td>
                    <td className="p-4 text-right text-slate-400 font-mono">
                      {item.aceito_em ? new Date(item.aceito_em).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))}
                {historico_ciclos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 text-xs italic">
                      Nenhum ciclo debitado até o momento neste contrato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}