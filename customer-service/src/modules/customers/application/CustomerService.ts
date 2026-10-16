import { Customers } from "../domain/Customers.js";
import { ICustomerRepository } from "./ports/ICustomerRepository.js";
import { CreateCustomerDto, CustomerResponseDto } from "./dto/CreateCustomerDto.js";
import { randomUUID } from "crypto";
import { LoyaltyTier } from "../domain/LoyaltyTier.js";
import { AppError } from "../../../common/middlewares/errors/AppError.js";
import { PersonalDataExportDto, AnonymizeCustomerResultDto, UserConsent, GrantConsentDto, RevokeConsentDto, MarketingExecutionResult, ConsentPurpose } from "../domain/CustomerPrivacyModels.js";
import { SecureLogger } from "../../../common/logging/SecureLogger.js";
import { ConsentPolicyGate } from "./ConsentPolicyGate.js";

export class CustomerService {
    private readonly consentPolicyGate: ConsentPolicyGate;

    constructor(private readonly customerRepository: ICustomerRepository) {
        this.consentPolicyGate = new ConsentPolicyGate(this.customerRepository);
    }

    public async getCustomerById(id: string): Promise<CustomerResponseDto> {
        const customer = await this.customerRepository.findById(id); //якщо клієнта знайдено, то повертаємо його
        if (!customer) throw new AppError("Клієнта не знайдено", 404); //якщо клієнта не знайдено, кидаємо 404
        return this.mapToResponceDto(customer); //якщо клієнта знайдено, то повертаємо його
    }

    public async registerCustomer(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
        //перевірка на існування такого користувача
        const existingCustomer = await this.customerRepository.findByEmail(dto.email);
        if (existingCustomer) throw new AppError("Користувач з таким email вже існує", 409);

        //2. Створення доменної сутності
        const newCustomer = new Customers(
        randomUUID(), 
        dto.name, 
        dto.email);

        //3. Збереження абстракції (інтерфейс)
        await this.customerRepository.save(newCustomer);

        //4.Мапінг доменної сутності на DTO
        return this.mapToResponceDto(newCustomer);
    }
    //ручний мапінг доменної сутності на DTO
    private mapToResponceDto(customer: Customers): CustomerResponseDto {
        return {
            id: customer.getId(),
            name: customer.getName(),
            email: customer.getEmail(),
            tier: customer.getTier(),
            totalPoints: customer.getTotalPoints(),
        }
    }

    /**
     * НОВИЙ МЕТОД ДЛЯ САГИ: Видача Premium-статусу
     */
    public async upgradeToPremium(id: string): Promise<void> {
        const customer = await this.customerRepository.findById(id);
        if (!customer) 
            throw new Error('Клієнта не знайдено');

        // Штучна умова для тестування компенсації (відкату)
        if (customer.getTier() === LoyaltyTier.PREMIUM) 
            throw new Error('Клієнт ВЖЕ має статус Premium. Операція відхилена.');
        
        // Якщо все добре — оновлюємо статус
        (customer as any).tier = LoyaltyTier.PREMIUM;
        
        // Зберігаємо зміни в базу (через репозиторій)
        await this.customerRepository.save(customer); 
    }

    /**
     * GDPR Article 15: Right of Access & Personal Data Export
     * Агрегує персональні дані суб'єкта, мінімізує security-поля та блокує IDOR
     */
    public async exportPersonalData(
        subjectId: string, 
        authenticatedUserId: string, 
        correlationId?: string
    ): Promise<PersonalDataExportDto> {
        // 1. Контроль доступу (Anti-IDOR): Тільки сам користувач або авторизована особа
        if (authenticatedUserId !== subjectId) {
            SecureLogger.securityAudit('PERSONAL_DATA_EXPORT_ATTEMPT', subjectId, 'DENIED', {
                actorId: authenticatedUserId,
                reason: 'IDOR_VIOLATION'
            }, correlationId);
            throw new AppError("Доступ заборонено: відсутні повноваження на експорт чужих персональних даних", 403);
        }

        // 2. Пошук суб'єкта
        const customer = await this.customerRepository.findById(subjectId);
        if (!customer) {
            SecureLogger.securityAudit('PERSONAL_DATA_EXPORT_ATTEMPT', subjectId, 'FAILURE', {
                actorId: authenticatedUserId,
                reason: 'SUBJECT_NOT_FOUND'
            }, correlationId);
            throw new AppError("Суб'єкта персональних даних не знайдено", 404);
        }

        // 3. Агрегація даних із дотриманням Data Minimization (GDPR Art. 5(1)(c))
        const exportData: PersonalDataExportDto = {
            version: "1.0",
            exportedAt: new Date().toISOString(),
            subjectId: customer.getId(),
            legalBasis: "GDPR Article 15 (Right of Access)",
            categories: {
                profile: {
                    id: customer.getId(),
                    name: customer.getName(),
                    email: customer.getEmail(),
                    phone: customer.getPhone()
                },
                loyalty: {
                    tier: customer.getTier(),
                    totalPoints: customer.getTotalPoints(),
                    history: customer.getPointsHistory()
                },
                settings: customer.getSettings(),
                consents: customer.getConsents().map(c => ({
                    purpose: c.purpose,
                    isGranted: c.isGranted,
                    policyVersion: c.policyVersion,
                    grantedAt: c.grantedAt,
                    withdrawnAt: c.withdrawnAt
                }))
            },
            documentedOmissions: [
                "password_hash",
                "access_and_refresh_tokens",
                "internal_antifraud_score",
                "session_secrets",
                "infrastructure_api_keys"
            ]
        };

        // 4. Privacy-safe audit логування (без витоку тіла експорту!)
        SecureLogger.securityAudit('PERSONAL_DATA_EXPORT_COMPLETED', subjectId, 'SUCCESS', {
            actorId: authenticatedUserId,
            categoriesCount: 4
        }, correlationId);

        return exportData;
    }

    /**
     * GDPR Article 17: Right to Erasure & Anonymization Workflow
     * Виконує авторизовану, незворотну та ідемпотентну анонімізацію суб'єкта,
     * зберігаючи референційну цілісність пов'язаних транзакцій лояльності (Retention rule).
     */
    public async anonymizeCustomer(
        subjectId: string, 
        authenticatedUserId: string, 
        correlationId?: string
    ): Promise<AnonymizeCustomerResultDto> {
        // 1. Контроль доступу (Тільки сам користувач або авторизована особа)
        if (authenticatedUserId !== subjectId) {
            SecureLogger.securityAudit('ANONYMIZE_SUBJECT_ATTEMPT', subjectId, 'DENIED', {
                actorId: authenticatedUserId,
                reason: 'UNAUTHORIZED_ACTOR'
            }, correlationId);
            throw new AppError("Доступ заборонено: відсутні повноваження на видалення або анонімізацію чужого профілю", 403);
        }

        // 2. Пошук суб'єкта у сховищі
        const customer = await this.customerRepository.findById(subjectId);
        if (!customer) {
            SecureLogger.securityAudit('ANONYMIZE_SUBJECT_ATTEMPT', subjectId, 'FAILURE', {
                actorId: authenticatedUserId,
                reason: 'SUBJECT_NOT_FOUND'
            }, correlationId);
            throw new AppError("Суб'єкта не знайдено", 404);
        }

        // 3. Перевірка ідемпотентності (повторний запит не повинен призводити до збою чи дублювання)
        if (customer.isAnonymized()) {
            SecureLogger.securityAudit('ANONYMIZE_SUBJECT_COMPLETED', subjectId, 'SUCCESS', {
                status: 'ALREADY_ANONYMIZED',
                actorId: authenticatedUserId
            }, correlationId);
            return {
                subjectId,
                status: 'ALREADY_ANONYMIZED',
                anonymizedAt: new Date().toISOString(),
                retainedEntities: ['loyalty_points_ledger', 'transaction_history'],
                purgedEntities: ['profile_pii', 'user_consents']
            };
        }

        // 4. Виконання незворотної анонімізації:
        // Унікальний синтетичний email для збереження унікальних індексів у БД
        const anonymousEmail = `deleted_${customer.getId()}@anon.local`;
        customer.anonymize(anonymousEmail, "Anonymous User");

        // Збереження оновленого стану в репозиторій
        await this.customerRepository.save(customer);

        // 5. Запис Privacy-Safe Security Audit події (БЕЗ збереження видалених PII!)
        SecureLogger.securityAudit('ANONYMIZE_SUBJECT_COMPLETED', subjectId, 'SUCCESS', {
            status: 'ANONYMIZED',
            actorId: authenticatedUserId,
            retainedEntities: ['loyalty_points_ledger', 'transaction_history'],
            purgedEntities: ['profile_pii', 'user_consents']
        }, correlationId);

        return {
            subjectId,
            status: 'ANONYMIZED',
            anonymizedAt: new Date().toISOString(),
            retainedEntities: ['loyalty_points_ledger', 'transaction_history'],
            purgedEntities: ['profile_pii', 'user_consents']
        };
    }

    public getPolicyGate(): ConsentPolicyGate {
        return this.consentPolicyGate;
    }

    /**
     * GDPR Article 7: Надання згоди (GRANT)
     */
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

    /**
     * GDPR Article 7(3): Відкликання згоди (REVOKE)
     */
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

    /**
     * Отримання списку активних та історичних згод суб'єкта
     */
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

    /**
     * Бізнес-дія, залежна від згоди: Відправка маркетингового розсилу
     * Демонструє роботу Policy Gate у сценарії GRANT -> ALLOW -> REVOKE -> DENY
     */
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

        // Policy Gate перевіряє згоду на MARKETING_EMAIL безпосередньо перед дією!
        const gateResult = await this.consentPolicyGate.executeIfAllowed(
            userId,
            'MARKETING_EMAIL',
            async () => {
                // Симуляція відправки промо-повідомлення
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