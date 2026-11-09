import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PointService } from '../src/application/PointService.js';

// ============================================================================
// ЛАБОРАТОРНА РОБОТА №7 - Завдання 2: Симуляція збою через неконтрольовану мутацію даних
// Мета: Довести вразливість мутабельного коду (тип M за Чепіним) до випадкового спотворення бізнес-результату.
// ============================================================================

describe('Chapin Semantic Audit - Task 2: Data Mutation Vulnerability', () => {
    const fakeClient: any = { checkCustomerExists: async () => true };
    const pointService = new PointService(fakeClient);

    it('🚨 КРАШ-ТЕСТ: Випадкова мутація проміжної змінної спричиняє касовий розрив (FAIL-стан)', () => {
        // Вхідні фінансові параметри замовлення
        const rawOrderAmount = 1000;      // 1000 UAH базова ціна
        const currency = 'UAH';
        const discountPercentage = 10;    // 10% знижка (-100 UAH) -> база 900 UAH
        const taxRate = 0.20;             // 20% ПДВ (+180 UAH) -> до оплати 1080 UAH
        const bonusMultiplier = 2;        // 2 бали за кожну гривню -> 2160 балів
        const channel = 'WEB_PORTAL';

        const result = pointService.settleOrderLoyaltyTransaction(
            'cust-fail-001',
            'order-fail-999',
            rawOrderAmount,
            currency,
            discountPercentage,
            taxRate,
            bonusMultiplier,
            channel,
            'corr-mutation-test'
        );

        console.log('\n--- Отримані спотворені результати розрахунку (FAIL) ---');
        console.log(`Очікувана сума до сплати: 1080 UAH | Фактична: ${result.finalPayable} UAH`);
        console.log(`Очікувані бонуси клієнта : 2160 pts | Фактичні: ${result.rewardPoints} pts`);
        console.log(`Знижка клієнта           : ${result.discountAmount} UAH`);

        // Перевірка фінансової коректності:
        // Очікуваний розрахунок: (1000 - 100) + 180 = 1080 UAH
        // Але через мутацію rawAmount = discountAmount у коді, результат дорівнює 0 UAH!
        assert.strictEqual(
            result.finalPayable,
            1080,
            `ФІНАНСОВА КАТАСТРОФА: Касовий розрив! Очікувалося 1080 UAH, але через мутацію отримано ${result.finalPayable} UAH`
        );
    });
});
