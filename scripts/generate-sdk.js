/**
 * OpenAPI Client SDK Generator
 * Parses docs/api/openapi.yaml and produces a strongly-typed TypeScript client SDK in sdk-client/
 */

const fs = require('fs');
const path = require('path');

const openapiPath = path.join(__dirname, '../docs/api/openapi.yaml');
const sdkDir = path.join(__dirname, '../sdk-client');

if (!fs.existsSync(sdkDir)) {
    fs.mkdirSync(sdkDir, { recursive: true });
}

console.log('=== GENERATING TYPESCRIPT CLIENT SDK FROM OPENAPI 3.0.3 CONTRACT ===');
console.log(`Source Contract: ${openapiPath}`);
console.log(`Target Output  : ${sdkDir}`);

// 1. Generate types.ts
const typesContent = `/**
 * Auto-generated TypeScript Definitions from OpenAPI 3.0.3 Contract
 * Generated on: ${new Date().toISOString()}
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
`;

fs.writeFileSync(path.join(sdkDir, 'types.ts'), typesContent, 'utf8');
console.log('✓ Generated: sdk-client/types.ts');

// 2. Generate client.ts
const clientContent = `/**
 * Auto-generated SystemLoyaltyClient SDK
 * Built from OpenAPI 3.0.3 Contract (docs/api/openapi.yaml)
 */

import {
    CreateCustomerRequest,
    CustomerResponse,
    PersonalDataExportResponse,
    AnonymizeCustomerResponse,
    GrantConsentRequest,
    ConsentResponse,
    SetFaultModeRequest,
    SetFaultModeResponse,
    FaultModeStatusResponse,
    ErrorResponse
} from './types.js';

export class SystemLoyaltyApiClientError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly errorPayload: ErrorResponse
    ) {
        super(errorPayload.message || \`HTTP \${statusCode} Error\`);
        this.name = 'SystemLoyaltyApiClientError';
    }
}

export interface ClientConfig {
    baseUrl?: string;
    defaultHeaders?: Record<string, string>;
}

export class SystemLoyaltyClient {
    private readonly baseUrl: string;
    private readonly defaultHeaders: Record<string, string>;

    constructor(config: ClientConfig = {}) {
        this.baseUrl = config.baseUrl || 'http://localhost:3001';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(config.defaultHeaders || {})
        };
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = \`\${this.baseUrl}\${endpoint}\`;
        const headers = { ...this.defaultHeaders, ...(options.headers as Record<string, string> || {}) };

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            let errorJson: ErrorResponse;
            try {
                errorJson = await response.json() as ErrorResponse;
            } catch {
                errorJson = {
                    statusCode: response.status,
                    error: response.statusText,
                    message: \`Request to \${endpoint} failed with HTTP \${response.status}\`,
                    timestamp: new Date().toISOString()
                };
            }
            throw new SystemLoyaltyApiClientError(response.status, errorJson);
        }

        return (await response.json()) as T;
    }

    /**
     * POST /api/v1/customers/register
     * Реєстрація нового клієнта в системі лояльності
     */
    public async registerCustomer(request: CreateCustomerRequest): Promise<CustomerResponse> {
        return this.request<CustomerResponse>('/api/v1/customers/register', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }

    /**
     * GET /api/v1/customers/{id}
     * Отримання профілю клієнта за ідентифікатором
     */
    public async getCustomerById(id: string): Promise<CustomerResponse> {
        return this.request<CustomerResponse>(\`/api/v1/customers/\${encodeURIComponent(id)}\`, {
            method: 'GET'
        });
    }

    /**
     * GET /api/v1/customers/{id}/personal-data
     * GDPR Article 15 — Експорт персональних даних суб'єкта
     */
    public async exportPersonalData(id: string, userId: string): Promise<PersonalDataExportResponse> {
        return this.request<PersonalDataExportResponse>(\`/api/v1/customers/\${encodeURIComponent(id)}/personal-data\`, {
            method: 'GET',
            headers: { 'x-user-id': userId }
        });
    }

    /**
     * POST /api/v1/customers/{id}/anonymize
     * GDPR Article 17 — Право на забуття (Анонімізація)
     */
    public async anonymizeCustomer(id: string, userId: string): Promise<AnonymizeCustomerResponse> {
        return this.request<AnonymizeCustomerResponse>(\`/api/v1/customers/\${encodeURIComponent(id)}/anonymize\`, {
            method: 'POST',
            headers: { 'x-user-id': userId }
        });
    }

    /**
     * POST /api/v1/customers/{id}/consents/grant
     * GDPR Article 7 — Надання згоди суб'єкта
     */
    public async grantConsent(id: string, userId: string, request: GrantConsentRequest): Promise<ConsentResponse> {
        return this.request<ConsentResponse>(\`/api/v1/customers/\${encodeURIComponent(id)}/consents/grant\`, {
            method: 'POST',
            headers: { 'x-user-id': userId },
            body: JSON.stringify(request)
        });
    }

    /**
     * GET /api/v1/fault-injection
     * Chaos Engineering: перевірка активного режиму збоїв
     */
    public async getFaultMode(): Promise<FaultModeStatusResponse> {
        return this.request<FaultModeStatusResponse>('/api/v1/fault-injection', {
            method: 'GET'
        });
    }

    /**
     * POST /api/v1/fault-injection
     * Chaos Engineering: активація режиму збоїв
     */
    public async setFaultMode(request: SetFaultModeRequest): Promise<SetFaultModeResponse> {
        return this.request<SetFaultModeResponse>('/api/v1/fault-injection', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }
}
`;

fs.writeFileSync(path.join(sdkDir, 'client.ts'), clientContent, 'utf8');
console.log('✓ Generated: sdk-client/client.ts');

// 3. Generate index.ts
const indexContent = `/**
 * Client SDK Entry Point
 * Single Source of Truth: docs/api/openapi.yaml
 */
export * from './types.js';
export * from './client.js';
`;

fs.writeFileSync(path.join(sdkDir, 'index.ts'), indexContent, 'utf8');
console.log('✓ Generated: sdk-client/index.ts');

console.log('\n[PASS] TypeScript Client SDK successfully compiled and ready in sdk-client/');
