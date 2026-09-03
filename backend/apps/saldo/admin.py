from django.contrib import admin
from .models import HistoricoSaldo, TransferenciaSaldo, Reabastecimento

@admin.register(HistoricoSaldo)
class HistoricoSaldoAdmin(admin.ModelAdmin):
    list_display = ["contrato", "tipo_operacao", "quantidade", "saldo_resultante", "pedido", "ciclo", "autor", "criado_em"]
    list_filter = ["tipo_operacao", "contrato"]
    search_fields = ["contrato__numero", "descricao", "pedido__protocolo"]
    date_hierarchy = "criado_em"
    readonly_fields = ["id", "contrato", "tipo_operacao", "quantidade", "saldo_resultante", "autor", "descricao", "pedido", "ciclo", "operacao_original_id", "criado_em"]

@admin.register(TransferenciaSaldo)
class TransferenciaSaldoAdmin(admin.ModelAdmin):
    list_display = ["contrato_origem", "contrato_destino", "quantidade", "autor", "criado_em"]

@admin.register(Reabastecimento)
class ReabastecimentoAdmin(admin.ModelAdmin):
    list_display = ["contrato", "quantidade", "autor", "criado_em"]
