/**
 * Auto-generated TypeScript Definitions from OpenAPI 3.0.3 Contract
 * Generated on: 2026-11-16T10:16:11.277Z
 * Single Source of Truth: docs/api/openapi.yaml
 */

export type LoyaltyTier = 'STANDARD' | 'PREMIUM';
export type FaultMode = 'none' | '500' | 'timeout';
export type ConsentPurpose = 'marketing_email' | 'analytics_tracking' | 'third_party_sharing';

export interface CreateCustomerRequest {
    name: string;
    email: string;
    phone?: string;
}

export interface CustomerResponse {
    id: string;
    name: string;
    email: string;
    phone?: string;
    tier: LoyaltyTier;
    anonymized: boolean;
    createdAt: string;
}

export interface ConsentResponse {
    id: string;
    userId: string;
    purposeId: ConsentPurpose | string;
    granted: boolean;
    grantedAt: string;
}

export interface PersonalDataExportResponse {
    subjectId: string;
    exportedAt: string;
    profile: CustomerResponse;
    consents: ConsentResponse[];
}

export interface AnonymizeCustomerResponse {
    subjectId: string;
    anonymized: boolean;
    completedAt: string;
}

export interface GrantConsentRequest {
    purposeId: ConsentPurpose | string;
}

export interface SetFaultModeRequest {
    mode: FaultMode;
}

export interface SetFaultModeResponse {
    success: boolean;
    activeFaultMode: FaultMode;
}

export interface FaultModeStatusResponse {
    activeFaultMode: FaultMode;
}

export interface ErrorResponse {
    statusCode: number;
    error: string;
    message: string;
    timestamp: string;
    correlationId?: string;
}
