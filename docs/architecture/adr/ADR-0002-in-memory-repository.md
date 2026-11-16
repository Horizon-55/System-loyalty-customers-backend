---
owner: Solution Architect
status: accepted
review_date: 2027-05-16
tags:
  - architecture
  - adr
  - adr-002
---

# ADR-0002: In-Memory Repository для тестового середовища

**Статус:** Accepted  
**Дата:** 2026-09-15  
**Власник:** Solution Architect  
**Контекст лабораторної:** Лабораторна №5 (GQM) — базова архітектура  

---

## Контекст

Для учбового проєкту необхідне сховище даних, яке: не вимагає зовнішніх залежностей (Docker, Atlas), ізоляційне для тестів, легко замінюється через патерн Repository.

## Розглянуті альтернативи

| Альтернатива | Переваги | Недоліки |
|---|---|---|
| **InMemoryCustomerRepository** | Нульові залежності, миттєвий старт, ізоляція | Дані не зберігаються між рестартами |
| PostgreSQL + TypeORM | Production-ready | Вимагає Docker / Cloud, складне налаштування |
| MongoDB Atlas | Cloud-native | Платна, мережева залежність |
| SQLite | Локальна файлова БД | SQL overhead не потрібен для DDD |

## Рішення

Обрано **InMemoryCustomerRepository** (`Map<string, Customers>`) разом з **MongoMemoryServer** (in-process MongoDB для інтеграційних тестів). Порт `ICustomerRepository` забезпечує легке заміщення на реальну БД.

## Наслідки

✅ Позитивні:
- Zero external dependencies — CI/CD без Docker
- Ізольовані детерміністичні тести
- DIP: `ICustomerRepository` дозволяє заміну без зміни Application Layer

⚠️ Негативні:
- RPO = 0 тільки для тестів; Production вимагає заміни на persistent storage
- Не підходить для load testing або multi-instance deployments

---

> Пов'язані артефакти (Obsidian Graph): [[sdd]] | [[isd]] | [[maintenance]]
