import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SystemLoyaltyClient, CreateCustomerRequest } from '../../../sdk-client/index.js';

describe('SystemLoyaltyClient SDK Unit Test Suite', () => {
    it('should initialize SystemLoyaltyClient with default config', () => {
        const client = new SystemLoyaltyClient();
        assert.ok(client instanceof SystemLoyaltyClient);
    });

    it('should initialize SystemLoyaltyClient with custom baseUrl and headers', () => {
        const client = new SystemLoyaltyClient({
            baseUrl: 'https://staging.loyalty.example.com',
            defaultHeaders: { 'x-api-key': 'test-key-123' }
        });
        assert.ok(client instanceof SystemLoyaltyClient);
    });

    it('should construct valid payload matching CreateCustomerRequest interface', () => {
        const req: CreateCustomerRequest = {
            name: 'Олена Петренко',
            email: 'olena.petrenko@example.com',
            phone: '+380501112233'
        };
        assert.strictEqual(req.name, 'Олена Петренко');
        assert.strictEqual(req.email, 'olena.petrenko@example.com');
        assert.strictEqual(req.phone, '+380501112233');
    });

    it('should expose all required API-First methods on client', () => {
        const client = new SystemLoyaltyClient();
        assert.strictEqual(typeof client.registerCustomer, 'function');
        assert.strictEqual(typeof client.getCustomerById, 'function');
        assert.strictEqual(typeof client.exportPersonalData, 'function');
        assert.strictEqual(typeof client.anonymizeCustomer, 'function');
        assert.strictEqual(typeof client.grantConsent, 'function');
        assert.strictEqual(typeof client.getFaultMode, 'function');
        assert.strictEqual(typeof client.setFaultMode, 'function');
    });
});
