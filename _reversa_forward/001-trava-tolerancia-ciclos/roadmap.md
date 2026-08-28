# Roadmap Técnico — Feature 001: Trava de Tolerância de 30% no Aceite de Ciclos

> **Feature ID:** `001-trava-tolerancia-ciclos`  
> **Status:** `Planejado` 🟢

---

## 1. Arquitetura e Componentes Impactados

- **Backend:**
  - `backend/apps/ciclos/services.py`: Método `CicloService.aceitar_ciclo()` — inclusão da checagem matemática de tolerância `horas_realizadas <= horas_estimadas * Decimal('1.30')`.
  - `backend/apps/ciclos/views.py`: Captura de `ValidationError` e retorno estruturado 400.
  - `backend/apps/ciclos/tests.py`: Testes unitários para casos de borda (limite exato de 30%, 30.1% bloqueado, 29.9% aceito, `horas_estimadas == 0`).

- **Frontend:**
  - `frontend/src/types/index.ts`: Identificador de excesso ou status de tolerância.
  - `frontend/src/components/ciclos/CicloCard.tsx` / `ExecucaoCicloPage.tsx`: Alerta visual quando `horas_realizadas > horas_estimadas`.

---

## 2. Fases de Execução

1. **Fase 1 (Backend Core):** Implementar regra de negócio no `CicloService` e views.
2. **Fase 2 (Testes Automatizados):** Implementar e executar testes de regressão no backend.
3. **Fase 3 (Frontend UI):** Atualizar badges visuais de tolerância e alertas no cliente React.
4. **Fase 4 (Convergência Sync):** Gerar adendo em `_reversa_sdd/addenda/` e homologar a entrega.
