import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PointService } from '../src/application/PointService.js';
import { Money } from '../src/domain/Money.js';
import { TransactionContext } from '../src/domain/TransactionContext.js';
import { LoyaltyRewardPolicy } from '../src/domain/LoyaltyRewardPolicy.js';

// ============================================================================
// ЛАБОРАТОРНА РОБОТА №7 - Завдання 2: PASS-стан після рефакторингу
// Мета: Довести надійність імутабельних Value Objects та ліквідацію касового розриву
// ============================================================================

describe('Chapin Semantic Audit - Task 2: Immutable Value Objects (PASS)', () => {
    const fakeClient: any = { checkCustomerExists: async () => true };
    const pointService = new PointService(fakeClient);

    it('✅ PASS-ТЕСТ 1: Розрахунок через Value Objects усуває касовий розрив і повертає точні 1080 UAH', () => {
        const orderAmount = Money.of(1000, 'UAH');
        const context = new TransactionContext('cust-pass-001', 'order-pass-999', 'WEB_PORTAL', 'corr-pass-1');
        const policy = new LoyaltyRewardPolicy(10, 0.20, 2);

        const result = pointService.settleOrderLoyaltyTransaction(orderAmount, context, policy);

        console.log('\n--- Отримані верифіковані результати розрахунку (PASS) ---');
        console.log(`Початкова ціна          : ${result.originalTotal.amount} ${result.originalTotal.currency}`);
        console.log(`Знижка клієнта          : ${result.discountAmount.amount} ${result.discountAmount.currency}`);
        console.log(`База оподаткування (нетто): ${result.taxableAmount.amount} ${result.taxableAmount.currency}`);
        console.log(`ПДВ (20%)               : ${result.taxAmount.amount} ${result.taxAmount.currency}`);
        console.log(`Сума до сплати          : ${result.finalPayable.amount} ${result.finalPayable.currency}`);
        console.log(`Нараховані бонуси       : ${result.rewardPoints} pts`);
        console.log(`Аудиторський статус     : ${result.status}`);

        // Верифікація бізнес-інваріантів:
        assert.strictEqual(result.originalTotal.amount, 1000, 'Початкова сума має лишатися 1000 UAH');
        assert.strictEqual(result.discountAmount.amount, 100, 'Знижка має складати 100 UAH');
        assert.strictEqual(result.taxableAmount.amount, 900, 'База оподаткування має бути 900 UAH');
        assert.strictEqual(result.taxAmount.amount, 180, 'ПДВ має бути 180 UAH');
        assert.strictEqual(result.finalPayable.amount, 1080, 'Фінальна сума до сплати має бути точно 1080 UAH');
        assert.strictEqual(result.rewardPoints, 2160, 'Кількість бонусів має складати 2160 pts');
        assert.strictEqual(result.status, 'SETTLED_IN_STORE');
    });

    it('✅ PASS-ТЕСТ 2: Апаратний захист від мутацій через Object.freeze', () => {
        const money = Money.of(500, 'UAH');
        assert.strictEqual(Object.isFrozen(money), true, 'Money має бути замороженим (immutable)');

        assert.throws(() => {
            // Спроба несанкціонованої модифікації поля призводить до помилки
            (money as any).amount = 9999;
        }, /^TypeError: Cannot assign to read only property 'amount'/);

        const context = new TransactionContext('c1', 'o1', 'MOBILE_APP');
        assert.strictEqual(Object.isFrozen(context), true, 'TransactionContext має бути замороженим');
        assert.strictEqual(context.auditTag, 'DIGITAL');

        assert.throws(() => {
            (context as any).channel = 'HACKED';
        }, /^TypeError: Cannot assign to read only property 'channel'/);
    });

    it('✅ PASS-ТЕСТ 3: Зворотна сумісність через адаптер працює коректно без помилки мутації', () => {
        const legacyResult = pointService.settleOrderLoyaltyTransactionLegacy(
            'cust-legacy-001',
            'order-legacy-123',
            1000,
            'UAH',
            10,
            0.20,
            2,
            'MOBILE_APP',
            'corr-legacy'
        );

        assert.strictEqual(legacyResult.finalPayable, 1080);
        assert.strictEqual(legacyResult.rewardPoints, 2160);
        assert.strictEqual(legacyResult.status, 'SETTLED_DIGITAL');
    });
});
