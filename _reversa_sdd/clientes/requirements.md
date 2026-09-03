# Requisitos do Módulo Clientes

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Gestão cadastral de organizações tomadoras (Pessoa Jurídica ou Pessoa Física), validação de documentos fiscais, workflow de aceite de cadastro via Magic Link e log de auditoria forense.

## 2. Requisitos Funcionais
- **RF-CLI-01 (Must):** Cadastrar clientes como PJ (exigindo Razão Social e CNPJ válido) ou PF (exigindo Nome Completo e CPF válido) 🟢.
- **RF-CLI-02 (Must):** Validar matematicamente dígitos verificadores de CPF e CNPJ 🟢.
- **RF-CLI-03 (Must):** Criar cliente no status `pendente_aprovacao` e emitir link de aceite com validade de 7 dias para o gestor 🟢.
- **RF-CLI-04 (Must):** Registrar log imutável de auditoria (`ClienteAuditLog`) para criação, alteração e exclusão 🟢.

## 3. Critérios de Aceitação
```gherkin
Cenário: Cadastro de PJ com CNPJ inválido
  Dado que o operador submete cadastro PJ com CNPJ de dígitos incorretos
  Quando o sistema executa a validação
  Então retorna 400 Bad Request com erro 'CNPJ inválido'.

Cenário: Aceite de cadastro via Magic Link
  Dado que o gestor acessa o Magic Link válido de 7 dias
  Quando clica em confirmar aceite
  Então o cliente passa para status 'ativo' e um registro de auditoria é gravado.
```
