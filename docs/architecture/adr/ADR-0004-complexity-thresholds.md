---
owner: Dev Lead
status: accepted
review_date: 2027-05-16
tags:
  - architecture
  - adr
  - adr-004
---

# ADR-0004: Порогові значення складності (CC ≤ 10, Halstead V ≤ 300)

**Статус:** Accepted  
**Дата:** 2026-10-26  
**Власник:** Dev Lead  
**Контекст лабораторної:** Лабораторна №6 (Halstead & McCabe Complexity Audit)  

---

## Контекст

Після аудиту лабораторної №6 виявлено функції з CC > 10 та Halstead Volume > 300. Необхідно встановити обов'язкові пороги, автоматично верифіковані у pre-commit та CI/CD.

## Розглянуті альтернативи

| Поріг CC | Обґрунтування |
|---|---|
| CC ≤ 5 | Занадто суворо, блокує валідні складні алгоритми |
| **CC ≤ 10** | Галузевий стандарт (McCabe, 1976): "low risk" |
| CC ≤ 15 | Занадто ліберально, дозволяє антипатерни |

## Рішення

Встановлено та автоматизовано **три порогових правила**:

1. **Cyclomatic Complexity CC ≤ 10** (McCabe) — via `scripts/check-staged-complexity.js`
2. **Halstead Volume V ≤ 300** — via `scripts/complexity-analyzer.js`  
3. **Halstead Difficulty D ≤ 25** — додатковий індикатор

Порушення → автоматичний **блок коміту** (`pre-commit` hook) та **FAIL** у CI/CD.

## Наслідки

✅ Позитивні:
- Автоматичне запобігання накопиченню складності
- Підтримана у 100% GitHub Actions runs (після `fix(ci): a0ab991`)

⚠️ Негативні:
- Може блокувати легітимні складні алгоритми (потребує `// complexity-exception`)
- Не охоплює архітектурну складність (потрібні CK metrics — ADR-006)

---

> Пов'язані артефакти (Obsidian Graph): [[sdd]] | [[isd]] | [[maintenance]]
