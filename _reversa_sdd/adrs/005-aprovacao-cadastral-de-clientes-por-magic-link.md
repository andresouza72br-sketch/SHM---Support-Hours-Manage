# ADR 005: Fluxo de Onboarding e Aceite Cadastral de Clientes

## Status
Aprovado / Implementado

## Contexto
O cadastro de novas organizações tomadoras (PJ/PF) requer confirmação de dados fiscais pelo gestor responsável antes da emissão do primeiro contrato.

## Decisão
Criar clientes no estado `pendente_aprovacao` e enviar convite por e-mail com token Magic Link de 7 dias para o gestor validar os dados e formalizar o aceite cadastral.