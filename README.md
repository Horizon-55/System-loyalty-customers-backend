# System-loyalty-customers-backend

> **Статус:** Production-ready (Test Environment) | Node.js + TypeScript | DDD Microservices  
> **Якість:** ✅ CI/CD Green | CC ≤ 10 | CBO ≤ 9 | LCOM4 = 1 | SQALE Grade A  

Мікросервісний backend для управління **програмою лояльності клієнтів** з повним стеком якості (Лабораторні роботи №5–10).

---

## 🗺️ Архітектура

Система побудована за принципами **Domain-Driven Design (DDD)** та **Clean Architecture**:

```
customer-service/src/
├── modules/customers/
│   ├── Api/                    ← HTTP Layer (Controller + Routes)
│   ├── application/            ← Use Cases (CustomerService Facade)
│   │   ├── services/           ← Decomposed Services (Lab 8)
│   │   │   ├── CustomerCoreService.ts    (CBO=8, LCOM4=1)
│   │   │   ├── CustomerPrivacyService.ts (CBO=6, LCOM4=1)
│   │   │   └── CustomerConsentService.ts (CBO=9, LCOM4=1)
│   │   └── ports/              ← Interfaces (DIP)
│   ├── domain/                 ← Entities + Value Objects
│   └── infrastructure/         ← Repository + RabbitMQ
├── common/
│   ├── middlewares/            ← Error, Validation, Tracing, Fault Injection
│   └── logging/                ← PiiSanitizer (GDPR masking)
└── tests/                      ← Unit + Integration Tests
```

## 🛠️ Tech Stack

| Компонент | Технологія | Версія |
|---|---|---|
| Runtime | Node.js | v24.x (dev), v20 LTS (CI) |
| Language | TypeScript | 5.x |
| Framework | Express | 4.x |
| Testing | Node.js built-in test runner + tsx | — |
| Message Broker | RabbitMQ (AMQP) | — |
| Database (test) | MongoMemoryServer | — |
| CI/CD | GitHub Actions | ubuntu-latest |
| Secret Scanning | Gitleaks | pre-commit hook |
| Documentation | Markdown (Documentation as Code) | — |

## 🚀 Quickstart

```bash
# 1. Clone
git clone https://github.com/Horizon-55/System-loyalty-customers-backend.git
cd System-loyalty-customers-backend

# 2. Install root dependencies
npm install

# 3. Install customer-service dependencies
npm install --prefix customer-service/src

# 4. Copy environment config
cp .env.example .env

# 5. Start customer-service
cd customer-service/src
npx tsx app.ts
# → http://localhost:3001
# → http://localhost:3001/api-docs (Swagger UI)
```

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/customers` | Register new customer |
| `GET` | `/api/v1/customers/:id` | Get customer by ID |
| `POST` | `/api/v1/customers/:id/upgrade-to-premium` | Upgrade to Premium tier |
| `GET` | `/api/v1/customers/:id/personal-data` | GDPR data export |
| `POST` | `/api/v1/customers/:id/anonymize` | GDPR right to erasure |
| `POST` | `/api/v1/customers/:id/consents` | Grant consent |
| `DELETE`| `/api/v1/customers/:id/consents/:id` | Revoke consent |
| `GET` | `/health` | Health check |
| `GET` | `/api-docs` | Swagger documentation |

## 🧪 Running Tests

```bash
# All privacy + consent tests
npx tsx --test customer-service/src/tests/privacy.test.ts

# God Object decomposition tests (Lab 8)
npx tsx --test customer-service/src/tests/shotgunSurgeryCrash.test.ts

# Inheritance composition tests (Lab 8)
npx tsx --test customer-service/src/tests/inheritanceFragilityCrash.test.ts

# Chapin complexity audit (Lab 7)
npm run chapin:audit

# Hotspots matrix (Lab 7)
npm run hotspots:audit
```

## 📊 Quality Metrics (Current State)

| Метрика | Значення | Поріг | Статус |
|---|---|---|---|
| Cyclomatic Complexity (max) | 8 | ≤ 10 | ✅ |
| Halstead Volume (max) | 240 | ≤ 300 | ✅ |
| CBO (CustomerCoreService) | 8 | ≤ 15 | ✅ |
| LCOM4 (всі сервіси) | 1 | = 1 | ✅ |
| DIT (NotificationService) | 1 | ≤ 2 | ✅ |
| SQALE Rating | A (0.55%) | ≤ 5% | ✅ |

## 📚 Документація

| Документ | Опис |
|---|---|
| [docs/sdd.md](docs/sdd.md) | System Design Document (C4 diagrams, ER, API spec) |
| [docs/isd.md](docs/isd.md) | Infrastructure Specification (topology, CI/CD, RTO/RPO) |
| [docs/maintenance.md](docs/maintenance.md) | Documentation Maintenance Regime |
| [docs/architecture/adr/](docs/architecture/adr/) | Architecture Decision Records (8 ADRs) |
| [reports/](reports/) | Quality audit reports (Labs 5–10) |

## 🔀 Git History (Key Commits)

```
ccd89c6  docs(audit): add comprehensive Lab 8 OO design audit wiki report
1a97519  refactor(audit): replace inheritance with composition pattern, PASS
f9190a2  arch(audit): capture inheritance fragility crash, FAIL
e40e50a  refactor(audit): eliminate god object via interface decomposition, PASS
a06ec43  arch(audit): capture god object coupling failure, FAIL
a0ab991  fix(ci): resolve npm install path for customer-service
```

---

> 📖 **Documentation as Code** — вся документація зберігається в Git разом з кодом  
> 🔒 **Always Ready to Handover** — система готова до передачі новій команді в будь-який момент  
> ⚡ **Bus Factor ≥ 2** — знання збережені в ADR, SDD та ISD
