# Reversa

> Framework de Engenharia Reversa instalado neste projeto.

## Como usar

Use o fluxo adequado no chat:

- `reversa` — descobrir e documentar um sistema existente
- `reversa-new` — criar PRD e specs para um projeto novo
- `reversa-forward` — implementar ou evoluir código a partir das specs
- `reversa-migrate` — planejar a migração de um sistema legado
- `reversa-docs` — gerar o mini-site visual da documentação
- `reversa-agents-help` — consultar o catálogo completo de agentes

## Comportamento ao ativar

Quando o usuário digitar `reversa` sozinho em uma mensagem:

1. Ative o skill `reversa` disponível em `.agents/skills/reversa/SKILL.md`
2. Leia o SKILL.md na íntegra e siga exatamente as instruções do Reversa

## Regra não-negociável

Por padrão, nunca apague, modifique ou sobrescreva arquivos pré-existentes do projeto legado:
o Reversa escreve apenas em `.reversa/`, `_reversa_sdd/`, `_reversa_docs/`, `_reversa_forward/`, `_reversa_bugs/` e `_reversa_refactor/`.
A única exceção é a política configurável abaixo, controlada exclusivamente pelo usuário.

Antes de criar, modificar ou apagar qualquer arquivo fora das pastas próprias do Reversa, leia `.reversa/reversa-config.json` e obedeça ao resultado:

- Arquivo ausente, JSON inválido ou campo com tipo errado: trate como `allowLegacyEdits: false` (falha segura, nenhuma escrita fora das pastas do Reversa).
- `allowLegacyEdits: false`: recuse a escrita, informando o caminho recusado, o estado atual da config e o que o usuário deve editar para liberar.
- `allowLegacyEdits: true` com `allowedPaths` não vazio: escreva apenas em caminhos que casem com algum glob da lista (globs relativos à raiz do projeto, com `/`, suportando `*` e `**`).
- `allowLegacyEdits: true` com `allowedPaths` vazio ou ausente: projeto liberado; avise uma vez por sessão que a liberação é irrestrita.

Nunca crie nem edite `.reversa/reversa-config.json` por iniciativa própria: pedido na conversa não é liberação implícita, alterações nesse arquivo são ato exclusivo do usuário.

---

# Impeccable

> Framework de Design System, UI/UX e Excelência Frontend.

## Como usar

Use os fluxos de design e interface no chat:

- `impeccable shape [alvo]` — planejar arquitetura de informação e UX antes de codar
- `impeccable audit [alvo]` — auditoria técnica de acessibilidade (a11y), performance e responsividade
- `impeccable critique [alvo]` — avaliação heurística de design, hierarquia visual e clareza
- `impeccable polish [alvo]` — refinamento fino e polimento de acabamento de UI
- `impeccable document` — gerar e atualizar a documentação visual `DESIGN.md`
- `impeccable extract [alvo]` — isolar componentes e design tokens reutilizáveis
- `impeccable bolder` / `impeccable quieter` / `impeccable distill` — calibrar o nível de estímulo e complexidade visual
- `impeccable animate` / `impeccable colorize` / `impeccable typeset` — aprimorar movimento, paleta de cores e tipografia

## Comportamento ao ativar

Quando o usuário solicitar tarefas de design, UX/UI, frontend ou refinamento de interface:
1. Ative o skill `impeccable` disponível no ambiente
2. Siga os playbooks do Impeccable para garantir alto padrão de craft visual, consistência de design tokens, acessibilidade e responsividade

