# DESIGN.md — SHM Design System & Tokens

## 1. Visual World & Aesthetic Tone
- **Archetype**: Modern Executive Enterprise (Clean, Crisp, High-Trust, Authoritative).
- **Primary Mode**: `Operate`. Focus on information density without clutter, clear contrast, and fast scannability.

---

## 2. Color Tokens

### 2.1 Neutral Base (Slate)
- `slate-50`: Background surface (`#f8fafc`)
- `slate-100`: Subtle card backgrounds & borders (`#f1f5f9`)
- `slate-200`: Primary divider and component borders (`#e2e8f0`)
- `slate-500`: Secondary helper text, metadata labels (`#64748b`)
- `slate-700`: Body text, secondary labels (`#334155`)
- `slate-900`: High-contrast titles, primary navigation bar (`#0f172a`)

### 2.2 Functional Accents
- **Primary / Brand (Cobalt Blue)**:
  - Base: `blue-600` (`#2563eb`), Hover: `blue-700` (`#1d4ed8`), Light Tint: `blue-50` (`#eff6ff`)
  - Used for: Primary actions, active links, consumed hours metrics.
- **Positive Balance / Success (Emerald)**:
  - Base: `emerald-600` (`#059669`), Light Tint: `emerald-50` (`#ecfdf5`), Border: `emerald-200`
  - Used for: Positive hours balances, approved budgets, accepted cycles.
- **Negative Balance / Alert / Urgency (Rose / Ruby)**:
  - Base: `rose-600` (`#e11d48`), Light Tint: `rose-50` (`#fff1f2`), Border: `rose-300`
  - Used for: Negative balances (exceeded contracts), rejected budgets, critical overdue items.
- **Pending / Action Required (Amber)**:
  - Base: `amber-500` (`#f59e0b`), Light Tint: `amber-50` (`#fffbeb`), Border: `amber-200`
  - Used for: Cycles awaiting client approval, cycles awaiting client acceptance.
- **Analysis / System (Purple)**:
  - Base: `purple-600` (`#9333ea`), Light Tint: `purple-50` (`#faf5ff`)
  - Used for: Requests under technical analysis, system timeline events.

---

## 3. Typography & Numerical Representation

- **Body Font**: Modern Sans-Serif (`Inter`, `system-ui`, `-apple-system`, `Albert Sans`).
- **Tabular Figures & Metrics (`font-mono`)**:
  - **Rule**: All hour figures, contract IDs, order codes, and percentages MUST be rendered with `font-mono` and `tracking-tight`.
  - Ex: `<span class="font-mono font-bold text-2xl">45.50h</span>`
- **Headings**: Semibold/Bold with tight letter spacing for maximum executive punch.

---

## 4. Spacing, Layout & Hierarchy

- **Page Insets**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`.
- **Card Padding**: Standard `p-5` or `p-6` with `rounded-xl border border-slate-200 shadow-sm`.
- **Vertical Rhythm**: `space-y-6` to `space-y-8` between major sections.
- **HTMX Partial Swaps**: Dynamic content transitions without full-page reloads.

---

## 5. Anti-Patterns Banned (Impeccable Craft Floor)

- ❌ **Status-Chip Soup**: Do not attach more than one status badge to a single entity.
- ❌ **Nested Cards within Nested Cards**: Use clean divided lists (`divide-y divide-slate-100`) rather than deep card-in-card hierarchies.
- ❌ **Vague CTA Copy**: Avoid generic labels like *"Salvar"*, *"OK"*, *"Enviar"*. Always use specific action verbs (*"Aprovar Orçamento (4.00h)"*, *"Confirmar Aceite Final"*).
- ❌ **Cramped Padding**: No dense, squeezed inputs. Form inputs must have comfortable touch/click targets (`px-3 py-2 text-sm`).
- ❌ **Ambiguous Zero/Negative Hours**: Never hide a negative balance; make it explicitly labeled *"Saldo Atual (Excedente): -6.00h"*.
