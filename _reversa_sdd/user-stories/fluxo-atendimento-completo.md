# User Story: Fluxo de Atendimento Completo (Demanda -> Orçamento -> Execução -> Aceite -> Avaliação)

**Como** Gerente Tomador do Cliente,  
**Quero** abrir pedidos, aprovar orçamentos sem débito antecipado e validar aceites formais com débito apenas das horas reais,  
**Para que** eu tenha transparência financeira total e pague exclusivamente pelo esforço técnico homologado.

## Cenário Principal de Sucesso:
1. Cliente abre chamado via `/api/v1/pedidos/` gerando protocolo `OS2026080001`.
2. Técnico decompõe em Ciclo de Atendimento Corretiva com 8h estimadas.
3. Técnico apresenta orçamento; sistema dispara Magic Link para o tomador.
4. Tomador aprova orçamento no smartphone; saldo do contrato permanece intacto (0h debitadas).
5. Técnico executa o trabalho e aponta 6h reais em tarefas realizadas.
6. Técnico solicita aceite formal.
7. Tomador concede aceite; sistema debita 6h reais do contrato no ledger `HistoricoSaldo`.
8. Tomador atribui 5 estrelas na avaliação de satisfação.
