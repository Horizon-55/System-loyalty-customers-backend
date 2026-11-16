---
owner: Solution Architect Horizon-55
status: published
review_date: 2027-02-16
tags:
  - documentation
  - overview
  - single-source-of-truth
---

# Корпоративна база знань: System-loyalty-customers-backend

> **Концепція:** Documentation as Code (DaC)  
> **Принцип:** Single Source of Truth (SSOT) — документація зберігається разом із вихідним кодом, версіонується через Git і верифікується у CI/CD.  
> **Теги:** #architecture #developer #api #ops  

Ласкаво просимо до офіційної інженерної бази знань проєкту `System-loyalty-customers-backend` — мікросервісного бекенду програми лояльності клієнтів із підтримкою вимог GDPR/CCPA.

---

## 🏛️ Чотирирівнева піраміда документації

База знань структурована за **чотирирівневою пірамідою знань (Architecture Documentation Pyramid)**, де кожен рівень адресовано відповідній цільовій аудиторії:

```mermaid
graph TD
    L1["<b>Рівень 1: README.md</b><br/><i>«Що це і як запустити за 5 хвилин?»</i><br/>Цільова аудиторія: Всі стейкхолдери, новачки"]
    L2["<b>Рівень 2: Developer Docs (docs/developer/)</b><br/><i>«Як долучитися до розробки?»</i><br/>Цільова аудиторія: Інженери-розробники"]
    L3["<b>Рівень 3: API Docs (docs/api/)</b><br/><i>«Як інтегруватися з сервісом?»</i><br/>Цільова аудиторія: Клієнти API, QA, Frontend"]
    L4["<b>Рівень 4: Architecture Docs (docs/architecture/)</b><br/><i>«Чому система влаштована саме так?»</i><br/>Цільова аудиторія: Архітектори, Tech Leads, DevOps"]

    L1 --> L2
    L2 --> L3
    L3 --> L4
```

---

## 🧭 Навігація по розділах

| Рівень | Розділ | Посилання | Опис |
| :---: | :--- | :--- | :--- |
| **1** | **Головна (Швидкий старт)** | [Огляд системи (README)](index.md) | Призначення системи, стек технологій, швидкий запуск за 5 кроків. |
| **2** | **Для розробників** | [Керівництво контриб'ютора](developer/CONTRIBUTING.md)<br/>[Локальне середовище](developer/environment.md)<br/>[Стандарти коду](developer/coding-standards.md) | Регламент розробки, `docs-or-don't-merge`, вимоги до середовища (Node.js 20+, Docker). |
| **3** | **API та Контракти** | [Специфікація API](api/index.md) | Машинно-читний контракт OpenAPI 3.x, інтерактивний Swagger UI, клієнтські SDK. |
| **4** | **Архітектурний паспорт** | [Системний дизайн (SDD)](architecture/sdd.md)<br/>[Інфраструктура (ISD)](architecture/isd.md)<br/>[Кущ рішень (ADR)](architecture/adr/ADR-0001-nodejs-typescript.md)<br/>[Регламент супроводу](architecture/maintenance.md)<br/>[Handover-пакет](architecture/handover.md) | C4-модель (L1–L3), ER-діаграма, мережева топологія, RTO/RPO, незмінні записи рішень. |

---

## ⚡ Інженерне правило: «Не збирається — не їде»

Вся документація підпорядковується суворому правилу валідації:
- Будь-яке бите посилання, пропущена сторінка в навігації або синтаксична помилка переривають збірку `mkdocs build --strict` із кодом завершення **Exit Code 1**.
- Злиття Pull Request блокується на рівні GitHub Actions, допоки документація не пройде 100% перевірок якості.

> Пов'язані артефакти: [[sdd]] | [[isd]] | [[maintenance]] | [[handover]]
