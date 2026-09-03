# Design Técnico do Módulo Saldo

> Gerado pelo **Reversa Writer** em 2026-09-03  
> Confiança: 🟢 CONFIRMADO

## 1. Arquitetura do Serviço
O `SaldoService` encapsula todas as regras contábeis em métodos estáticos decorados com `@transaction.atomic`.

### Métodos Principais:
1. `consumir(contrato, horas, pedido, ciclo, autor, ip, user_agent, metodo)`:
   - Adquire lock `select_for_update` no contrato.
   - Deduz saldo e incrementa `horas_consumidas`.
   - Grava entrada no `HistoricoSaldo` com snapshot do `saldo_resultante`.
   - Avalia gatilhos de 80% consumido e saldo zerado/negativo, disparando alertas.
2. `transferir(contrato_origem_id, contrato_destino_id, quantidade, autor, motivo)`:
   - Valida `cliente_id` idêntico.
   - Adquire par de locks ordenados anti-deadlock.
   - Executa movimentação contábil atômica.
3. `migrar_saldo_contratos_vencidos(contrato_origem_id, contrato_destino_id, quantidade, autor, motivo, ip, user_agent)`:
   - Valida saldo positivo e mesmo cliente.
   - Move saldo e invoca `ContratoService.notificar_e_auditar_migracao_saldo`.
4. `compensar_debito_contrato_anterior(contrato_novo_id, contrato_devedor_id, quantidade, autor, motivo, ip, user_agent)`:
   - Valida existência de débito (`saldo < 0`) e saldo suficiente no novo contrato.
   - Quita a dívida até o teto estrito do débito absoluto.
