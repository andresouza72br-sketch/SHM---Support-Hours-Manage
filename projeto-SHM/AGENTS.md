<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->

# SHM (Support Hours Manager) — Coding Agent Guide

## Project Overview
SaaS for tracking technical support hours against client contracts.
Tech stack: Django + PostgreSQL backend, React/TypeScript frontend (or Django+HTMX), Docker/Docker Compose for local dev.

## Project Structure
```
projeto-SHM/
├── .opencode/              # OpenCode engine files (managed)
├── .specify/               # SpecKit specification framework (managed)
├── backend/                # Django project
│   └── shm/                # Main Django app
├── frontend/               # React/TypeScript (if used)
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── pyproject.toml
└── AGENTS.md               # This file
```

## Build / Lint / Test Commands

### Backend (Django/Python)
- `pip install -r requirements.txt` — install dependencies
- `python manage.py runserver` — dev server
- `python manage.py makemigrations` — create migrations
- `python manage.py migrate` — apply migrations
- `python manage.py test` — run all tests
- `python manage.py test <app>.tests.<module>` — run a single test module
- `python manage.py test <app>.tests.<module>.TestClass.test_method` — single test
- `ruff check .` — lint Python code
- `ruff format --check .` — check Python formatting
- `ruff format .` — auto-format Python code
- `mypy .` — type-check Python code

### Frontend (React/TypeScript)
- `npm install` — install dependencies
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — lint (ESLint)
- `npm run typecheck` — TypeScript type check
- `npm test` — run all tests
- `npm test -- --grep "test name"` — run single test (Vitest/Jest)

### Docker
- `docker compose up -d` — start all services
- `docker compose down` — stop services
- `docker compose exec backend python manage.py test` — run tests in container

## SpecKit Workflow Commands
Run via OpenCode chat:
- `/speckit.specify` — create a feature specification
- `/speckit.plan` — generate implementation plan from spec
- `/speckit.tasks` — break plan into tasks
- `/speckit.implement` — execute tasks from tasks.md
- `/speckit.analyze` — cross-artifact consistency analysis
- `/speckit.checklist` — generate quality checklists
- `/speckit.clarify` — clarify requirements
- `/speckit.constitution` — manage project constitution
- `/speckit.converge` — convergence checks
- `/speckit.taskstoissues` — convert tasks to GitHub issues

Full SDD Cycle: specify → gate(review-spec) → plan → gate(review-plan) → tasks → implement

---

## Code Style Guidelines

### Python (Django)

**Imports:** Group in this order, alphabetically within each group:
1. Standard library (`os`, `datetime`, etc.)
2. Third-party (`django`, `rest_framework`, etc.)
3. Local (`from shm.models import ...`, `from .models import ...`)
Use absolute imports. One import per line.

**Formatting:** Ruff defaults (line length 88, double quotes for strings unless single avoids escaping).

**Types:** Use type hints on all function signatures. Use `TypedDict` / `dataclass` for structured data, Pydantic or Django-rest-framework serializers for validation.

**Naming:**
- `snake_case` for functions, variables, methods, module names
- `PascalCase` for classes, Django models
- `UPPER_SNAKE_CASE` for constants and settings
- Django models: singular (`Client`, `Contract`, `ServiceOrder`)

**Django Conventions:**
- Models in `models.py` or `models/` package
- Business logic in services layer (`services/`), not in views or models
- Views are thin: parse request → call service → return response
- Use class-based views (DRF ViewSets) or function-based views with decorators
- Signals in `signals.py`, tasks in `tasks.py`
- URL configs in `urls.py` with namespaced `app_name`

**Error handling:**
- Raise Django `ValidationError` or custom exceptions in service layer
- Catch and convert to HTTP responses in views (try/except or DRF exception handler)
- Use `logging.getLogger(__name__)` for structured logging
- Never silence exceptions without logging

**Testing (Django):**
- Tests in `tests/` package mirroring app structure
- Use `pytest` fixtures + `django.test.Client` or DRF's `APIClient`
- One test file per model/view/service group
- Test names: `test_<action>_<expected_result>` (e.g., `test_create_client_returns_201`)
- Factory Boy for test data (fixture factories in `tests/factories.py`)

### TypeScript / React

**Imports:** Group and sort:
1. React/Next/Vite core
2. Third-party libraries
3. Local modules (absolute imports with `@/` alias)
4. Relative imports (`./Component`, `../hooks/`)
No default exports — prefer named exports.

**Formatting:** Prettier defaults (single quotes, semicolons, trailing commas, printWidth 80).

**Types:** Prefer `interface` over `type` for object shapes. Use `type` for unions, intersections, primitives. Avoid `any` — use `unknown` and narrow. Define types/contracts in `types/` or co-located `.types.ts` files.

**Naming:**
- `PascalCase` for components, interfaces, types
- `camelCase` for functions, variables, hooks, instances
- `UPPER_SNAKE_CASE` for constants/enums
- `kebab-case` for file names (component files match export name: `client-card.tsx`)

**React/Component Conventions:**
- Functional components with hooks, no class components
- Props typed with `interface ComponentNameProps`
- Colocate styles, tests, stories with component: `Component.tsx`, `Component.test.tsx`, `Component.stories.tsx`
- Custom hooks in `hooks/`, utilities in `utils/`, API layer in `api/`

**Error handling:**
- Use try/catch in async functions, never swallow errors
- React: error boundaries at route level
- API calls: handle network errors, parse structured error responses, show user-friendly messages

**Testing (Vitest/Jest):**
- `*.test.tsx` or `*.spec.tsx` co-located with source
- React Testing Library for component tests
- MSW (Mock Service Worker) for API mocking
- Test names: descriptive sentences (`renders loading state`, `shows error on 401`)

### Git & Workflow
- Feature branches from `main`: `feat/short-description`, `fix/short-description`
- Commits: conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`)
- Squash commits before merging to main (no messy history)
- All changes require passing lint + tests before commit