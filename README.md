# System Loyalty Customers Backend

> ⚠️ **[DOCUMENTATION DECAY SIMULATION — FAIL STATE]**  
> Цей README навмисно містить застарілу інформацію для демонстрації Documentation Decay Audit (Лаб 10)

## About

Simple monolithic customer management REST API.

## Architecture

The system uses a **monolithic CustomerService** that handles all operations:
- Customer registration
- Data retrieval
- Loyalty management

```
CustomerService (single class, all-in-one)
├── getCustomerById()
├── registerCustomer()
├── upgradeToPremium()
├── exportPersonalData()
├── anonymizeCustomer()
├── grantConsent()
└── revokeConsent()
```

## Running

```bash
npm install
npm start
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/customers | Create customer |
| GET  | /api/customers/:id | Get customer |

## Tech Stack

- Node.js
- JavaScript (ES6)
- Express.js

> **Note:** No TypeScript, no tests, no CI/CD configured.
