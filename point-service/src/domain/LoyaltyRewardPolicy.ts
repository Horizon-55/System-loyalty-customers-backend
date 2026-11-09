import { Money } from './Money.js';
import { TransactionContext } from './TransactionContext.js';

/**
 * Value Object: SettlementResult
 * Immutable aggregate result of financial and loyalty point calculation.
 */
export class SettlementResult {
    public readonly context: TransactionContext;
    public readonly originalTotal: Money;
    public readonly discountAmount: Money;
    public readonly taxableAmount: Money;
    public readonly taxAmount: Money;
    public readonly finalPayable: Money;
    public readonly rewardPoints: number;
    public readonly status: string;

    constructor(params: {
        context: TransactionContext;
        originalTotal: Money;
        discountAmount: Money;
        taxableAmount: Money;
        taxAmount: Money;
        finalPayable: Money;
        rewardPoints: number;
        status: string;
    }) {
        this.context = params.context;
        this.originalTotal = params.originalTotal;
        this.discountAmount = params.discountAmount;
        this.taxableAmount = params.taxableAmount;
        this.taxAmount = params.taxAmount;
        this.finalPayable = params.finalPayable;
        this.rewardPoints = params.rewardPoints;
        this.status = params.status;

        Object.freeze(this);
    }
}

/**
 * Domain Service / Value Object: LoyaltyRewardPolicy
 * Encapsulates calculation rules and tax/discount invariants.
 * Eliminates primitive obsession and prevents mutation side-effects.
 */
export class LoyaltyRewardPolicy {
    public readonly discountPercentage: number;
    public readonly taxRate: number;
    public readonly bonusMultiplier: number;

    constructor(discountPercentage: number = 0, taxRate: number = 0.20, bonusMultiplier: number = 1) {
        if (typeof discountPercentage !== 'number' || discountPercentage < 0 || discountPercentage > 100) {
            throw new Error(`[LoyaltyRewardPolicy] Відсоток знижки має бути в межах від 0 до 100: ${discountPercentage}`);
        }
        if (typeof taxRate !== 'number' || taxRate < 0) {
            throw new Error(`[LoyaltyRewardPolicy] Ставка податку не може бути від'ємною: ${taxRate}`);
        }
        if (typeof bonusMultiplier !== 'number' || bonusMultiplier < 0) {
            throw new Error(`[LoyaltyRewardPolicy] Бонусний коефіцієнт не може бути від'ємним: ${bonusMultiplier}`);
        }

        this.discountPercentage = discountPercentage;
        this.taxRate = taxRate;
        this.bonusMultiplier = bonusMultiplier;

        Object.freeze(this);
    }

    /**
     * Чиста функція розрахунку сеттлменту: жодна змінна не мутується, створюються нові Value Objects
     */
    public calculateSettlement(orderTotal: Money, context: TransactionContext): SettlementResult {
        // 1. Обчислення знижки через метод Value Object Money (без перезапису orderTotal!)
        const { discountMoney, discountedNet } = orderTotal.applyDiscount(this.discountPercentage);

        // 2. Обчислення податку на нетто-суму
        const taxMoney = discountedNet.applyTax(this.taxRate);

        // 3. Підсумкова сума до оплати
        const finalPayableMoney = discountedNet.add(taxMoney);

        // 4. Нарахування бонусних балів
        const rewardPoints = Math.floor(finalPayableMoney.amount * this.bonusMultiplier);

        // 5. Повернення незмінного результату
        return new SettlementResult({
            context,
            originalTotal: orderTotal,
            discountAmount: discountMoney,
            taxableAmount: discountedNet,
            taxAmount: taxMoney,
            finalPayable: finalPayableMoney,
            rewardPoints,
            status: `SETTLED_${context.auditTag}`
        });
    }
}
