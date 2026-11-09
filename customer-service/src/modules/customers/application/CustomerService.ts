import { ICustomerRepository } from "./ports/ICustomerRepository.js";
import { ICustomerCoreService } from "./ports/ICustomerCoreService.js";
import { ICustomerPrivacyService } from "./ports/ICustomerPrivacyService.js";
import { ICustomerConsentService } from "./ports/ICustomerConsentService.js";
import { CustomerCoreService } from "./services/CustomerCoreService.js";
import { CustomerPrivacyService } from "./services/CustomerPrivacyService.js";
import { CustomerConsentService } from "./services/CustomerConsentService.js";
import { CreateCustomerDto, CustomerResponseDto } from "./dto/CreateCustomerDto.js";
import { 
    PersonalDataExportDto, 
    AnonymizeCustomerResultDto, 
    UserConsent, 
    GrantConsentDto, 
    RevokeConsentDto, 
    MarketingExecutionResult 
} from "../domain/CustomerPrivacyModels.js";

/**
 * Composite Facade: CustomerService (Refactored PASS State)
 * Replaces the monolithic God Object with clean Interface Decomposition and Delegation.
 * Inverts dependencies via ICustomerCoreService, ICustomerPrivacyService, ICustomerConsentService.
 */
export class CustomerService implements ICustomerCoreService, ICustomerPrivacyService, ICustomerConsentService {
    private readonly coreService: ICustomerCoreService;
    private readonly privacyService: ICustomerPrivacyService;
    private readonly consentService: ICustomerConsentService;

    constructor(
        repositoryOrCore: ICustomerRepository | ICustomerCoreService,
        privacyService?: ICustomerPrivacyService,
        consentService?: ICustomerConsentService
    ) {
        if (privacyService && consentService) {
            this.coreService = repositoryOrCore as ICustomerCoreService;
            this.privacyService = privacyService;
            this.consentService = consentService;
        } else {
            const repo = repositoryOrCore as ICustomerRepository;
            this.coreService = new CustomerCoreService(repo);
            this.privacyService = new CustomerPrivacyService(repo);
            this.consentService = new CustomerConsentService(repo);
        }
    }

    // --- ICustomerCoreService Delegation ---
    public async getCustomerById(id: string): Promise<CustomerResponseDto> {
        return this.coreService.getCustomerById(id);
    }

    public async registerCustomer(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
        return this.coreService.registerCustomer(dto);
    }

    public async upgradeToPremium(id: string): Promise<void> {
        return this.coreService.upgradeToPremium(id);
    }

    // --- ICustomerPrivacyService Delegation ---
    public async exportPersonalData(
        subjectId: string, 
        authenticatedUserId: string, 
        correlationId?: string
    ): Promise<PersonalDataExportDto> {
        return this.privacyService.exportPersonalData(subjectId, authenticatedUserId, correlationId);
    }

    public async anonymizeCustomer(
        subjectId: string, 
        authenticatedUserId: string, 
        correlationId?: string
    ): Promise<AnonymizeCustomerResultDto> {
        return this.privacyService.anonymizeCustomer(subjectId, authenticatedUserId, correlationId);
    }

    // --- ICustomerConsentService Delegation ---
    public async grantConsent(
        userId: string, 
        authenticatedUserId: string, 
        dto: GrantConsentDto, 
        correlationId?: string
    ): Promise<UserConsent> {
        return this.consentService.grantConsent(userId, authenticatedUserId, dto, correlationId);
    }

    public async revokeConsent(
        userId: string, 
        authenticatedUserId: string, 
        dto: RevokeConsentDto, 
        correlationId?: string
    ): Promise<UserConsent> {
        return this.consentService.revokeConsent(userId, authenticatedUserId, dto, correlationId);
    }

    public async getConsents(
        userId: string, 
        authenticatedUserId: string, 
        correlationId?: string
    ): Promise<UserConsent[]> {
        return this.consentService.getConsents(userId, authenticatedUserId, correlationId);
    }

    public async sendMarketingPromotion(
        userId: string, 
        campaignName: string, 
        correlationId?: string
    ): Promise<MarketingExecutionResult> {
        return this.consentService.sendMarketingPromotion(userId, campaignName, correlationId);
    }

    public getPolicyGate(): any {
        return (this.consentService as any).getPolicyGate ? (this.consentService as any).getPolicyGate() : undefined;
    }
}
