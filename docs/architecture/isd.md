---
owner: Horizon-55
status: published
review_date: 2027-02-16
tags:
  - infrastructure
  - isd
  - devops
  - rto-rpo
  - ci-cd
---

# Infrastructure Specification Document (ISD)
## System-loyalty-customers-backend

> **Версія:** 1.0.0  
> **Дата:** 2026-11-16  
> **Статус:** Active  
> **Розробник:** Horizon-55  
> **Останнє оновлення:** Лабораторна робота №10 — Documentation Engineering  

---

## 1. Мережева Топологія

```mermaid
flowchart TD
    subgraph Internet["🌐 Internet / Client Layer"]
        HC["HTTP Client\n(Postman / cURL / Frontend)"]
    end

    subgraph Gateway["🔀 API Gateway Layer (:3000)"]
        AG["api-gateway\nNode.js + Express\n---\nAuth Middleware\nConsul Service Discovery\nPrometheus /metrics\nRate Limiting"]
    end

    subgraph Services["⚙️ Microservices Layer"]
        CS["customer-service\n:3001\n---\nNode.js + TypeScript\nDomain-Driven Design\nSwagger /api-docs"]
        
        PS["point-service\n:3002\n---\nNode.js + TypeScript\nLoyalty Points Engine"]
    end

    subgraph Messaging["📨 Message Broker"]
        RMQ["RabbitMQ\n:5672 (AMQP)\n:15672 (Management UI)\n---\nQueue: customer.events\nQueue: point.events"]
    end

    subgraph Storage["🗃️ Data Storage Layer"]
        MDB["MongoDB (MongoMemoryServer)\nIn-Process / Test\n---\nCollection: customers\nCollection: consents"]
        
        CONSUL["Consul\nService Registry\n---\nHealth Checks\nService Discovery"]
    end

    HC -->|"HTTPS :443 / HTTP :3000"| AG
    AG -->|"HTTP Proxy"| CS
    AG -->|"HTTP Proxy"| PS
    AG -->|"Service Lookup"| CONSUL
    CS -->|"AMQP Publish"| RMQ
    PS -->|"AMQP Subscribe"| RMQ
    RMQ -->|"AMQP Subscribe"| CS
    CS -->|"Read / Write"| MDB
    CS -->|"Register"| CONSUL
    PS -->|"Register"| CONSUL
```

---

## 2. Середовища (Environments)

| Параметр | Development | Test (CI) | Production (Target) |
| :--- | :---: | :---: | :---: |
| **Platform** | Windows / macOS local | GitHub Actions (ubuntu-latest) | Cloud VPS / Docker |
| **Node.js** | v24.x | v20 LTS | v20 LTS |
| **Database** | MongoMemoryServer | MongoMemoryServer | MongoDB Atlas / Standalone |
| **RabbitMQ** | Local Docker | — (mocked) | CloudAMQP |
| **API Gateway** | localhost:3000 | — | Nginx / Cloudflare |
| **Customer Service** | localhost:3001 | localhost:3001 | container:3001 |
| **Point Service** | localhost:3002 | — | container:3002 |
| **Secret Management** | .env (gitignored) | GitHub Secrets | Vault / Env Vars |
| **Monitoring** | Console logs | GitHub Actions logs | Prometheus + Grafana |

---

## 3. CI/CD Пайплайн (GitHub Actions)

```mermaid
flowchart LR
    subgraph Trigger["⚡ Trigger"]
        PUSH["git push → main\nor Pull Request"]
    end

    subgraph Pipeline["🔄 GitHub Actions Pipeline\n.github/workflows/complexity-hotspots.yml"]
        S1["Step 1\nCheckout\n(fetch-depth: 0\nfull git history)"]
        S2["Step 2\nSetup Node.js v20\n+ npm cache"]
        S3["Step 3\nInstall Dependencies\nnpm install\n(monorepo + services)"]
        S4["Step 4\n🔬 Chapin Semantic\nData Complexity Audit\nnpm run chapin:audit"]
        S5["Step 5\n🧬 Mutation Immunity\nUnit Tests\nnpm run test:mutation"]
        S6["Step 6\n📊 Halstead & McCabe\nBaseline Telemetry\nnpm run complexity:baseline"]
        S7["Step 7\n🗺️ Hotspots Risk Matrix\nJSON Export\nnpm run hotspots:audit"]
        S8["Step 8\n📤 Upload Artifacts\nreports/hotspots-matrix.json\nretention: 30 days"]
    end

    subgraph Gates["✅ Quality Gates"]
        QG1["CC ≤ 10\n(Cyclomatic Complexity)"]
        QG2["Halstead V ≤ 300\nper function"]
        QG3["Chapin Q ≤ 20\nper module"]
        QG4["All tests PASS\n(no mutations survive)"]
    end

    PUSH --> S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7 --> S8
    S4 -.->|"enforces"| QG3
    S5 -.->|"enforces"| QG4
    S6 -.->|"enforces"| QG1
    S6 -.->|"enforces"| QG2
```

### CI/CD History (Останні запуски):

| Run ID | SHA | Статус | Опис |
| :--- | :--- | :---: | :--- |
| 42601129359 | `1a97519` | ✅ SUCCESS | refactor(audit): replace inheritance with composition pattern, PASS |
| 42596945985 | `a0ab991` | ✅ SUCCESS | fix(ci): resolve npm install path for customer-service |
| 42589818685 | `c1072a0` | ❌ FAILURE | ci(hotspots): implement cloud complexity scanner (bootstrap failure) |

---

## 4. Reliability Engineering: RTO та RPO

| Параметр | Визначення | Цільове значення | Поточний стан |
| :--- | :--- | :---: | :---: |
| **RTO** (Recovery Time Objective) | Максимально допустимий час відновлення після збою | **< 15 хвилин** | ⚠️ Manual (no auto-restart) |
| **RPO** (Recovery Point Objective) | Максимально допустима втрата даних | **0 хвилин** | ✅ In-memory (no persistence loss) |
| **Uptime SLA** | Цільова доступність | **99.5%** | ⚠️ Single instance |
| **MTTR** (Mean Time to Repair) | Середній час відновлення | **< 10 хвилин** | ⚠️ Manual deployment |
| **MTBF** (Mean Time Between Failures) | Середній час між відмовами | **> 720 годин** | ✅ Stable (Fault Injection tested) |

> **Примітка щодо MongoMemoryServer:** Поточна архітектура використовує in-process database (тестове середовище). Для production обов'язковий перехід на persistent MongoDB з реплікасет для RPO = 0.

---

## 5. Security Architecture

| Шар | Механізм | Статус |
| :--- | :--- | :---: |
| Secrets Management | `.env` (gitignored) + `.env.example` | ✅ |
| Secret Scanning | Gitleaks pre-commit hook | ✅ |
| PII Data Masking | `PiiSanitizer` (email/phone в логах) | ✅ |
| Input Validation | `validation.middleware.ts` | ✅ |
| Error Sanitization | `errorHandler.middleware.ts` (не розкриває стек) | ✅ |
| Fault Injection | `faultInjection.middleware.ts` (Chaos Engineering) | ✅ |
| GDPR Compliance | Consent Management + Anonymization | ✅ |
| HTTPS | — (передбачений через Nginx/proxy) | ⚠️ |

---

## 6. Deployment Checklist (Dev → Production)

```
[ ] 1. Замінити MongoMemoryServer на MongoDB Atlas (persistent storage)
[ ] 2. Налаштувати реальний RabbitMQ (CloudAMQP або self-hosted)
[ ] 3. Перейти на HTTPS (Nginx reverse proxy + Let's Encrypt)
[ ] 4. Налаштувати Prometheus + Grafana для моніторингу
[ ] 5. Увімкнути auto-restart (PM2 / Docker healthcheck)
[ ] 6. Налаштувати backup MongoDB (RPO = 0)
[ ] 7. Встановити CDN + Rate Limiting на API Gateway
[ ] 8. Секрети перенести в Vault / GitHub Secrets (не .env)
```

---

> Пов'язані документи (Obsidian Graph): [[sdd]] | [[maintenance]] | [[handover]] | [[environment]] | [[ADR-0002-in-memory-repository]]
