/**
 * Privacy Engineering Models & DTOs for ISO/IEC 25010 & GDPR Compliance
 * Covers Article 7 (Consent), Article 15 (Right of Access), Article 17 (Right to Erasure)
 */

import { LoyaltyTier } from "./LoyaltyTier.js";

export type ConsentPurpose = 'MARKETING_EMAIL' | 'OPTIONAL_ANALYTICS' | 'PROFILING';

export interface UserConsent {
    userId: string;
    purpose: ConsentPurpose;
    isGranted: boolean;
    policyVersion: string;
    grantedAt?: string;
    withdrawnAt?: string;
    updatedAt: string;
    source: string;
}

export interface ConsentHistoryEntry {
    action: 'GRANT' | 'REVOKE';
    purpose: ConsentPurpose;
    isGranted: boolean;
    policyVersion: string;
    timestamp: string;
    source: string;
    actorId: string;
}

export interface GrantConsentDto {
    purpose: ConsentPurpose;
    policyVersion?: string;
    source?: string;
}

export interface RevokeConsentDto {
    purpose: ConsentPurpose;
    source?: string;
}

export interface MarketingExecutionResult {
    executed: boolean;
    status: 'ALLOWED' | 'DENIED';
    reason: string;
    campaignName?: string;
    recipientEmail?: string;
    timestamp: string;
}

export interface CustomerSettings {
    preferredLanguage: string;
    notificationsEnabled: boolean;
    theme: string;
}

export interface PointsTransactionRecord {
    transactionId: string;
    points: number;
    reason: string;
    timestamp: string;
}

export interface PersonalDataExportDto {
    version: string;
    exportedAt: string;
    subjectId: string;
    legalBasis: string;
    categories: {
        profile: {
            id: string;
            name: string;
            email: string;
            phone?: string;
        };
        loyalty: {
            tier: LoyaltyTier;
            totalPoints: number;
            history: PointsTransactionRecord[];
        };
        settings: CustomerSettings;
        consents: Array<{
            purpose: string;
            isGranted: boolean;
            policyVersion: string;
            grantedAt?: string;
            withdrawnAt?: string;
        }>;
    };
    documentedOmissions: string[];
}

export interface AnonymizeCustomerResultDto {
    subjectId: string;
    status: 'ANONYMIZED' | 'ALREADY_ANONYMIZED';
    anonymizedAt: string;
    retainedEntities: string[];
    purgedEntities: string[];
}


