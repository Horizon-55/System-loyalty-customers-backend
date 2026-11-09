import { 
    GrantConsentDto, 
    RevokeConsentDto, 
    UserConsent, 
    MarketingExecutionResult 
} from "../../domain/CustomerPrivacyModels.js";

/**
 * Interface: ICustomerConsentService
 * Contract for GDPR Article 7 (Consent Management) and Marketing Policy Governance.
 */
export interface ICustomerConsentService {
    grantConsent(
        userId: string, 
        authenticatedUserId: string, 
        dto: GrantConsentDto, 
        correlationId?: string
    ): Promise<UserConsent>;

    revokeConsent(
        userId: string, 
        authenticatedUserId: string, 
        dto: RevokeConsentDto, 
        correlationId?: string
    ): Promise<UserConsent>;

    getConsents(
        userId: string, 
        authenticatedUserId: string, 
        correlationId?: string
    ): Promise<UserConsent[]>;

    sendMarketingPromotion(
        userId: string, 
        campaignName: string, 
        correlationId?: string
    ): Promise<MarketingExecutionResult>;
}
