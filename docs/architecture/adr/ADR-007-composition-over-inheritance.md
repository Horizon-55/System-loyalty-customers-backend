# ADR-007: Replace Inheritance with Composition (DIT=1 target)

**Статус:** Accepted  
**Дата:** 2026-11-09  
**Власник:** Solution Architect  
**Контекст лабораторної:** Лабораторна №8 (OO Design Audit — Task 3)  

---

## Контекст

Аудит DIT-метрики виявив антипатерн **Inheritance Hell** у сервісах сповіщень:

```
BaseNotificationService             (DIT=1)
  └── CustomerChannelNotificationService  (DIT=2)
        └── PremiumLoyaltyEmailNotificationService (DIT=3, Overridden=4)
```

**Порушення LSP (Liskov Substitution Principle):** нащадок перевизначав 4 з 7 методів предка (> 50%), що свідчить про несумісність контрактів.

**Fragile Base Class:** будь-яка зміна в `BaseNotificationService` ламала `PremiumLoyaltyEmailNotificationService` через каскад викликів.

Краш-тест `inheritanceFragilityCrash.test.ts` підтвердив FAIL.

## Рішення

Застосовано GoF-патерн **"Replace Inheritance with Composition"**:

```
// ДО (Inheritance Hell, DIT=3, Overridden=4):
class PremiumLoyaltyEmailNotificationService 
  extends CustomerChannelNotificationService { ... }

// ПІСЛЯ (Composition, DIT=1, Overridden=0):
class PremiumLoyaltyEmailNotificationService {
  constructor(
    private readonly baseEngine: INotificationDeliveryEngine,
    private readonly channelEngine: INotificationDeliveryEngine
  ) {}
}
```

**Git commits:** `f9190a2` (FAIL) → `1a97519` (PASS)

## Наслідки

✅ Позитивні:
- DIT: 3 → 1 (-66.7%)
- Overridden methods: 4 → 0 (-100%)
- Повна ізоляція: зміна BaseNotificationService не впливає на Premium сервіс
- Mock-ізованість: залежності легко замінюються у тестах

⚠️ Негативні:
- Вимагає явного делегування кожного методу (verbose-код)
- Більше класів у системі (але менша зв'язність)
