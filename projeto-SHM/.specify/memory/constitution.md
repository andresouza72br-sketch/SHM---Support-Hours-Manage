# SHM (Support Hours Manager) Constitution

## Core Principles

### I. Layered Architecture & Thin Views (NON-NEGOTIABLE)
- All business logic, hours calculations, contract balance mutations, and state transitions MUST live strictly within the service layer (`shm/services/`).
- Django Models hold schema, constraints, and simple properties. Django Views/HTMX handlers only parse requests, invoke services, and return responses or HTML fragments.

### II. Auditability & Financial Immutability
- Contract balance changes, hours deductions, transfers (`SaldoTransferido`), and cycle acceptances are immutable financial records.
- Soft-deletes and append-only audit event logs MUST be used for contracts, requests, cycles, and hours records. Hard deletions of operational history are prohibited.

### III. Test-Driven Balance & State Integrity (TDD Mandatory)
- Every business rule involving balance deductions, negative balances, rollovers, cycle state transitions, and user permissions MUST have automated test coverage.
- Edge cases (e.g., zero balance, negative balance rollover, expired contract transfer attempts, unauthorized acceptance) must have dedicated test suites.

### IV. Modern Server-Driven UI (Django + HTMX + Tailwind)
- Frontend is server-rendered via Django Templates and enhanced dynamically with HTMX and Alpine.js.
- UI responses return clean, semantic HTML partials with explicit OOB (out-of-band) swap targets when updating multi-component dashboards (e.g., refreshing both task list and balance badge).

### V. Strict Typing and Code Quality
- Python code MUST use type hints on all public service functions, models, and forms.
- Code formatting and linting enforced via `ruff` and type-checked with `mypy`.

## Governance & Compliance

- **Framework**: Django 5.x / Python 3.12+ / PostgreSQL 16+ / HTMX 2.x.
- **Roles & Permissions**: Multi-tenant data segregation per client; strict role-based access control (Admin, Support Manager, Tech for Provider; Manager, Standard User for Client).
- **Amendments**: Any change to balance calculation rules or workflow states requires explicit documentation update in `docs/specs/` and a corresponding test suite update.

**Version**: 1.0.0 | **Ratified**: 2026-08-23 | **Last Amended**: 2026-08-23
