# Documentation Maintenance Regime
## System-loyalty-customers-backend

> **Принцип:** "Документ без власника та дати перегляду є автоматично deprecated"  
> **Оновлено:** 2026-11-16  
> **Відповідальний:** Solution Architect  

---

## Правило: Документ = Код

Кожен документ системи зобов'язаний:
1. Мати **власника** (`owner`) — конкретну роль або людину
2. Мати **дату наступного перегляду** (`review_date`)
3. Оновлюватися протягом **5 робочих днів** після будь-якої архітектурної зміни
4. Перевірятися командою не рідше **1 разу на 90 днів**

---

## Реєстр документів та розклад обслуговування

| Документ | Тип | Власник | Останнє оновлення | Наступний перегляд | Частота | Статус |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `docs/sdd.md` | System Design | Architect | 2026-11-16 | 2027-02-16 | Щоквартально | ✅ CURRENT |
| `docs/isd.md` | Infrastructure | DevOps | 2026-11-16 | 2027-02-16 | Щоквартально | ✅ CURRENT |
| `docs/maintenance.md` | Process | Architect | 2026-11-16 | 2027-02-16 | Щоквартально | ✅ CURRENT |
| `docs/architecture/adr/ADR-001` | Decision | Architect | 2026-11-16 | 2027-05-16 | Пів-річно | ✅ CURRENT |
| `docs/architecture/adr/ADR-002` | Decision | Architect | 2026-11-16 | 2027-05-16 | Пів-річно | ✅ CURRENT |
| `docs/architecture/adr/ADR-003` | Decision | QA | 2026-11-16 | 2027-05-16 | Пів-річно | ✅ CURRENT |
| `docs/architecture/adr/ADR-004` | Decision | Dev Lead | 2026-11-16 | 2027-05-16 | Пів-річно | ✅ CURRENT |
| `docs/architecture/adr/ADR-005` | Decision | QA | 2026-11-16 | 2027-05-16 | Пів-річно | ✅ CURRENT |
| `docs/architecture/adr/ADR-006` | Decision | Architect | 2026-11-16 | 2027-05-16 | Пів-річно | ✅ CURRENT |
| `docs/architecture/adr/ADR-007` | Decision | Architect | 2026-11-16 | 2027-05-16 | Пів-річно | ✅ CURRENT |
| `docs/architecture/adr/ADR-008` | Decision | QA | 2026-11-16 | 2027-05-16 | Пів-річно | ✅ CURRENT |
| `reports/gqm-enterprise-matrix.md` | Quality | QA | 2026-10-26 | 2027-01-26 | Щоквартально | ✅ CURRENT |
| `.github/workflows/complexity-hotspots.yml` | CI/CD | DevOps | 2026-11-09 | 2027-02-09 | Щоквартально | ✅ CURRENT |
| `sonar-project.properties` | Config | DevOps | 2026-09-28 | 2027-01-28 | Щоквартально | ✅ CURRENT |
| `README.md` | Overview | Architect | ❌ MISSING | — | Щомісячно | 🔴 DEAD-DOC |

---

## Правила ескалації

| Вік документа | Дія |
| :---: | :--- |
| 0–90 днів | ✅ Документ вважається актуальним |
| 91–180 днів | ⚠️ **Documentation Decay Warning** — власник отримує нотифікацію |
| > 180 днів | 🔴 **Dead Documentation** — документ позначається `[DEPRECATED]` та виноситься на архівування |

---

## Процедура оновлення ADR

При зміні архітектурного рішення:
1. **Не видаляти** старий ADR
2. Змінити статус на `Superseded` та вказати `Superseded by: ADR-00N`
3. Створити новий ADR з актуальним рішенням
4. Оновити посилання у `docs/sdd.md`

```markdown
# ADR-00N: Стара назва
**Статус:** Superseded by ADR-00M
**Дата:** YYYY-MM-DD
...
```
