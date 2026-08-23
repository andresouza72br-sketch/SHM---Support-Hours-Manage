<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read docs/specs/ and the current constitution.
<!-- SPECKIT END -->

# SHM (Support Hours Manager) — Coding Agent Guide

## Project Overview
SaaS B2B for tracking and managing technical support hours against client contracts.
Tech stack: **Django 5.x + PostgreSQL 16 backend**, **Django Templates + HTMX 2.x + Tailwind CSS frontend**, Docker/Docker Compose for local development.

## Project Structure
```
projeto-SHM/
├── .opencode/              # OpenCode engine commands
├── .specify/               # SpecKit specification framework & constitution
├── docs/
│   └── specs/              # Formal SDD Domain Specifications (01 to 08)
├── backend/                # Django project
│   ├── config/             # Django settings, WSGI, URLs
│   ├── shm/                # Main Django application
│   │   ├── models/         # Domain models (Clients, Users, Contracts, Requests, Cycles, Timeline)
│   │   ├── services/       # Core business logic (Balance, Workflows, Rollover)
│   │   ├── views/          # Thin HTMX views & controllers
│   │   ├── forms/          # Django Forms & validations
│   │   ├── templates/      # HTML templates & HTMX partials
│   │   └── tests/          # Pytest suite
│   └── manage.py
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── pyproject.toml
└── AGENTS.md               # This file
```

## Build / Lint / Test Commands

### Backend (Django / Python)
- `pip install -r requirements.txt` — install dependencies
- `python manage.py runserver` — start dev server
- `python manage.py makemigrations` — create database migrations
- `python manage.py migrate` — apply database migrations
- `pytest` — run all automated tests
- `pytest backend/shm/tests/test_services/` — run business logic / balance calculation tests
- `ruff check .` — lint Python code
- `ruff format --check .` — check Python formatting
- `ruff format .` — auto-format Python code
- `mypy .` — type-check Python code

### Docker
- `docker compose up -d` — start all services (PostgreSQL + Django dev server)
- `docker compose down` — stop services
- `docker compose exec backend pytest` — run tests in container

## Code Style & Architecture Guidelines

### Python (Django & Services)
- **Thin Views / Heavy Services**: Views MUST only handle authentication, HTTP request unpacking, calling services in `shm/services/`, and returning rendered HTML partials. All business rules and balance calculations belong in `shm/services/`.
- **Immutable Balance Deductions**: Hours are deducted ONLY on final cycle acceptance (`GESTOR_CLIENTE`), deducting actual realized hours.
- **Negative Balance Support**: Negative balances are valid states.
- **Imports Order**: 
  1. Standard library (`os`, `datetime`, `uuid`, etc.)
  2. Third-party (`django`, `django.db`, etc.)
  3. Local app imports (`from shm.models import ...`, `from shm.services import ...`)
- **Formatting**: Enforce Ruff defaults (line length 88, double quotes).
- **Type Hints**: Strict type hints on all public service methods and utility functions.

### Frontend (Django Templates + HTMX)
- **Server-Driven**: Keep state on the server. Use HTMX attributes (`hx-get`, `hx-post`, `hx-target`, `hx-swap`) to update UI blocks reactively.
- **Out-of-Band (OOB) Updates**: Use `hx-swap-oob="true"` to simultaneously update balance badges, stats, and notification counters when executing cycle actions.
- **Modals & Inline Editing**: Use Alpine.js for transient local UI state (modals, dropdowns, tabs) and HTMX for server requests.