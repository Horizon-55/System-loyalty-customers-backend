# Звіт з інженерного аудиту: Стрес-тест на Закон Гудхарта та Проектування Balanced Quality Gate

**Проєкт:** `System-loyalty-customers-backend`  
**Дисципліна:** Інженерія якості та СПС (Лабораторна робота №5, Завдання 2)  
**Роль:** Lead Software Architect / Quality Tech Lead  
**Дата:** Жовтень 2026  

---

## 1. Аналітична дескрипція ризику: Пастка Закону Гудхарта

### 1.1. Формулювання закону Гудхарта
> **Закон Гудхарта (Goodhart's Law):**  
> *"Коли показник стає цільовою метою управління, він перестає бути гарним показником."*  
> *(When a measure becomes a target, it ceases to be a good measure).*

### 1.2. Вибір базової метрики для стрес-тесту
З розробленого дерева GQM обрано метрику з контуру процесу:
- **Метрика $M_3$:** `Line Coverage %` (Рівень покриття вихідного коду рядковими юніт-тестами).
- **Шкала вимірювання за Стівенсом:** Відносна шкала (Ratio Scale), діапазон $[0.0\%, 100.0\%]$.
- **Інструмент первинного вимірювання:** Jest Coverage Reporter / Istanbul (v8 engine).

### 1.3. Моделювання реалістичного краш-сценарію деградації (Gaming the Metric)
1. **Ініціація тиску (Management Trigger):**
   Керівництво компанії (Product Owner та Engineering Director) встановлює суворий норматив:  
   *«Для отримання дозволу на реліз у Production та виплати квартальних бонусів команді розробників, кожен мікросервіс зобов'язаний демонструвати Line Coverage $\ge 85\%$. Будь-який Pull Request із нижчим покриттям автоматично блокується CI/CD пайплайном»*.

2. **Адаптація та деструктивна поведінка команди (Gaming Strategy):**
   Розробники стикаються зі стислими термінами спринту. Повноцінне покриття складних алгоритмів модуля лояльності (`calculateCustomerTier`, обробка GDPR-запитів `ConsentPolicyGate`, санітизація PII у `PiiSanitizer`) вимагає підготовки моків, граничних тестів і глибокого розуміння бізнес-правил.
   
   Щоб «обійти» бар'єр і штучно натягнути метрику, інженери вдаються до практики **«Dummy Tests» (тести-пустушки без асертів)**:
   ```typescript
   // ❌ Приклад коду, що штучно завищує Line Coverage:
   describe('CustomersController Stress Gaming Tests', () => {
       it('should achieve 100% line coverage on tier calculation', async () => {
           const controller = new CustomersController(mockRepo, mockQueue);
           
           // Викликаємо методи із різними параметрами, щоб V8 зафіксував проходження рядків
           await controller.upgradeTier({ customerId: 'cust-1', spendAmount: 50000 });
           await controller.exportPersonalData('cust-1');
           await controller.anonymizeCustomer('cust-1');

           // КРИТИЧНА ПАСТКА: Тут немає жодного expect() або assert()!
           // Тест ЗАВЖДИ зелений, навіть якщо контролер повернув 500 Internal Error,
           // викинув необроблену помилку або пошкодив базу даних!
       });
   });
   ```

3. **Результат інженерного колапсу:**
   - **Метрика у CI/CD:** Jest звітує про **94.2% Line Coverage** (формальний статус: **PASS**).
   - **Фактична якість системи:** Реальна здатність тестового набору знаходити дефекти (Fault Detection Capability) дорівнює **0%**. Будь-яка фатальна помилка розрахунку знижок чи витік персональних даних безперешкодно потрапляє в Production.
   - **Висновок:** Показник *Line Coverage* повністю втратив зв'язок із якістю ПЗ і став токсичним драйвером хибного почуття безпеки.

---

## 2. Специфікація метрики-балансира (Compensating Metric)

Для нейтралізації пастки Гудхарта в архітектуру контролю якості впроваджено компенсаційний показник, який оцінює не факт проходження рядка, а **здатність тесту виявити зміну логіки**:

| Параметр | Опис специфікації |
| :--- | :--- |
| **Назва метрики** | **Mutation Testing Score (MS %)** — Показник мутаційного покриття |
| **Шкала за Стівенсом** | Відносна шкала (Ratio Scale), діапазон $[0.0\%, 100.0\%]$ |
| **Інструмент автоматизації** | **Stryker Mutator** (`@stryker-mutator/core`, `@stryker-mutator/jest-runner`) |
| **Допоміжний балансир** | **Assertion Density ($AD$)** — середня кількість тверджень `expect()` на 1 тест ($\ge 1.5$) |

### 2.1. Математична модель мутаційного аналізу
Stryker інжектує у вихідний код мікросервісу штучні дефекти (*мутанти*):
- Інверсія умовних операторів: `if (balance > threshold)` $\rightarrow$ `if (balance <= threshold)`
- Зміна арифметичних знаків: `points * multiplier` $\rightarrow$ `points / multiplier`
- Видалення викликів критичних методів: `await auditLog.record(...)` $\rightarrow$ видалено
- Підміна констант та булевих значень: `true` $\rightarrow$ `false`, `""` $\rightarrow$ `"stryker was here"`

Після інжекції кожного мутанта запускається тестовий набір.
- **Killed Mutant (Вбитий мутант):** Хоча б один тест впав із червоною помилкою $\rightarrow$ тести реально валідують поведінку.
- **Survived Mutant (Вижилий мутант):** Усі тести пройшли зеленими $\rightarrow$ тести не перевіряють результат (відсутні асерти або слабкі перевірки).
- **Timed Out / Error:** Мутант викликав нескінченний цикл або синтаксичний збій.

Формула розрахунку:
$$\text{Mutation Score} = \frac{\text{Killed Mutants}}{\text{Total Mutants} - \text{Compile Errors}} \times 100\%$$

### 2.2. Як балансир нівелює спроби маніпуляцій
Якщо розробник додає тести-пустушки без асертів:
- Рядки коду виконуються $\rightarrow$ `Line Coverage` піднімається до $94\%$.
- Stryker змінює оператор у цьому рядку, тест перезапускається, але оскільки асертів немає, він не падає $\rightarrow$ мутант **виживає**.
- Підсумковий показник `Mutation Score` обвалюється до **$18-20\%$**!
- Спроба обману конвеєра стає економічно безглуздою для розробника, оскільки єдиний спосіб підняти `Mutation Score` — написати реальні, якісні перевірки `expect(...)`.

---

## 3. Архітектурний щит комплаєнсу (Balanced Quality Gate)

### 3.1. Логічна формула комбінованого правила
Об'єднуємо продуктові, процесні та безпекові метрики у суворе правило валідації через логічну кон'юнкцію `AND`:

$$\mathbf{QualityGate} = (M_3 \ge 80.0\%) \land (\mathbf{Balancer_{MS}} \ge 65.0\%) \land (M_1 \le 15) \land (M_2 = 0)$$

Де:
1. $M_3$ = `Line Coverage %`
2. $\mathbf{Balancer_{MS}}$ = `Mutation Testing Score %`
3. $M_1$ = `Cognitive Complexity` (Когнітивна складність найскладнішого методу)
4. $M_2$ = `Critical CVE Count` (Кількість критичних вразливостей сторонніх залежностей)

### 3.2. Інженерне обґрунтування граничних значень (Thresholds)
- **$\text{Line Coverage} \ge 80.0\%$:**  
  *Обґрунтування:* 80% — загальновизнаний інженерний стандарт (Martin Fowler, Google Testing Blog). Забезпечує охоплення основних сценаріїв виконання коду.
- **$\text{Mutation Score} \ge 65.0\%$:**  
  *Обґрунтування:* Досягнення 100% мутаційного покриття у реальних enterprise-проєктах є економічно невиправданим через еквівалентні мутанти (equivalent mutants). Поживний інженерний поріг у 65-70% гарантує, що не менше ніж 2 із кожних 3 інжектованих багів гарантовано відловлюються тестами.
- **$\text{Cognitive Complexity} \le 15$:**  
  *Обґрунтування:* Стандарт SonarSource. Функції зі складністю понад 15 містять забагато вкладених розгалужень (`if`, `switch`, `catch`, вкладені колбеки), що унеможливлює підтримку коду та провокує нові дефекти.
- **$\text{Critical CVE} = 0$:**  
  *Обґрунтування:* Нульова толерантність до вразливостей рівня CVSS 9.0-10.0 (наприклад, дистанційне виконання коду RCE або витік бази даних).

---

## 4. Результати інженерної валідації (Консольний тест-ран)

Для автоматичної валідації в CI/CD розроблено модуль [`scripts/verify-quality-gate.js`](file:///k:/Project%20Api/New%20Projects/System-loyalty-customers-backend/scripts/verify-quality-gate.js).

### Протокол виконання:
```text
================================================================
   ENTERPRISE BALANCED QUALITY GATE & GOODHART STRESS TEST     
================================================================

[TEST RUN 1] Scenario A: Developer Gaming Metric (Dummy Tests without Asserts)
Telemetry Metrics: {
  "lineCoverage": 94.2,
  "mutationScore": 19.4,
  "cognitiveComplexity": 9,
  "criticalCVE": 0
}
Check Details:
  - lineCoverage          : Actual=94.2   | Target=>= 80%     | ✓ PASS
  - mutationScore         : Actual=19.4   | Target=>= 65%     | ✗ FAIL
  - cognitiveComplexity   : Actual=9      | Target=<= 15      | ✓ PASS
  - criticalCVE           : Actual=0      | Target==== 0      | ✓ PASS
Decision: STATUS: [FAIL]
🚨 ANOMALY: Goodhart's Law abuse detected! High line coverage with dead mutation assertions.
Summary : FAILED: GOODHART'S LAW ALERT: High coverage detected with deficient assertion mutation score!
----------------------------------------------------------------

[TEST RUN 2] Scenario B: Production-Grade Balanced Implementation
Telemetry Metrics: {
  "lineCoverage": 84.8,
  "mutationScore": 72.5,
  "cognitiveComplexity": 8,
  "criticalCVE": 0
}
Check Details:
  - lineCoverage          : Actual=84.8   | Target=>= 80%     | ✓ PASS
  - mutationScore         : Actual=72.5   | Target=>= 65%     | ✓ PASS
  - cognitiveComplexity   : Actual=8      | Target=<= 15      | ✓ PASS
  - criticalCVE           : Actual=0      | Target==== 0      | ✓ PASS
Decision: STATUS: [PASS]
Summary : PASSED: Balanced Quality Gate satisfied across all contours.
----------------------------------------------------------------
```

### Висновок за Завданням 2:
Впровадження мутаційного аналізатора як метрики-балансира повністю блокує пастку Закону Гудхарта:
1. Маніпуляція Line Coverage миттєво діагностується розривом між покриттям (94.2%) та мутаційним балом (19.4%).
2. Quality Gate переводить статус збірки у `FAIL` і блокує дефектний реліз.
3. Команда змушена підтримувати інженерну культуру створення якісних перевірок замість формальної погоні за відсотками.
