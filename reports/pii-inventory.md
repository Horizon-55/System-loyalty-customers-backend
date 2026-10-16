# 📋 Реєстр персональних даних (PII Inventory Matrix)
**Система:** Loyalty & Customer Management Backend  
**Стандарт:** ISO/IEC 25010 / GDPR (Articles 5, 7, 15, 17)  
**Дата формування:** 2026-10-16  

---

## 1. Категорії персональних даних у системі

| Категорія даних | Поля / Атрибути | Джерело | Сховище (Entity/Table) | Наявність у логах | Обробка при Data Export (Art. 15) | Обробка при Erasure (Art. 17) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Прямі ідентифікатори** | `name` (ПІБ/Ім'я) | Реєстрація / Профіль | `Customers.name` | ❌ Заборонено (або масковано) | ✅ Включається (`profile.name`) | 🔄 **ANONYMIZE** (`"Anonymous User"`) |
| **Контактні дані** | `email`, `phone` | Реєстрація / Профіль | `Customers.email`, `Customers.phone` | ⚠️ Часткове маскування (`iv**@ex.com`, `+380******78`) | ✅ Включається (`profile.email`) | 🔄 **ANONYMIZE** (`"deleted_<uuid>@anon.local"`) |
| **Технічні ідентифікатори** | `id` (Customer UUID), `correlationId` | Система / HTTP Headers | `Customers.id`, HTTP Context | ✅ Дозволено (діагностика) | ✅ Включається (`subjectId`) | 🔒 **RETAIN** (збереження цілісності зв'язків) |
| **Транзакційні записи** | `tier`, `totalPoints`, `pointsHistory` | Бізнес-логіка / Point-Service | `Customers.totalPoints`, `PointsLedger` | ✅ Дозволено (кількість, статус) | ✅ Включається (`loyalty.totalPoints`) | 🔒 **RETAIN** (фінансова та бізнес-звітність) |
| **Дані про згоди (Consents)** | `purpose`, `isGranted`, `policyVersion`, `grantedAt`, `withdrawnAt`, `source` | Налаштування згод / API | `UserConsent` | ✅ Дозволено (тип, факт згоди) | ✅ Включається (`consents[]`) | ❌ **DELETE** (відкликання / видалення) |
| **Security / Секрети** | `password`, `passwordHash`, `token`, `apiKey`, `sessionSecret` | Auth / Headers / Gateway | Auth / Environment | 🚫 **ПОВНЕ РЕДАГУВАННЯ** (`[REDACTED]`) | 🚫 **СУВОРО ВИКЛЮЧЕНО** (захист від витоку) | ❌ **DELETE** |

---

## 2. Поля, які СУВОРО заборонені до повернення в Data Export
1. `password` / `passwordHash` — ризик перехоплення облікових даних.
2. `accessToken`, `refreshToken`, `sessionToken`, `resetToken` — запобігання несанкціонованому перехопленню сесії.
3. `apiKey`, `internalSecret` — секрети інфраструктури та сервісних шлюзів.
4. `internalAntifraudFlags`, `riskScore` — внутрішні алгоритми безпеки та протидії шахрайству.
5. Дані інших користувачів — захист від витоку чужої конфіденційної інформації (IDOR).

---

## 3. Контрольні синтетичні тестові дані
> **УВАГА:** За вимогами безпеки та для уникнення штрафу (-2 бали під час захисту), використовуються **виключно синтетичні дані**!

- **Test Subject A:**
  - ID: `cust-synt-001-uuid`
  - Name: `Олександр Тестовий`
  - Email: `alex.test@example.com`
  - Phone: `+380501234567`
  - Points: `1250` (VIP Tier)
  - Synthetic Password: `SyntheticP@ssw0rd2026!`
  - Synthetic Bearer Token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.syntheticDemoTokenForLab4`
- **Test Subject B (Attacker / Stranger):**
  - ID: `cust-synt-999-attacker`
  - Email: `intruder@example.com`
