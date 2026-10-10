import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CustomerController } from '../../customer-service/src/modules/customers/Api/CustomersController.js';

// ============================================================================
// ЛАБОРАТОРНА РОБОТА №3 - Завдання 1: Захисні регресійні тести бізнес-поведінки
// Мета: довести, що структурний рефакторинг (Guard Clauses + Extract Method)
// зберіг 100% функціональної еквівалентності для всіх класів еквівалентності та граничних значень.
// ============================================================================

describe('Maintainability Refactoring: calculateLoyaltyTierAudit Regression Suite', () => {
  // Контролер для тестування чистих розрахункових методів
  const controller = new CustomerController(null as any);

  // --------------------------------------------------------------------------
  // Група 1: Граничні значення та Guard Clauses (Категорія BRONZE)
  // --------------------------------------------------------------------------
  it('1. Повертає BRONZE, якщо бали <= 0 (граничне значення 0)', () => {
    assert.equal(controller.calculateLoyaltyTierAudit(0, true, 5, 'VIP_PROMO'), 'BRONZE');
    assert.equal(controller.calculateLoyaltyTierAudit(-50, true, 5, 'VIP_PROMO'), 'BRONZE');
  });

  it('2. Повертає BRONZE, якщо клієнт неактивний (isActive = false)', () => {
    assert.equal(controller.calculateLoyaltyTierAudit(5000, false, 5, 'VIP_PROMO'), 'BRONZE');
  });

  it('3. Повертає BRONZE, якщо стаж <= 1 року (граничне значення 1)', () => {
    assert.equal(controller.calculateLoyaltyTierAudit(5000, true, 1, 'VIP_PROMO'), 'BRONZE');
    assert.equal(controller.calculateLoyaltyTierAudit(5000, true, 0, 'VIP_PROMO'), 'BRONZE');
  });

  // --------------------------------------------------------------------------
  // Група 2: Граничні значення для SILVER
  // --------------------------------------------------------------------------
  it('4. Повертає SILVER, якщо бали <= 1000 (граничні значення 100 та 1000)', () => {
    assert.equal(controller.calculateLoyaltyTierAudit(500, true, 3, 'VIP_PROMO'), 'SILVER');
    assert.equal(controller.calculateLoyaltyTierAudit(1000, true, 3, 'VIP_PROMO'), 'SILVER');
  });

  // --------------------------------------------------------------------------
  // Група 3: Відсутність або невалідний промокод (Категорія GOLD)
  // --------------------------------------------------------------------------
  it('5. Повертає базовий GOLD, якщо промокод відсутній або довжина <= 3', () => {
    // Без промокоду
    assert.equal(controller.calculateLoyaltyTierAudit(3000, true, 3), 'GOLD');
    assert.equal(controller.calculateLoyaltyTierAudit(3000, true, 3, undefined), 'GOLD');
    // Промокод довжиною <= 3 символи (граничні значення 0, 3)
    assert.equal(controller.calculateLoyaltyTierAudit(3000, true, 3, ''), 'GOLD');
    assert.equal(controller.calculateLoyaltyTierAudit(3000, true, 3, 'ABC'), 'GOLD');
  });

  // --------------------------------------------------------------------------
  // Група 4: Складний розрахунок за промокодом (PLATINUM та SILVER_PLUS)
  // --------------------------------------------------------------------------
  it('6. Повертає PLATINUM для валідного промокоду, парного року та балів > 5000', () => {
    // years = 3 -> остання ітерація i = 2 (парне) -> points > 5000 -> PLATINUM
    assert.equal(controller.calculateLoyaltyTierAudit(6000, true, 3, 'SUPER_CODE'), 'PLATINUM');
  });

  it('7. Повертає GOLD для валідного промокоду, парного року та балів між 1001 та 5000', () => {
    // years = 3 -> i = 2 (парне) -> points <= 5000 -> GOLD
    assert.equal(controller.calculateLoyaltyTierAudit(4000, true, 3, 'SUPER_CODE'), 'GOLD');
  });

  it('8. Повертає SILVER_PLUS для валідного промокоду, непарного року та балів > 2000', () => {
    // years = 2 -> остання ітерація i = 1 (непарне) -> points > 2000 -> SILVER_PLUS
    assert.equal(controller.calculateLoyaltyTierAudit(3000, true, 2, 'SUPER_CODE'), 'SILVER_PLUS');
  });
});
