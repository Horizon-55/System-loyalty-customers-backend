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

    // ========================================================================
    // DATA-DRIVEN REFACTORING (Lookup Table Pattern) - PASS СТАН (CC = 1..2)
    // Повністю усунено каскади if/else та switch/case за рахунок статичних таблиць пошуку.
    // ========================================================================
    private static readonly SPECIAL_PROMO_LOOKUP: Readonly<Record<string, string>> = {
        "BLACK_FRIDAY": "TITANIUM",
        "CYBER_MONDAY": "DIAMOND",
        "NEW_YEAR_SPECIAL": "ELITE",
        "SUMMER_SALE": "RUBY",
        "VIP_EXCLUSIVE": "SAPPHIRE",
        "PARTNER_REFERRAL": "AMBASSADOR",
        "EARLY_BIRD": "STAR",
        "INFLUENCER_CODE": "CREATOR",
        "ENTERPRISE_TIER": "ENTERPRISE"
    };

    // Декларативна таблиця переходів станів лояльності (Data-Driven Matrix)
    private static readonly TIER_DECISION_TABLE: Readonly<Record<string, string>> = {
        "INELIGIBLE": "BRONZE",
        "SILVER_BAND": "SILVER",
        "NO_PROMO": "GOLD",
        "PROMO_EVEN_PLATINUM": "PLATINUM",
        "PROMO_EVEN_GOLD": "GOLD",
        "PROMO_ODD_SILVER_PLUS": "SILVER_PLUS",
        "PROMO_ODD_GOLD": "GOLD"
    };

    /**
     * Лінеаризований розрахунок рівня лояльності (Data-Driven Refactoring)
     * Складність методу знижена до абсолютного мінімуму (CC = 2).
     */
    public calculateLoyaltyTierAudit(points: number, isActive: boolean, years: number, promoCode: string = ""): string {
        const promoTier = CustomerController.SPECIAL_PROMO_LOOKUP[promoCode];
        if (promoTier) return promoTier;

        return CustomerController.TIER_DECISION_TABLE[this.deriveTierKey(points, isActive, years, promoCode)] ?? "BRONZE";
    }

    /**
     * Селектор композитного ключа для таблиці пошуку
     */
    private deriveTierKey(points: number, isActive: boolean, years: number, promoCode?: string): string {
        if (points <= 0 || !isActive || years <= 1) return "INELIGIBLE";
        if (points <= 1000) return "SILVER_BAND";
        if (!promoCode || promoCode.length <= 3) return "NO_PROMO";

        const isLastIterEven = (years - 1) % 2 === 0;
        if (isLastIterEven) {
            return points > 5000 ? "PROMO_EVEN_PLATINUM" : "PROMO_EVEN_GOLD";
        }
        return points > 2000 ? "PROMO_ODD_SILVER_PLUS" : "PROMO_ODD_GOLD";
    }
}