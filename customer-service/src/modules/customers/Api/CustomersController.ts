import { Request, Response, NextFunction } from "express";
import { CustomerService } from "../application/CustomerService.js";
import { AppError } from "../../../common/middlewares/errors/AppError.js";
import { tracingContext } from "../../../common/middlewares/tracing/tracingContext.js";
import { SecureLogger } from "../../../common/logging/SecureLogger.js";

export class CustomerController {
    constructor(private readonly customerService: CustomerService) { }

    public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const correlationId = tracingContext.getStore();
            const result = await this.customerService.registerCustomer(req.body);
            SecureLogger.info("Клієнта успішно зареєстровано", { customerId: result.id, email: result.email }, correlationId);
            res.status(201).json(result);
        } catch (error: any) {
            next(new AppError(error.message, error.statusCode));
        }
    }

    public getbyId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const customerId = req.params.id;
            const correlationId = tracingContext.getStore();
            SecureLogger.info(`🔍 Шукаємо клієнта з ID: ${customerId} у базі CustomerDB...`, undefined, correlationId);

            const customer = await this.customerService.getCustomerById(customerId as string);
            if (!customer) {
                SecureLogger.warn(`❌ Клієнта не знайдено`, { customerId }, correlationId);
                return next(new AppError('Клієнта не знайдено', 404));
            }

            SecureLogger.info(`✅ Клієнта знайдено: ${customer.name}`, { customerId: customer.id, email: customer.email }, correlationId);
            res.status(200).json(customer);
        } catch (error: any) {
            next(new AppError(error.message, error.statusCode));
        }
    }

    /**
     * GDPR Article 15: Right of Access & Personal Data Export
     * GET /api/v1/customers/:id/personal-data
     */
    public exportPersonalData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const subjectId = req.params.id;
            const authenticatedUserId = (req.headers['x-user-id'] as string) || (req.query.authenticatedUserId as string);
            const correlationId = tracingContext.getStore() || (req.headers['x-correlation-id'] as string);

            if (!authenticatedUserId) {
                return next(new AppError("Потрібна автентифікація: відсутній заголовок x-user-id", 401));
            }

            const exportResult = await this.customerService.exportPersonalData(subjectId as string, authenticatedUserId, correlationId);
            res.status(200).json(exportResult);
        } catch (error: any) {
            next(new AppError(error.message, error.statusCode || 500));
        }
    }

    /**
     * GDPR Article 17: Right to Erasure & Anonymization Workflow
     * POST /api/v1/customers/:id/anonymize
     * DELETE /api/v1/customers/:id
     */
    public anonymizeCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const subjectId = req.params.id;
            const authenticatedUserId = (req.headers['x-user-id'] as string) || (req.body?.authenticatedUserId as string);
            const correlationId = tracingContext.getStore() || (req.headers['x-correlation-id'] as string);

            if (!authenticatedUserId) {
                return next(new AppError("Потрібна автентифікація: відсутній заголовок x-user-id", 401));
            }

            const result = await this.customerService.anonymizeCustomer(subjectId as string, authenticatedUserId, correlationId);
            res.status(200).json(result);
        } catch (error: any) {
            next(new AppError(error.message, error.statusCode || 500));
        }
    }

    /**
     * GDPR Article 7: Надання згоди (GRANT)
     * POST /api/v1/customers/:id/consents/grant
     */
    public grantConsent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const subjectId = req.params.id;
            const authenticatedUserId = (req.headers['x-user-id'] as string) || (req.body?.authenticatedUserId as string);
            const correlationId = tracingContext.getStore() || (req.headers['x-correlation-id'] as string);

            if (!authenticatedUserId) {
                return next(new AppError("Потрібна автентифікація: відсутній заголовок x-user-id", 401));
            }

            const result = await this.customerService.grantConsent(subjectId as string, authenticatedUserId, req.body, correlationId);
            res.status(200).json(result);
        } catch (error: any) {
            next(new AppError(error.message, error.statusCode || 500));
        }
    }

    /**
     * GDPR Article 7(3): Відкликання згоди (REVOKE)
     * POST /api/v1/customers/:id/consents/revoke
     */
    public revokeConsent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const subjectId = req.params.id;
            const authenticatedUserId = (req.headers['x-user-id'] as string) || (req.body?.authenticatedUserId as string);
            const correlationId = tracingContext.getStore() || (req.headers['x-correlation-id'] as string);

            if (!authenticatedUserId) {
                return next(new AppError("Потрібна автентифікація: відсутній заголовок x-user-id", 401));
            }

            const result = await this.customerService.revokeConsent(subjectId as string, authenticatedUserId, req.body, correlationId);
            res.status(200).json(result);
        } catch (error: any) {
            next(new AppError(error.message, error.statusCode || 500));
        }
    }

    /**
     * Отримання списку згод користувача
     * GET /api/v1/customers/:id/consents
     */
    public getConsents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const subjectId = req.params.id;
            const authenticatedUserId = (req.headers['x-user-id'] as string) || (req.query?.authenticatedUserId as string);
            const correlationId = tracingContext.getStore() || (req.headers['x-correlation-id'] as string);

            if (!authenticatedUserId) {
                return next(new AppError("Потрібна автентифікація: відсутній заголовок x-user-id", 401));
            }

            const result = await this.customerService.getConsents(subjectId as string, authenticatedUserId, correlationId);
            res.status(200).json(result);
        } catch (error: any) {
            next(new AppError(error.message, error.statusCode || 500));
        }
    }

    /**
     * Відправка маркетингової акції через Policy Gate
     * POST /api/v1/customers/:id/marketing/send-promotion
     */
    public sendPromotion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const subjectId = req.params.id;
            const correlationId = tracingContext.getStore() || (req.headers['x-correlation-id'] as string);
            const campaignName = req.body?.campaignName || "Seasonal_Promotion_2026";

            const result = await this.customerService.sendMarketingPromotion(subjectId as string, campaignName, correlationId);
            res.status(result.status === 'ALLOWED' ? 200 : 403).json(result);
        } catch (error: any) {
            next(new AppError(error.message, error.statusCode || 500));
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

        // 🚨 ЕКСПЕРИМЕНТ: Симуляція монолітної спагеті-деградації (CC Failure, CC = 16 > 15)
        // Додано 9 нових предикатних розгалужень відповідно до теоретичного прогнозу CFG-графу:
        if (promoCode === "BLACK_FRIDAY") return "TITANIUM";
        if (promoCode === "CYBER_MONDAY") return "DIAMOND";
        if (promoCode === "NEW_YEAR_SPECIAL") return "ELITE";
        if (promoCode === "SUMMER_SALE") return "RUBY";
        if (promoCode === "VIP_EXCLUSIVE") return "SAPPHIRE";
        if (promoCode === "PARTNER_REFERRAL") return "AMBASSADOR";
        if (promoCode === "EARLY_BIRD") return "STAR";
        if (promoCode === "INFLUENCER_CODE") return "CREATOR";
        if (promoCode === "ENTERPRISE_TIER") return "ENTERPRISE";

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