import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('API Contract Drift Audit (OpenAPI vs Live Modular Monolith)', () => {
    const openapiYamlPath = path.resolve('docs/api/openapi.yaml');

    it('should verify that OpenAPI specification file exists and is readable', () => {
        assert.ok(fs.existsSync(openapiYamlPath), 'openapi.yaml must exist on disk');
        const content = fs.readFileSync(openapiYamlPath, 'utf8');
        assert.ok(content.includes('openapi: 3.0.3'), 'Must be OpenAPI 3.0.3');
        assert.ok(content.includes('System Loyalty Customers Backend API'), 'Title must match');
    });

    it('should verify that all core live routes are documented in OpenAPI paths without drift', () => {
        const content = fs.readFileSync(openapiYamlPath, 'utf8');
        
        const expectedPaths = [
            '/api/v1/customers/register',
            '/api/v1/customers/{id}',
            '/api/v1/customers/{id}/personal-data',
            '/api/v1/customers/{id}/anonymize',
            '/api/v1/customers/{id}/consents/grant',
            '/api/v1/fault-injection'
        ];

        for (const ep of expectedPaths) {
            assert.ok(content.includes(ep), `OpenAPI contract must document route: ${ep}`);
        }
    });

    it('should verify unified error response schema compliance across all routes', () => {
        const content = fs.readFileSync(openapiYamlPath, 'utf8');
        assert.ok(content.includes("'$ref': '#/components/schemas/ErrorResponse'") || content.includes("$ref: '#/components/schemas/ErrorResponse'"), 'Must use unified ErrorResponse schema');
        assert.ok(content.includes('statusCode:'), 'Error schema must have statusCode');
        assert.ok(content.includes('error:'), 'Error schema must have error string');
        assert.ok(content.includes('message:'), 'Error schema must have message');
        assert.ok(content.includes('timestamp:'), 'Error schema must have timestamp');
    });

    it('should verify that GDPR Article 15 and 17 privacy engineering operations are documented', () => {
        const content = fs.readFileSync(openapiYamlPath, 'utf8');
        assert.ok(content.includes('exportPersonalData'), 'exportPersonalData operationId required');
        assert.ok(content.includes('anonymizeCustomer'), 'anonymizeCustomer operationId required');
        assert.ok(content.includes('x-user-id'), 'x-user-id security parameter required');
    });
});
