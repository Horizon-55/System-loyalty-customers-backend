# Журнал змін: CHANGELOG.md
## System-loyalty-customers-backend

Усі помітні зміни у цьому проєкті документуються у цьому файлі відповідно до принципів [Keep a Changelog](https://keepachangelog.com/uk/1.0.0/) та стандарту [Семантичного версіонування (SemVer)](https://semver.org/lang/uk/).

---

## [1.0.0] — 2026-11-16 (Лабораторні роботи №10–11: DaC Milestone)

### Додано (Added)
- **Контур Documentation as Code (DaC):**
  - Чотирирівнева піраміда документації (`README.md` $\to$ `docs/developer/` $\to$ `docs/api/` $\to$ `docs/architecture/`).
  - Генератор статичного сайту MkDocs Material з підтримкою C4 Mermaid-діаграм, пошуку та україномовної локалізації.
  - Машинно-читний контракт **OpenAPI 3.0.3** (`docs/api/openapi.yaml`) для 6 реальних ендпоінтів.
  - Автоматична генерація типізованого клієнтського SDK (`sdk-client/`).
  - Лінтер контрактів Spectral (`.spectral.yaml`) з нульовим порогом помилок (0 errors).
  - Автоматизований CI/CD конвеєр `.github/workflows/docs.yml` з обов'язковим прапорцем strict-збірки (`--strict`).
  - Політика рев'ю `.github/CODEOWNERS` та чеклист `docs-or-don't-merge` у `CONTRIBUTING.md`.
  - Скрипт безперервного аудиту актуальності `scripts/check-review-dates.js`.

### Змінено (Changed)
- Мігровано системний дизайн (SDD), специфікацію інфраструктури (ISD), регламент супроводу та Handover-пакет у каталог `docs/architecture/`.
- Переведено кущ архітектурних рішень у канонічну 4-значну нумерацію `ADR-0001` ... `ADR-0008` із YAML front matter.
- Оновлено `README.md` з доданням таблиці перевірок Definition of Done.

### Виправлено (Fixed)
- Ліквідовано антипатерни Documentation Decay та Dead Documentation (рівень застарілості знижено з 21.4% до 0%).
- Усунено контрактний дрейф між живою кодовою базою та API специфікацією.

---

## [0.9.0] — 2026-11-14 (Лабораторна робота №9: SQALE & Software Economics)
- Додано симулятор Software Economics NPV (`scripts/financial-simulator.js`).
- Оцифровано технічний борг через REST API SonarQube Cloud (`sqale_index`, `sqale_rating` Grade A).
- Згенеровано фінансовий грошовий реєстр `FINANCIAL_LEDGER.md` (Payback 1 місяць, NPV +$243.8k).

## [0.8.0] — 2026-11-09 (Лабораторна робота №8: OO Design & Decomposition)
- Декомпозовано God Object `CustomerService` на 3 незалежні сервіси (`CustomerCoreService`, `CustomerPrivacyService`, `CustomerConsentService`) з патерном Composite Facade ($CBO \le 8, LCOM4 = 1$).
- Замінено спадкування композицією у сервісах сповіщень (`Replace Inheritance with Composition`, $DIT: 3 \to 1$, $Overridden: 4 \to 0$).

## [0.7.0] — 2026-11-09 (Лабораторна робота №7: Chapin & Hotspots)
- Впроваджено аудит семантичної складності за Недом Чепіним ($Q \le 20$).
- Побудовано 4-квадрантну матрицю Code Churn $\times$ Cyclomatic Complexity Hotspots.
