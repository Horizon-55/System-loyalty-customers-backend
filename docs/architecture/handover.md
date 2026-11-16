---
owner: Solution Architect
status: published
review_date: 2027-02-16
tags:
  - architecture
  - handover
  - onboarding
  - bus-factor
---

---
owner: Horizon-55
status: published
review_date: 2027-02-16
tags:
  - architecture
  - handover
  - onboarding
  - bus-factor
---

# Handover Package
## System-loyalty-customers-backend

> **Мета:** Забезпечити будь-якому новому розробнику / команді повну передачу знань про систему за ≤ 60 хвилин  
> **Принцип:** "Always Ready to Handover" — система готова до передачі в будь-який момент  
> **Дата:** 2026-11-16  

---

## ⚡ Quickstart — Запуск за 5 хвилин

```bash
# 1. Клонування
git clone https://github.com/Horizon-55/System-loyalty-customers-backend.git
cd System-loyalty-customers-backend

# 2. Залежності
npm install
npm install --prefix customer-service/src

# 3. Змінні середовища
cp .env.example .env

# 4. Запуск customer-service
cd customer-service/src && npx tsx app.ts
# → http://localhost:3001/api-docs (Swagger UI)

# 5. Запуск тестів
npx tsx --test customer-service/src/tests/privacy.test.ts
```

---

## 📚 Топ-5 файлів для читання ПЕРШИМИ

| Пріоритет | Файл | Навіщо читати |
| :---: | :--- | :--- |
| **1️⃣** | [`docs/architecture/sdd.md`](sdd.md) | Загальне розуміння архітектури (C4-діаграми, доменна модель, API) |
| **2️⃣** | [`docs/architecture/isd.md`](isd.md) | Як система розгортається, CI/CD, RTO/RPO, мережева топологія |
| **3️⃣** | [`README.md (Головна)`](../index.md) | Quickstart, tech stack, чотирирівнева піраміда |
| **4️⃣** | [`docs/architecture/adr/`](adr/ADR-0001-nodejs-typescript.md) | Чому система спроектована саме так (8 ключових рішень) |
| **5️⃣** | `customer-service/src/app.ts` | Точка входу: як все з'єднується (bootstrap sequence) |

---

## 🏗️ Архітектурна карта (для нового розробника)

```
Щоб зрозуміти систему, читай шарами (зовні → всередину):

1. HTTP Request → customer-service/src/modules/customers/Api/CustomerRoutes.ts
2. Controller  → customer-service/src/modules/customers/Api/CustomersController.ts
3. Facade      → customer-service/src/modules/customers/application/CustomerService.ts
4. Services    → application/services/{CustomerCoreService, CustomerPrivacyService, CustomerConsentService}
5. Repository  → infrastructure/InMemoryCustomerRepository.ts
6. Entity      → domain/Customers.ts (Aggregate Root)
```

---

## 🚌 Bus Factor Аналіз

**Bus Factor** = мінімальна кількість людей, після "зникнення" яких проєкт стає некерованим.

### Поточний стан: Bus Factor = 1 → ціль = 2+

| Область знань | Носій знань | Задокументовано? | Ризик |
| :--- | :--- | :---: | :---: |
| Загальна архітектура DDD | Architect | ✅ `docs/sdd.md` | 🟢 Low |
| Infrastructure / Deployment | Architect | ✅ `docs/isd.md` | 🟢 Low |
| Архітектурні рішення (ADR) | Architect | ✅ `docs/architecture/adr/` | 🟢 Low |
| CI/CD налаштування | Architect | ✅ `.github/workflows/` + `docs/isd.md` | 🟢 Low |
| Quality metrics & thresholds | Architect | ✅ `reports/gqm-enterprise-matrix.md` | 🟢 Low |
| PII / GDPR compliance rules | Architect | ✅ `reports/pii-inventory.md` + `erasure-anonymization-policy.md` | 🟢 Low |
| RabbitMQ topology | Architect | ✅ `docs/isd.md` | 🟢 Low |
| Test suite logic | Architect | ⚠️ Лише в коді тестів | 🟡 Medium |
| .env secret values | Architect | ❌ Тільки в голові | 🔴 HIGH |

### ⚠️ Single Points of Knowledge (критичні ризики):

1. **`.env` Secret Values** — поточні значення знає тільки 1 особа. Рішення: перенести у Vault або GitHub Secrets.
2. **RabbitMQ credentials** — зберігаються лише в `.env`. Рішення: задокументувати процедуру ротації.

---

## 🗺️ Карта технічного боргу (для нової команди)

| Борг | Пріоритет | Складність | ADR |
| :--- | :---: | :---: | :---: |
| Замінити MongoMemoryServer на persistent MongoDB | 🔴 High | Medium | ADR-002 |
| Додати HTTPS (Nginx reverse proxy) | 🔴 High | Low | ADR-001 |
| Налаштувати реальний RabbitMQ | 🟡 Medium | Medium | ADR-001 |
| Додати Prometheus + Grafana моніторинг | 🟡 Medium | High | ADR-001 |
| Перенести секрети у Vault | 🟡 Medium | Low | — |
| Написати End-to-End тести | 🟢 Low | High | — |

---

## 📞 Контакти та ескалація

| Роль | Відповідальність | Контакт |
| :--- | :--- | :--- |
| Solution Architect | Архітектура, ADR, SDD, ISD | Команда проєкту |
| QA Engineer | Тести, GQM-матриця, SQALE | Команда проєкту |
| DevOps | CI/CD, GitHub Actions, secrets | Команда проєкту |

---

> 🔑 **Ключовий принцип:** Якщо нова людина не може запустити систему та зрозуміти її архітектуру за 60 хвилин лише з цього репозиторію — документація неповна. Цей Handover Package вирішує саме цю задачу.
