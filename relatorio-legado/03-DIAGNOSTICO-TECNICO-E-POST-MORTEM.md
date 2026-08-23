# 03. Diagnóstico Técnico e Post-Mortem do Sistema Legado

Este documento detalha as falhas estruturais, dívidas técnicas, anomalias e decisões infelizes identificadas no projeto `projeto-SHM`, explicando **por que o projeto inicial ficou ineficiente** e estabelecendo o que deve ser sumariamente descartado versus o que deve ser aproveitado na reconstrução.

---

## 1. O Que Aconteceu? (Post-Mortem Metodológico)

O projeto foi gerado através de um harness de **OpenCode + SpecKit** utilizando modelos de IA gratuitos/fracos. Essa combinação gerou um efeito cascata de degradação:

```
[Visão Inicial Ampla]
        │
        ▼ (Geração sequencial de 16 micro-specs desconexas)
[Spec 001 ... Spec 016 geradas uma a uma sem refatoração global]
        │
        ▼ (Modelos gratuitos esquecendo o contexto anterior)
[Remendos sobre remendos: Conflitos de Status entre 003, 006, 007 e 015]
        │
        ▼ (Geração de código quebrado e comandos acidentais)
[Repositório poluído com arquivos lixo, imports dinâmicos e UI crua]
```

### 1.1 Conflito Semântico Crônico (Pedido vs Ciclo)
- Nas primeiras especificações (`specs/003`, `specs/004`, `specs/005`), a IA modelou o `Pedido` como a unidade que recebia orçamento e horas diretamente.
- Mais tarde (na `spec/015` e nas conversas de brainstorm), percebeu-se que um pedido precisa ser fatiado em **múltiplos Ciclos** (ex.: Corretiva + Treinamento) e que o `Ciclo` é a verdadeira unidade de orçamento e aceite.
- Em vez de refatorar a base de ponta a ponta, os modelos de IA criaram remendos (`spec/007` tentou unificar status, mas manteve tabelas e views inconsistentes), gerando duplicidade de conceitos e regras conflitantes no backend e frontend.

### 1.2 Poluição de Arquivos e Falha de Execução de Comandos
- No diretório do projeto, foram criados arquivos bizarros com nomes de versões:
  `=10.0`, `=2.0`, `=2.6`, `=2.9`, `=24.1`, `=3.1`, `=3.15`, `=3.3`, `=4.8`, `=5.0`, `=5.4`, `=8.0`.
- **Causa:** O agente de IA rodou comandos shell como `pip install Pillow =10.0` ou redirecionamentos de saída mal formatados no PowerShell, criando arquivos vazios ou lixo na raiz.
- O arquivo `db.sqlite3` (mais de 700 KB) com dados inconsistentes de testes manuais foi commitado diretamente no repositório.

---

## 2. Diagnóstico Técnico do Backend (Django)

| Problema Identificado | Impacto / Sintoma | Gravidade |
|---|---|---|
| **Duplicidade de Estrutura de Models** | Existência simultânea de `shm/models.py` (arquivo vazio padrão) e da pasta `shm/models/`. Gera confusão de imports e risco de migrações fantasmas. | 🟡 Médio |
| **Imports Dinâmicos / Circulares** | Funções dentro de `services/ciclo_service.py` e `services/pedido_service.py` fazendo `from shm.services.xxx import ...` dentro dos métodos para contornar acoplamento circular. | 🔴 Alto |
| **Autenticação e RBAC Frágeis** | Autorização baseada exclusivamente em `is_staff` booleano. Falta de modelagem de papéis de negócio (`Gerente Cliente`, `Analista Cliente`, `Gerente Empresa`, `Operador`). | 🔴 Alto |
| **Validação Mista e Descentralizada** | Lógica de validação dividida arbitrariamente entre `models.clean()`, `services` e `serializers.validate()`. Se uma rota chama o ORM direto, validações críticas de saldo são burladas. | 🔴 Alto |
| **Upload de Arquivos Local sem Abstração** | Armazenamento de arquivos anexos acoplado ao disco local sem sanitização robusta de nomes de arquivos nem suporte a armazenamento em nuvem (S3/GCS). | 🟡 Médio |
| **Falta de Documentação de API Automática** | Ausência de OpenAPI/Swagger estruturado (`drf-spectacular`), tornando o frontend dependente de tentativa e erro. | 🟡 Médio |

---

## 3. Diagnóstico Técnico do Frontend (React / TypeScript)

| Problema Identificado | Impacto / Sintoma | Gravidade |
|---|---|---|
| **Ausência de Design System e Componentização** | Estilos CSS brutos com variáveis primitivas e centenas de regras inline (`style={{ display: 'flex', ... }}`) espalhadas nos componentes. | 🔴 Alto |
| **Cliente de API Cru e Inseguro (`api/client.ts`)** | Uso de `fetch` manual com `any` em retornos, sem interceptores automáticos de refresh token JWT. Falhas 401 redirecionam via `window.location.href` forçado limpando estado. | 🔴 Alto |
| **Ausência de Camada de Gerenciamento de Estado/Cache** | Telas usando múltiplos `useEffect` e `useState` locais para buscar dados. Sem React Query / TanStack Query, gerando *race conditions*, excesso de requisições e ausência de cache. | 🔴 Alto |
| **Tipagem Incompleta (`types/index.ts`)** | Vários campos marcados com tipos genéricos ou opcionais incorretos (`any[]`, `number | null` onde não deveria ser nulo). | 🟡 Médio |
| **Responsividade Deficiente** | Telas de Kanban e tabelas com comportamento quebrado em dispositivos móveis e resoluções intermediárias. | 🟡 Médio |

---

## 4. Matriz: O Que Descartar vs O Que Aproveitar

### ❌ O Que DEVE Ser Descartado (100% Delete):
1. **Todo o código do frontend legado (`frontend/`)**: Código com inline styles, tipagem fraca e rotas sem padrão moderno.
2. **Todos os arquivos lixo gerados por scripts da IA**: `=10.0`, `=2.0`, `.specify/`, `.opencode/`, cache `.ruff_cache`, `db.sqlite3`.
3. **A implementação fragmentada do backend (`backend/`)**: Não reaproveitar o código fonte diretamente; reconstruir com arquitetura limpa, models unificados e rotas RESTful bem desenhadas.
4. **As 16 especificações picadas (`specs/001` a `016`)**: Foram substituídas de forma unificada e consistente pelos documentos da pasta `/relatorio-legado`.

### ✅ O Que DEVE Ser Resgatado e Aproveitado (Valor de Ouro):
1. **A Modelagem de Negócio Pedido → Ciclos → Tarefas**: É a grande inovação do sistema e deve ser o alicerce da nova arquitetura.
2. **A Lógica de Consumo de Saldo no Aceite**: Débito exclusivamente pelas horas reais apuradas no momento do aceite formal do cliente.
3. **A Regra de Carência de 30 Dias e Saldo Remanescente**: Regra comercial vital para retenção e renovação de contratos.
4. **A Estrutura de Ledger Imutável de Saldo**: `historico_saldo` com operações de transferência, reabastecimento e estorno.
5. **O Conceito de Magic Link**: Tokens UUID para aprovação e aceite instantâneos sem atrito de login.
6. **A Timeline Granular de Auditoria**: Registro automático de eventos e histórico de transições de status.