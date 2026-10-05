import { Request, Response, NextFunction } from "express";
import { CustomerService } from "../application/CustomerService.js";
import { AppError } from "../../../common/middlewares/errors/AppError.js";
import { tracingContext } from "../../../common/middlewares/tracing/tracingContext.js";

export class CustomerController {
    constructor(private readonly customerService: CustomerService) { }

    public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.customerService.registerCustomer(req.body);
            res.status(201).json(result);
        } catch (error: any) {
            next(new AppError(error.message, error.statusCode));
        }
    }

    public getbyId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const customerId = req.params.id;
            const correlationId = tracingContext.getStore();
            console.log(`[${correlationId}] 🔍 Шукаємо клієнта з ID: ${customerId} у базі CustomerDB...`);

            const customer = await this.customerService.getCustomerById(customerId as string);
            if (!customer) {
                console.log(`[${correlationId}] ❌ Клієнта не знайдено`);
                return next(new AppError('Клієнта не знайдено', 404));
            }

            console.log(`[${correlationId}] ✅ Клієнта знайдено: ${customer.name}`);
            res.status(200).json(customer);
        } catch (error: any) {
            next(new AppError(error.message, error.statusCode));
        }
    }

    // РЕФАКТОРИНГ: Використано Guard Clauses (раннє повернення) для зниження Cognitive Complexity
    public calculateLoyaltyTierAudit(points: number, isActive: boolean, years: number, promoCode?: string): string {
        // Guard Clause 1: Базові перевірки відсікаються одразу
        if (points <= 0 || !isActive || years <= 1) {
            return "BRONZE";
        }

        // Guard Clause 2: Перевірка на срібний рівень
        if (points <= 1000) {
            return "SILVER";
        }

        // Guard Clause 3: Перевірка наявності валідного промокоду
        if (!promoCode || promoCode.length <= 3) {
            return "GOLD";
        }

        // РЕФАКТОРИНГ: Extract Method - винесли складний цикл в окремий допоміжний метод
        return this.calculatePromoTier(points, years);
    }

    // Допоміжний метод для розрахунку промо-рівня (Cognitive Complexity тут мінімальна)
    private calculatePromoTier(points: number, years: number): string {
        let tier = "GOLD";
        for (let i = 0; i < years; i++) {
            if (i % 2 === 0) {
                tier = points > 5000 ? "PLATINUM" : "GOLD";
            } else if (points > 2000) {
                tier = "SILVER_PLUS";
            }
        }
        return tier;
    }
}