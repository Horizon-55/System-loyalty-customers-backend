import { ICustomerRepository } from "./ports/ICustomerRepository.js";
import { ConsentPurpose, UserConsent } from "../domain/CustomerPrivacyModels.js";
import { SecureLogger } from "../../../common/logging/SecureLogger.js";

export interface PolicyGateDecision {
    isAllowed: boolean;
    reason: string;
    consent?: UserConsent;
}

export interface PolicyGateExecutionResult<T> {
    executed: boolean;
    status: 'ALLOWED' | 'DENIED';
    reason: string;
    result?: T;
}

/**
 * ConsentPolicyGate: Architectural policy enforcement barrier (GDPR Article 7)
 * Ensures optional business actions (marketing email, tracking) only execute if valid consent exists.
 */
export class ConsentPolicyGate {
    constructor(private readonly customerRepository: ICustomerRepository) {}

    /**
     * Evaluates whether a specific purpose is authorized by active consent.
     */
    public async checkConsent(
        userId: string, 
        purpose: ConsentPurpose, 
        minimumPolicyVersion?: string
    ): Promise<PolicyGateDecision> {
        const customer = await this.customerRepository.findById(userId);
        if (!customer) {
            return { isAllowed: false, reason: 'USER_NOT_FOUND' };
        }

        if (customer.isAnonymized()) {
            return { isAllowed: false, reason: 'USER_ANONYMIZED' };
        }

        const consent = customer.getConsent(purpose);
        if (!consent) {
            return { isAllowed: false, reason: 'NO_CONSENT_RECORDED' };
        }

        if (!consent.isGranted) {
            return { isAllowed: false, reason: 'CONSENT_WITHDRAWN', consent };
        }

        if (minimumPolicyVersion && consent.policyVersion !== minimumPolicyVersion) {
            return { isAllowed: false, reason: 'POLICY_VERSION_MISMATCH', consent };
        }

        return { isAllowed: true, reason: 'CONSENT_ACTIVE', consent };
    }

    /**
     * Executes an optional business action ONLY if active consent is granted.
     * Prevents side effects when consent is missing or revoked (DENY).
     */
    public async executeIfAllowed<T>(
        userId: string,
        purpose: ConsentPurpose,
        action: () => Promise<T>,
        options?: { minimumPolicyVersion?: string; correlationId?: string }
    ): Promise<PolicyGateExecutionResult<T>> {
        const decision = await this.checkConsent(userId, purpose, options?.minimumPolicyVersion);

        if (!decision.isAllowed) {
            SecureLogger.securityAudit('POLICY_GATE_DECISION', userId, 'DENIED', {
                purpose,
                reason: decision.reason
            }, options?.correlationId);

            return {
                executed: false,
                status: 'DENIED',
                reason: decision.reason
            };
        }

        SecureLogger.securityAudit('POLICY_GATE_DECISION', userId, 'SUCCESS', {
            purpose,
            reason: decision.reason,
            policyVersion: decision.consent?.policyVersion
        }, options?.correlationId);

        const actionResult = await action();

        return {
            executed: true,
            status: 'ALLOWED',
            reason: 'CONSENT_VALIDATED',
            result: actionResult
        };
    }
}
