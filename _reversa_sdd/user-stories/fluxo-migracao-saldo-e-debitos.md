# User Story: Migração de Saldo e Compensação entre Contratos

**Como** Administrador da Empresa,  
**Quero** transferir o saldo positivo de contratos expirados para um novo contrato ativo do cliente ou compensar saldos devedores anteriores com a franquia nova,  
**Para que** o cliente tenha aproveitamento financeiro transparente de suas horas sem gerar retrabalho manual de conciliação.

### Cenário 1: Migração de horas remanescentes de contrato vencido
- **Dado** que o cliente possui o Contrato CT-2025-0010 expirado com 18.00h de saldo remanescente,
- **E** possui o Contrato CT-2026-0001 ativo recém-assinado,
- **Quando** o administrador abre o modal de migração no Extrato do contrato e confirma a transferência de 18.00h,
- **Então** o saldo do novo contrato é acrescido em 18.00h e o contrato anterior é zerado,
- **E** a auditoria registra o evento com IP e autor, notificando os gestores por e-mail.

### Cenário 2: Quitação e compensação de saldo negativo
- **Dado** que o contrato anterior encerrou com saldo devedor de -6.00h,
- **E** o novo contrato possui 40.00h de franquia disponível,
- **Quando** o administrador seleciona a opção de compensação de débito,
- **Então** 6.00h são abatidas da franquia do novo contrato (ficando com 34.00h),
- **E** o contrato anterior é liquidado para 0.00h com histórico contábil preservado.
