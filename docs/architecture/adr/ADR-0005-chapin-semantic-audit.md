---
owner: QA Lead
status: accepted
review_date: 2027-05-16
tags:
  - architecture
  - adr
  - adr-005
---

# ADR-0005: Chapin Semantic Data Complexity Audit + Hotspots Matrix

**Статус:** Accepted  
**Дата:** 2026-11-09  
**Власник:** QA Engineer  
**Контекст лабораторної:** Лабораторна №7 (Chapin & Code Churn Hotspots)  

---

## Контекст

Метрики Мак-Кейба та Холстеда вимірюють алгоритмічну складність функцій, але не семантичну складність роботи з даними. Виявлено необхідність Chapin Q-метрики та аналізу Code Churn для локалізації "гарячих точок" ризику.

## Рішення

Впроваджено **дворівневий аудит**:

### 1. Chapin Q-метрика (Ned Chapin, 1979)
Категоризація змінних: P (вхід/Input), M (модифіковані), C (управляючі/Control), T (тимчасові).

**Формула:** `Q = P + 2M + 3C + 0.5T`

Поріг: **Q ≤ 20** (модуль `PiiSanitizer.ts` — рефакторинг з ValueObjects)

### 2. Code Churn × Complexity Hotspots Matrix
Квадрантна матриця: X = Code Churn (кількість змін), Y = CC (складність):

| Квадрант | Характеристика | Дія |
|---|---|---|
| Q1: High CC + High Churn | 🔴 Critical Hotspot | Негайний рефакторинг |
| Q2: Low CC + High Churn | 🟡 Monitored | Перевірити стабільність |
| Q3: High CC + Low Churn | 🟠 Latent Risk | Запланувати рефакторинг |
| Q4: Low CC + Low Churn | 🟢 Safe Zone | Без дій |

## Наслідки

✅ Позитивні:
- Виявлено `PiiSanitizer.ts` як Critical Hotspot — проведено успішний рефакторинг (PASS)
- Автоматизовано через `scripts/chapin-analyzer.js` та `scripts/hotspots-analyzer.js`

⚠️ Негативні:
- Code Churn вимагає повну git-історію (`fetch-depth: 0` у CI)
- Chapin Q суб'єктивна: категоризація змінних залежить від аналітика

---

> Пов'язані артефакти (Obsidian Graph): [[sdd]] | [[isd]] | [[maintenance]]
