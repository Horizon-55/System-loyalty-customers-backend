---
owner: Lead Solution Architect
status: published
review_date: 2027-02-16
tags:
  - developer
  - standards
  - quality-gates
  - clean-code
---

# Стандарти інженерної якості коду: coding-standards.md

> **Цільова аудиторія:** Інженери-розробники, рев'юери  
> **Основа:** Дослідження та стандарти Лабораторних робіт №5–9  
> **Теги:** #developer #standards #architecture #quality  

---

## 1. Архітектурні принципи

- **Domain-Driven Design (DDD):** Суворе розділення на шари:
  - `domain/` — агрегати, сутності, Value Objects, бізнес-правила без зовнішніх залежностей.
  - `application/` — юзкейси, інтерфейсні порти (`ports/`), декомпозовані сервіси (`CustomerCoreService`, `CustomerPrivacyService`, `CustomerConsentService`).
  - `infrastructure/` — адаптери до БД (`InMemoryCustomerRepository`), RabbitMQ брокер.
  - `Api/` — маршрутизація, валідація DTO, контролери Express.
- **SOLID & GoF:**
  - *Single Responsibility (SRP):* Відсутність класів типу God Object ($CBO \le 8$, $LCOM4 = 1$).
  - *Dependency Inversion (DIP):* Високорівневі модулі залежать від абстракцій (інтерфейсів), а не конкретних реалізацій.
  - *Composition over Inheritance:* Відмова від глибоких вертикальних ієрархій спадкування ($DIT \le 2$, бажано $DIT = 1$).

---

## 2. Метричні Quality Gates (Автоматичний контроль)

Будь-який код, що потрапляє в репозиторій, автоматично перевіряється pre-commit хуками та GitHub Actions:

| Метрика якості | Інструмент перевірки | Допустимий поріг | Реакція при перевищенні |
| :--- | :--- | :---: | :--- |
| **Цикломатична складність (CC)** | `scripts/check-staged-complexity.js` | $CC \le 10$ | Блокування `git commit` |
| **Об'єм Холстеда ($V$)** | `scripts/complexity-analyzer.js` | $V \le 300$ | Попередження у CI/CD |
| **Семантична складність Чепіна ($Q$)** | `scripts/chapin-analyzer.js` | $Q \le 20$ | Блокування злиття PR |
| **Зв'язність класів (CBO)** | `scripts/sonar-metrics-engine.js` | $CBO \le 15$ | Рефакторинг (Shotgun Surgery alert) |
| **Когезія методів (LCOM4)** | `scripts/sonar-metrics-engine.js` | $LCOM4 = 1$ | Декомпозиція класу |
| **Витоки секретів** | Gitleaks binary | **0 знайдених** | Блокування `git commit` |

---

## 3. Обробка персональних даних (GDPR / Privacy by Design)

- Пряме логування чутливих даних заборонено.
- Обов'язкове використання `PiiSanitizer` для маскування email (`j***e@example.com`) та телефонів (`+380***4567`).
- Будь-яка маркетингова розсилка вимагає попередньої перевірки згоди через `ICustomerConsentService` та `ConsentPolicyGate`.

> Пов'язані документи: [[CONTRIBUTING]] | [[sdd]] | [[ADR-0004-complexity-thresholds]] | [[ADR-0006-god-object-decomposition]]
