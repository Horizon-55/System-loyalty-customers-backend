---
owner: Solution Architect
status: accepted
review_date: 2027-05-16
tags:
  - architecture
  - adr
  - adr-006
---

# ADR-0006: God Object Decomposition — Interface Segregation (SRP + DIP)

**Статус:** Accepted  
**Дата:** 2026-11-09  
**Власник:** Solution Architect  
**Контекст лабораторної:** Лабораторна №8 (OO Design Audit — Task 2)  

---

## Контекст

Аудит CK-метрик (Lab 8 Task 1) виявив критичний антипатерн **God Object** у `CustomerService.ts`:
- CBO = 16 (> 15 ❌) — Coupling Between Objects
- LCOM4 = 2 (> 1 ❌) — Lack of Cohesion of Methods
- WMC = 31 — 31 метод в одному класі

**Ефект Shotgun Surgery:** будь-яка зміна бізнес-вимоги вимагала модифікацій у 16+ пов'язаних класах. Краш-тест `shotgunSurgeryCrash.test.ts` підтвердив FAIL.

## Рішення

Застосовано **Interface Segregation Principle (ISP)** та **Dependency Inversion Principle (DIP)**:

```
CustomerService (God Object, CBO=16, LCOM4=2)
    ↓ DECOMPOSED INTO
ICustomerCoreService    → CustomerCoreService    (CBO=8,  LCOM4=1)
ICustomerPrivacyService → CustomerPrivacyService (CBO=6,  LCOM4=1)  
ICustomerConsentService → CustomerConsentService (CBO=9,  LCOM4=1)
CustomerService         → Composite Facade (делегує до 3-х вище)
```

**Git commits:** `a06ec43` (FAIL) → `e40e50a` (PASS)

## Наслідки

✅ Позитивні:
- CBO: 16 → max 9 (-44%)
- LCOM4: 2 → 1 (-50%)
- 100% тестів пройдено (20/20 privacy tests + 3 shotgun surgery tests)
- Кожен мікросервіс відповідає за одну відповідальність (SRP)

⚠️ Негативні:
- Збільшилася кількість файлів (3 інтерфейси + 3 сервіси)
- Backward compatibility вимагала Composite Facade (не Breaking Change)

---

> Пов'язані артефакти (Obsidian Graph): [[sdd]] | [[isd]] | [[maintenance]]
