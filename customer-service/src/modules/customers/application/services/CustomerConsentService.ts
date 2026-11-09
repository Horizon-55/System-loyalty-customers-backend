import { ICustomerRepository } from "../ports/ICustomerRepository.js";
import { ICustomerConsentService } from "../ports/ICustomerConsentService.js";
import { ConsentPolicyGate } from "../ConsentPolicyGate.js";
import { 
    GrantConsentDto, 
    RevokeConsentDto, 
    UserConsent, 
    MarketingExecutionResult 
} from "../../domain/CustomerPrivacyModels.js";
import { AppError } from "../../../../common/middlewares/errors/AppError.js";
import { SecureLogger } from "../../../../common/logging/SecureLogger.js";

/**
 * Service: CustomerConsentService
 * Decomposed single-responsibility service for GDPR Art. 7 (Consent Management) and Marketing Governance.
 * Metrics: CBO <= 6, LCOM4 = 1, WMC <= 12.
 */
export class CustomerConsentService implements ICustomerConsentService {
    private readonly consentPolicyGate: ConsentPolicyGate;

    constructor(private readonly customerRepository: ICustomerRepository) {
        this.consentPolicyGate = new ConsentPolicyGate(this.customerRepository);
    }

    public getPolicyGate(): ConsentPolicyGate {
        return this.consentPolicyGate;
    }

    public async grantConsent(
        userId: string, 
        authenticatedUserId: string, 
        dto: GrantConsentDto, 
        correlationId?: string
    ): Promise<UserConsent> {
        if (authenticatedUserId !== userId) {
            SecureLogger.securityAudit('GRANT_CONSENT_ATTEMPT', userId, 'DENIED', {
                actorId: authenticatedUserId,
                reason: 'UNAUTHORIZED_ACTOR'
            }, correlationId);
            throw new AppError("Доступ заборонено: відсутні повноваження на керування згодами чужого профілю", 403);
        }

        const customer = await this.customerRepository.findById(userId);
        if (!customer) {
            throw new AppError("Суб'єкта не знайдено", 404);
        }

        const policyVersion = dto.policyVersion || "v1.0";
        const source = dto.source || "web_settings";

        const consent = customer.grantConsent(dto.purpose, policyVersion, source, authenticatedUserId);
        await this.customerRepository.save(customer);

        SecureLogger.securityAudit('CONSENT_GRANTED', userId, 'SUCCESS', {
            purpose: dto.purpose,
            policyVersion,
            source
        }, correlationId);

        return consent;
    }

    public async revokeConsent(
        userId: string, 
        authenticatedUserId: string, 
        dto: RevokeConsentDto, 
        correlationId?: string
    ): Promise<UserConsent> {
        if (authenticatedUserId !== userId) {
            SecureLogger.securityAudit('REVOKE_CONSENT_ATTEMPT', userId, 'DENIED', {
                actorId: authenticatedUserId,
                reason: 'UNAUTHORIZED_ACTOR'
            }, correlationId);
            throw new AppError("Доступ заборонено: відсутні повноваження на керування згодами чужого профілю", 403);
        }

        const customer = await this.customerRepository.findById(userId);
        if (!customer) {
            throw new AppError("Суб'єкта не знайдено", 404);
        }

        const source = dto.source || "web_settings";
        const consent = customer.revokeConsent(dto.purpose, source, authenticatedUserId);
        await this.customerRepository.save(customer);

        SecureLogger.securityAudit('CONSENT_REVOKED', userId, 'SUCCESS', {
            purpose: dto.purpose,
            source
        }, correlationId);

        return consent;
    }

    public async getConsents(
        userId: string, 
        authenticatedUserId: string, 
        correlationId?: string
    ): Promise<UserConsent[]> {
        if (authenticatedUserId !== userId) {
            throw new AppError("Доступ заборонено: відсутні повноваження на перегляд чужих згод", 403);
        }

        const customer = await this.customerRepository.findById(userId);
        if (!customer) {
            throw new AppError("Суб'єкта не знайдено", 404);
        }

        return customer.getConsents();
    }

    public async sendMarketingPromotion(
        userId: string, 
        campaignName: string, 
        correlationId?: string
    ): Promise<MarketingExecutionResult> {
        const customer = await this.customerRepository.findById(userId);
        if (!customer) {
            return {
                executed: false,
                status: 'DENIED',
                reason: 'USER_NOT_FOUND',
                timestamp: new Date().toISOString()
            };
        }

        const gateResult = await this.consentPolicyGate.executeIfAllowed(
            userId,
            'MARKETING_EMAIL',
            async () => {
                return {
                    campaignName,
                    recipientEmail: customer.getEmail(),
                    sentTimestamp: new Date().toISOString()
                };
            },
            { correlationId }
        );

        if (!gateResult.executed) {
            return {
                executed: false,
                status: 'DENIED',
                reason: gateResult.reason,
                timestamp: new Date().toISOString()
            };
        }

        return {
            executed: true,
            status: 'ALLOWED',
            reason: 'PROMOTION_DISPATCHED_SUCCESSFULLY',
            campaignName,
            recipientEmail: customer.getEmail(),
            timestamp: new Date().toISOString()
        };
    }
}
