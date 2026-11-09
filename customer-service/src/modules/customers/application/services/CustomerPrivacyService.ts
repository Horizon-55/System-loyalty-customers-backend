import { ICustomerRepository } from "../ports/ICustomerRepository.js";
import { ICustomerPrivacyService } from "../ports/ICustomerPrivacyService.js";
import { PersonalDataExportDto, AnonymizeCustomerResultDto } from "../../domain/CustomerPrivacyModels.js";
import { AppError } from "../../../../common/middlewares/errors/AppError.js";
import { SecureLogger } from "../../../../common/logging/SecureLogger.js";

/**
 * Service: CustomerPrivacyService
 * Decomposed single-responsibility service for GDPR Art. 15 (Export) and Art. 17 (Erasure / Anonymization).
 * Metrics: CBO <= 5, LCOM4 = 1, WMC <= 12.
 */
export class CustomerPrivacyService implements ICustomerPrivacyService {
    constructor(private readonly customerRepository: ICustomerRepository) {}

    public async exportPersonalData(
        subjectId: string, 
        authenticatedUserId: string, 
        correlationId?: string
    ): Promise<PersonalDataExportDto> {
        if (authenticatedUserId !== subjectId) {
            SecureLogger.securityAudit('PERSONAL_DATA_EXPORT_ATTEMPT', subjectId, 'DENIED', {
                actorId: authenticatedUserId,
                reason: 'IDOR_VIOLATION'
            }, correlationId);
            throw new AppError("Доступ заборонено: відсутні повноваження на експорт чужих персональних даних", 403);
        }

        const customer = await this.customerRepository.findById(subjectId);
        if (!customer) {
            SecureLogger.securityAudit('PERSONAL_DATA_EXPORT_ATTEMPT', subjectId, 'FAILURE', {
                actorId: authenticatedUserId,
                reason: 'SUBJECT_NOT_FOUND'
            }, correlationId);
            throw new AppError("Суб'єкта персональних даних не знайдено", 404);
        }

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

        SecureLogger.securityAudit('PERSONAL_DATA_EXPORT_COMPLETED', subjectId, 'SUCCESS', {
            actorId: authenticatedUserId,
            categoriesCount: 4
        }, correlationId);

        return exportData;
    }

    public async anonymizeCustomer(
        subjectId: string, 
        authenticatedUserId: string, 
        correlationId?: string
    ): Promise<AnonymizeCustomerResultDto> {
        if (authenticatedUserId !== subjectId) {
            SecureLogger.securityAudit('ANONYMIZE_SUBJECT_ATTEMPT', subjectId, 'DENIED', {
                actorId: authenticatedUserId,
                reason: 'UNAUTHORIZED_ACTOR'
            }, correlationId);
            throw new AppError("Доступ заборонено: відсутні повноваження на видалення або анонімізацію чужого профілю", 403);
        }

        const customer = await this.customerRepository.findById(subjectId);
        if (!customer) {
            SecureLogger.securityAudit('ANONYMIZE_SUBJECT_ATTEMPT', subjectId, 'FAILURE', {
                actorId: authenticatedUserId,
                reason: 'SUBJECT_NOT_FOUND'
            }, correlationId);
            throw new AppError("Суб'єкта персональних даних не знайдено", 404);
        }

        if (customer.isAnonymized && customer.isAnonymized()) {
            return {
                subjectId,
                status: "ALREADY_ANONYMIZED",
                anonymizedAt: new Date().toISOString(),
                purgedEntities: ['profile_pii', 'consent_records', 'notification_settings'],
                retainedEntities: ['loyalty_points_ledger', 'transaction_history_audit'],
                preservedDataRetention: "Transaction points balance retained for legal compliance",
                message: "Суб'єкт вже був раніше анонімізований. Повторна дія не потрібна (ідемпотентність)."
            };
        }

        const anonymizedEmail = `deleted_${customer.getId()}@anon.local`;
        customer.anonymize(anonymizedEmail, "Anonymous User");
        await this.customerRepository.save(customer);

        SecureLogger.securityAudit('ANONYMIZE_SUBJECT_COMPLETED', subjectId, 'SUCCESS', {
            actorId: authenticatedUserId,
            status: 'ANONYMIZED',
            retainedPoints: customer.getTotalPoints()
        }, correlationId);

        return {
            subjectId,
            status: "ANONYMIZED",
            anonymizedAt: new Date().toISOString(),
            purgedEntities: ['profile_pii', 'consent_records', 'notification_settings'],
            retainedEntities: ['loyalty_points_ledger', 'transaction_history_audit'],
            preservedDataRetention: "Transaction points balance retained for legal compliance",
            message: "Персональні дані успішно та незворотно анонімізовано згідно зі ст. 17 GDPR."
        };
    }
}
