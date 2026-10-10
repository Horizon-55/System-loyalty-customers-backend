/**
 * External Service Gateway Configuration
 * Secure pattern: Credentials injected dynamically via Environment Variables.
 * ISO/IEC 25010 Lab 3: Secrets Leak Prevention & Safe Configuration.
 */

export interface GatewayConfig {
    serviceName: string;
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    githubApiToken: string;
}

export function loadGatewayConfig(): GatewayConfig {
    return {
        serviceName: process.env.GATEWAY_SERVICE_NAME || 'Loyalty-Gateway-Production',
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        githubApiToken: process.env.GITHUB_API_TOKEN || ''
    };
}
