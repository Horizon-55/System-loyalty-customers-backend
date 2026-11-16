---
owner: Horizon-55
status: published
review_date: 2027-02-16
tags:
  - developer
  - environment
  - setup
  - ops
---

# Локальне середовище розробки: environment.md

> **Цільова аудиторія:** Нові розробники, DevOps, QA  
> **Призначення:** Інструкція розгортання робочого місця за $\le 15$ хвилин  
> **Теги:** #developer #environment #ops  

---

## 1. Системні вимоги

| Компонент | Мінімальна версія | Рекомендована версія | Призначення |
| :--- | :---: | :---: | :--- |
| **Node.js** | v20.x LTS | v24.x Current | Середовище виконання сервісів |
| **npm** | 10.x | 10.x+ | Менеджер пакетів |
| **Python** | 3.10+ | 3.11+ | Генерація документації (MkDocs Material) |
| **Git** | 2.40+ | Останній стабільний | Керування версіями |
| **Docker / Compose** | 24.x | 27.x+ | (Опціонально) Запуск RabbitMQ та PostgreSQL |

---

## 2. Швидке розгортання (Step-by-step)

### Крок 1: Клонування репозиторію
```bash
git clone https://github.com/Horizon-55/System-loyalty-customers-backend.git
cd System-loyalty-customers-backend
```

### Крок 2: Встановлення залежностей проєкту
```bash
# Встановлення кореневих інструментів та скриптів
npm install

# Встановлення залежностей основного сервісу
npm install --prefix customer-service/src
```

### Крок 3: Конфігурація змінних оточення
```bash
cp .env.example .env
# За замовчуванням .env налаштований на роботу з in-memory базою даних (MongoMemoryServer)
```

### Крок 4: Запуск сервісу в режимі розробки
```bash
cd customer-service/src
npx tsx app.ts
```
*Консоль підтвердить запуск:*
```text
Модульний моноліт запущено на http://localhost:3001
Swagger документація доступна за адресою http://localhost:3001/api-docs
```

---

## 3. Запуск локального сайту документації (MkDocs)

Для перегляду та локального тестування бази знань:
```bash
# Встановлення генератора та плагінів
pip install mkdocs-material mkdocs-mermaid2-plugin mkdocs-git-revision-date-localized-plugin

# Запуск локального вебсервера з hot-reload
mkdocs serve
```
Сайт документації буде доступний за адресою: `http://127.0.0.1:8000/`.

> Пов'язані документи: [[CONTRIBUTING]] | [[coding-standards]] | [[isd]]
