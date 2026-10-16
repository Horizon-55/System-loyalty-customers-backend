# 🗑️ Політика анонімізації та видалення даних (GDPR Article 17: Right to Erasure)
**Система:** Loyalty & Customer Management Backend  
**Стандарт:** ISO/IEC 25010 / GDPR Article 17  
**Дата формування:** 2026-10-16  

---

## 1. Матриця обробки сутностей (Entity Handling Matrix)

| Сутність / Колекція | Стратегія | Що відбувається з полями | Технічне обґрунтування (Retention Rule) |
| :--- | :--- | :--- | :--- |
| **Customer Profile** | **`ANONYMIZE`** | `name = "Anonymous User"`, `email = "deleted_<uuid>@anon.local"`, `phone = undefined` | Незворотне знеособлення для унеможливлення повторної ідентифікації. Унікальний суфікс email запобігає порушенню unique-індексів у БД. |
| **Loyalty Points Ledger** | **`RETAIN`** | `totalPoints`, `tier`, історія транзакцій зберігаються | Збереження референційної цілісності фінансового балансу системи (Statutory financial audit requirement). Записи залишаються прив'язаними до анонімного суб'єкта без broken foreign keys. |
| **User Settings** | **`RESET`** | Скидання на дефолтні значення, `notificationsEnabled = false` | Примусове відключення будь-яких сповіщень та скидання налаштувань. |
| **User Consents** | **`PURGE` (DELETE)** | Усі згоди користувача повністю вилучаються (`consents.clear()`) | Згідно з Art. 17 право на забуття передбачає повне припинення всіх згод на обробку. |
| **Security Audit Logs** | **`AUDIT_SAFE`** | Фіксується факт операції (`ANONYMIZE_SUBJECT_COMPLETED`), `subjectId`, статус, час | Жодні видалені персональні дані (старе ім'я/email) не копіюються в лог, щоб audit trail не став сховищем витоку. |

---

## 2. Стан суб'єкта в базі даних «До» та «Після»

### 🔹 СТАН «ДО» (До виклику workflow):
```json
{
  "id": "cust-synt-002-uuid",
  "name": "Іван Петренко",
  "email": "ivan.petrenko@example.com",
  "phone": "+380671112233",
  "tier": "VIP",
  "totalPoints": 2500,
  "settings": {
    "preferredLanguage": "uk-UA",
    "notificationsEnabled": true,
    "theme": "light"
  },
  "consents": [
    { "purpose": "MARKETING_EMAIL", "isGranted": true },
    { "purpose": "OPTIONAL_ANALYTICS", "isGranted": true }
  ],
  "pointsHistory": [
    { "transactionId": "tx-1", "points": 1000, "reason": "Покупка електроніки" },
    { "transactionId": "tx-2", "points": 1500, "reason": "Річний бонус активності" }
  ]
}
```

### 🔹 СТАН «ПІСЛЯ» (Після виконання POST /api/v1/customers/:id/anonymize):
```json
{
  "id": "cust-synt-002-uuid",
  "name": "Anonymous User",
  "email": "deleted_cust-synt-002-uuid@anon.local",
  "phone": null,
  "tier": "VIP",
  "totalPoints": 2500,
  "settings": {
    "preferredLanguage": "uk-UA",
    "notificationsEnabled": false,
    "theme": "system"
  },
  "consents": [],
  "pointsHistory": [
    { "transactionId": "tx-1", "points": 1000, "reason": "Покупка електроніки" },
    { "transactionId": "tx-2", "points": 1500, "reason": "Річний бонус активності" }
  ]
}
```

---

## 3. Ключові властивості реалізованого механізму:
1. **Незворотність (Irreversibility):** відсутня будь-яка таблиця відповідностей для розкриття особи (це повна анонімізація, а не псевдонімізація).
2. **Ідемпотентність (Idempotency):** повторний виклик повертає `status: "ALREADY_ANONYMIZED"` без помилки чи дублювання.
3. **Авторизація та захист:** сторонній користувач отримує `403 Forbidden` зі збереженням недоторканності профілю.
