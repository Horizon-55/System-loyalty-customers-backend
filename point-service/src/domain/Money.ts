/**
 * Value Object: Money
 * Encapsulates monetary amount and currency.
 * Guarantees immutability (Object.freeze) and self-contained domain invariants.
 */

export class Money {
    public readonly amount: number;
    public readonly currency: string;

    constructor(amount: number, currency: string = "UAH") {
        if (typeof amount !== "number" || isNaN(amount) || amount < 0) {
            throw new Error(`[Money ValueObject] Невалідна сума: ${amount}. Сума не може бути від'ємною.`);
        }
        if (currency !== "UAH" && currency !== "USD") {
            throw new Error(`[Money ValueObject] Непідтримувана валюта: ${currency}. Дозволені: UAH, USD.`);
        }

        this.amount = Math.round(amount * 100) / 100;
        this.currency = currency;

        // Принцип імутабельності (Immutable Data): повна заборона модифікації полів об'єкта
        Object.freeze(this);
    }

    public static of(amount: number, currency: string = "UAH"): Money {
        return new Money(amount, currency);
    }

    public static zero(currency: string = "UAH"): Money {
        return new Money(0, currency);
    }

    /**
     * Повертає новий Money зі знижкою без мутації поточного екземпляра
     */
    public applyDiscount(discountPercent: number): { discountMoney: Money; discountedNet: Money } {
        if (discountPercent < 0 || discountPercent > 100) {
            throw new Error(`[Money ValueObject] Невалідний відсоток знижки: ${discountPercent}%`);
        }
        const discountVal = Math.round((this.amount * discountPercent) / 100 * 100) / 100;
        const netVal = Math.round((this.amount - discountVal) * 100) / 100;

        return {
            discountMoney: new Money(discountVal, this.currency),
            discountedNet: new Money(netVal, this.currency)
        };
    }

    /**
     * Нарахування ПДВ/податку з поверненням нового незмінного об'єкта
     */
    public applyTax(taxRate: number): Money {
        if (taxRate < 0) {
            throw new Error(`[Money ValueObject] Невалідна ставка податку: ${taxRate}`);
        }
        const taxVal = Math.round(this.amount * taxRate * 100) / 100;
        return new Money(taxVal, this.currency);
    }

    /**
     * Додавання суми з іншим Money
     */
    public add(other: Money): Money {
        this.assertSameCurrency(other);
        return new Money(Math.round((this.amount + other.amount) * 100) / 100, this.currency);
    }

    /**
     * Віднімання суми
     */
    public subtract(other: Money): Money {
        this.assertSameCurrency(other);
        if (this.amount < other.amount) {
            throw new Error(`[Money ValueObject] Від'ємний залишок при відніманні: ${this.amount} - ${other.amount}`);
        }
        return new Money(Math.round((this.amount - other.amount) * 100) / 100, this.currency);
    }

    private assertSameCurrency(other: Money): void {
        if (this.currency !== other.currency) {
            throw new Error(`[Money ValueObject] Неможливо виконати операцію над різними валютами: ${this.currency} та ${other.currency}`);
        }
    }
}
