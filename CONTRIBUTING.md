# 🤝 Guia de Contribuição para o SHM 2.0

Agradecemos o seu interesse em contribuir com o projeto SHM!

---

## 🛠️ Padrões de Código

### Backend (Python / Django)
- Siga a [PEP 8](https://peps.python.org/pep-0008/).
- Utilize tipagem estática e docstrings quando pertinente.
- Todo novo endpoint deve incluir cobertura de testes no diretório `backend/tests/`.
- Mantenha models com `TimeStampedModel` e campos descritivos com `verbose_name`.

### Frontend (React / TypeScript)
- Utilize componentes funcionais e hooks.
- Mantenha tipagens estritas em `src/types/index.ts`.
- Formatação de estilos utilizando classes utilitárias do Tailwind CSS.
- Não introduza imports não utilizados para manter a compilação do TypeScript limpa.

---

## 🚀 Fluxo de Trabalho Git

1. Crie uma branch para sua feature: `git checkout -b feat/nome-da-feature`
2. Escreva testes e implemente as alterações.
3. Valide o backend com `pytest backend/tests` e o frontend com `cd frontend && bun run build`.
4. Faça commit seguindo a convenção [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(...)`: Novas funcionalidades
   - `fix(...)`: Correção de bugs
   - `test(...)`: Adição ou refatoração de testes
   - `docs(...)`: Alterações em documentação
5. Envie um Pull Request detalhado.