# User Story: Fluxo de Auditoria Forense, Imutabilidade e Verificação Pericial

## Identificador: US-AUDITORIA-01
## Épico: Governança, Conformidade Legal e Soberania Probatória

---

### História de Usuário 1: Consulta Pericial sem Caixa-Preta (Perito Judicial / Auditor)
**Como** perito forense nomeado em processo judicial ou auditor externo de compliance,  
**Quero** acessar a página oficial de documentação pericial (`/publico/auditoria-forense`) e exportar os registros brutos da trilha em JSON determinístico,  
**Para que** eu possa realizar a varredura matemática de integridade (RFC 8785 + SHA-256) em minha própria estação pericial isolada da internet (*air-gapped*), sem depender de credenciais do sistema ou declarações do operador.

#### Critérios de Aceite:
1. A página pública deve ser acessível sem exigir login (`isPublicView = true`).
2. O índice lateral deve permanecer flutuante e fixo centralizado verticalmente na viewport durante toda a rolagem pelo compêndio de normas e passos periciais.
3. Clicar em qualquer tópico do sumário deve conduzir uma transição suave e amortecida até a seção correspondente, respeitando o cabeçalho fixo.
4. O script `verificador_independente.py` em Python puro (zero pip) deve ser disponibilizado com botão de cópia direta e download via Blob.

---

### História de Usuário 2: Verificação de Integridade em Tempo Real (Gestor da Empresa)
**Como** administrador da empresa prestadora (`EMPRESA_ADMIN`),  
**Quero** verificar a integridade da cadeia de auditoria de qualquer contrato diretamente pelo painel do SHM através do botão "Verificar Integridade",  
**Para que** o sistema audite matematicamente a correspondência dos hashes anteriores e atuais de cada evento até o topo da cadeia, atestando 100% de conformidade com selo verde.

#### Critérios de Aceite:
1. O endpoint `/api/v1/contratos/{id}/verificar_integridade_trilha/` deve checar a cadeia completa do contrato.
2. Em caso de correspondência perfeita, exibir modal com total de blocos auditados, algoritmo FIPS 180-4 / RFC 8785 e timestamp do último selo diário.
3. Se qualquer registro sofrer quebra de hash ou adulteração, o sistema deve emitir alerta crítico indicando a sequência exata da ruptura.
