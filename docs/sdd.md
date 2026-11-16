# System Design Document (SDD)
## System-loyalty-customers-backend

> **Версія:** 1.0.0  
> **Дата:** 2026-11-16  
> **Статус:** Active  
> **Розробник:** Horizon-55  
> **Останнє оновлення:** Лабораторна робота №10 — Documentation Engineering  

---

## 1. Системний Контекст (C4 Level 1 — System Context)

```mermaid
flowchart TD
    PO["👤 Product Owner\n(Бізнес-вимоги)"]
    Dev["👨‍💻 Developer\n(REST API Client)"]
    QA["🧪 QA Engineer\n(Тестування)"]
    DevOps["⚙️ DevOps\n(CI/CD, Deployment)"]
    Ext["🌐 Зовнішні системи\n(Marketing, Analytics)"]

    SYS["🏗️ System-loyalty-customers-backend\n---\nMicroservice Backend\nNode.js / TypeScript\nDomain-Driven Design"]

    PO -->|"Визначає вимоги"| SYS
    Dev -->|"REST API запити\n(HTTP/JSON)"| SYS
    Ext -->|"RabbitMQ events\n(AMQP)"| SYS
    SYS -->|"Відповіді JSON\n+ loyalty events"| Ext
    QA -->|"Automated Tests\n+ Quality Gates"| SYS
    DevOps -->|"CI/CD Pipeline\nGitHub Actions"| SYS
```

**Опис системи:**  
`System-loyalty-customers-backend` — це мікросервісний backend для управління лояльністю клієнтів. Система обробляє реєстрацію клієнтів, управління персональними даними (GDPR/CCPA), систему згод (Consent Management) та програму лояльності (Loyalty Tiers: Standard → Premium).

---

## 2. Контейнерна Діаграма (C4 Level 2 — Container)

```mermaid
flowchart LR
    Client["🌐 HTTP Client\n(REST / cURL / Postman)"]

    subgraph Backend["System-loyalty-customers-backend"]
        GW["🔀 API Gateway\nNode.js + Express\n:3000\n---\nAuth Middleware\nConsul Discovery\nPrometheus Metrics"]
        
        CS["👥 Customer Service\nNode.js + TypeScript\n:3001\n---\nDDD Architecture\nSWAGGER /api-docs\nIn-Memory DB (Test)"]
        
        PS["⭐ Point Service\nNode.js + TypeScript\n:3002\n---\nLoyalty Points Engine\nTransaction Log"]
        
        MQ["📨 RabbitMQ\nMessage Broker\n:5672\n---\nCustomer Events\nPoint Events"]
        
        DB["🗃️ MongoDB (Memory)\nMongoMemoryServer\n---\nCustomer Documents\nConsent Records"]
    end

    Client -->|"HTTP :3000"| GW
    GW -->|"Proxy HTTP"| CS
    GW -->|"Proxy HTTP"| PS
    CS <-->|"AMQP Publish/Subscribe"| MQ
    PS <-->|"AMQP Publish/Subscribe"| MQ
    CS -->|"Read/Write"| DB
```

---

## 3. Компонентна Діаграма (C4 Level 3 — Component: Customer Service)

```mermaid
flowchart TD
    subgraph API["🌐 API Layer"]
        CR["CustomerRoutes\n(Express Router)"]
        CC["CustomersController\n(HTTP Handler)"]
    end

    subgraph APP["⚙️ Application Layer"]
        CS["CustomerService\n(Composite Facade)"]
        
        subgraph Services["Decomposed Services (Lab 8 Refactoring)"]
            CCS["CustomerCoreService\nCBO=8, LCOM4=1"]
            CPS["CustomerPrivacyService\nCBO=6, LCOM4=1"]
            CNS["CustomerConsentService\nCBO=9, LCOM4=1"]
        end
        
        CPG["ConsentPolicyGate\n(GDPR/CCPA Rules)"]
    end

    subgraph DOMAIN["🎯 Domain Layer"]
        CU["Customers\n(Aggregate Root)"]
        LT["LoyaltyTier\n(Value Object)"]
        PM["CustomerPrivacyModels\n(Domain Models)"]
    end

    subgraph INFRA["🔧 Infrastructure Layer"]
        IMR["InMemoryCustomerRepository\n(implements ICustomerRepository)"]
        RMQ_P["RabbitMQPublisher\n(Event Publisher)"]
        RMQ_C["RabbitMQConsumer\n(Event Handler)"]
        MMS["MongoMemorySetup\n(Test Database)"]
    end

    subgraph COMMON["🛠️ Common / Cross-Cutting"]
        PS["PiiSanitizer\n(GDPR Data Masking)"]
        SL["SecureLogger\n(Structured Logging)"]
        EH["ErrorHandler\n(Global Error Boundary)"]
        FI["FaultInjection\n(Chaos Engineering)"]
        TM["TracingMiddleware\n(Correlation ID)"]
    end

    CR --> CC
    CC --> CS
    CS --> CCS
    CS --> CPS
    CS --> CNS
    CCS --> IMR
    CPS --> IMR
    CNS --> IMR
    CNS --> CPG
    IMR --> CU
    CU --> LT
    CPS --> PM
    CNS --> PM
    CC -.->|"uses"| PS
    CC -.->|"uses"| TM
```

---

## 4. Доменна Модель (ER-Діаграма)

```mermaid
erDiagram
    CUSTOMER {
        string id PK
        string email
        string firstName
        string lastName
        string phone
        LoyaltyTier tier
        boolean anonymized
        datetime createdAt
        datetime updatedAt
    }

    USER_CONSENT {
        string id PK
        string userId FK
        string purposeId
        boolean granted
        datetime grantedAt
        datetime revokedAt
        string correlationId
    }

    LOYALTY_TIER {
        string value "STANDARD | PREMIUM"
        number pointsMultiplier
        string[] benefits
    }

    PERSONAL_DATA_EXPORT {
        string subjectId FK
        string correlationId
        datetime exportedAt
        object personalData
        string[] consentHistory
    }

    CUSTOMER ||--o{ USER_CONSENT : "has consents"
    CUSTOMER ||--|| LOYALTY_TIER : "has tier"
    CUSTOMER ||--o| PERSONAL_DATA_EXPORT : "can export"
```

---

## 5. API Специфікація

### Base URL: `http://localhost:3001/api/v1`

| Метод | Шлях | Призначення | Auth |
| :---: | :--- | :--- | :---: |
| `POST` | `/customers` | Реєстрація нового клієнта | — |
| `GET` | `/customers/:id` | Отримати клієнта за ID | — |
| `POST` | `/customers/:id/upgrade-to-premium` | Підвищення до Premium tier | — |
| `GET` | `/customers/:id/personal-data` | GDPR export персональних даних | Bearer |
| `POST` | `/customers/:id/anonymize` | Анонімізація (GDPR right to erasure) | Bearer |
| `POST` | `/customers/:id/consents` | Надання згоди (CCPA/GDPR) | Bearer |
| `DELETE` | `/customers/:id/consents/:purposeId` | Відкликання згоди | Bearer |
| `GET` | `/customers/:id/consents` | Перегляд всіх згод | Bearer |
| `POST` | `/customers/:id/marketing` | Маркетингова розсилка (з перевіркою consent) | Bearer |
| `GET` | `/health` | Health check endpoint | — |
| `GET` | `/api-docs` | Swagger UI документація | — |

### Приклад запиту (POST /customers):
```json
{
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+380671234567"
}
```

### Приклад відповіді:
```json
{
  "id": "uuid-v4",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "tier": "STANDARD",
  "anonymized": false,
  "createdAt": "2026-11-16T10:00:00.000Z"
}
```

---

## 6. Ключові Архітектурні Рішення (посилання на ADR)

| Рішення | ADR | Статус |
| :--- | :---: | :---: |
| Node.js + TypeScript + Express | [ADR-001](./architecture/adr/ADR-001-nodejs-typescript.md) | Accepted |
| In-Memory Repository для тестів | [ADR-002](./architecture/adr/ADR-002-in-memory-repository.md) | Accepted |
| GQM-матриця вимірювання якості | [ADR-003](./architecture/adr/ADR-003-gqm-quality-matrix.md) | Accepted |
| CC ≤ 10, Halstead Complexity Thresholds | [ADR-004](./architecture/adr/ADR-004-complexity-thresholds.md) | Accepted |
| Chapin Semantic Audit + Hotspots | [ADR-005](./architecture/adr/ADR-005-chapin-semantic-audit.md) | Accepted |
| God Object → Interface Decomposition | [ADR-006](./architecture/adr/ADR-006-god-object-decomposition.md) | Accepted |
| Replace Inheritance with Composition | [ADR-007](./architecture/adr/ADR-007-composition-over-inheritance.md) | Accepted |
| SQALE Financial Model for Tech Debt | [ADR-008](./architecture/adr/ADR-008-sqale-financial-model.md) | Accepted |
