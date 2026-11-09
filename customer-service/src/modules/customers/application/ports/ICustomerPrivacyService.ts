import { PersonalDataExportDto, AnonymizeCustomerResultDto } from "../../domain/CustomerPrivacyModels.js";

/**
 * Interface: ICustomerPrivacyService
 * Contract for GDPR Article 15 (Export) and Article 17 (Erasure / Anonymization).
 */
export interface ICustomerPrivacyService {
    exportPersonalData(
        subjectId: string, 
        authenticatedUserId: string, 
        correlationId?: string
    ): Promise<PersonalDataExportDto>;

    anonymizeCustomer(
        subjectId: string, 
        authenticatedUserId: string, 
        correlationId?: string
    ): Promise<AnonymizeCustomerResultDto>;
}
