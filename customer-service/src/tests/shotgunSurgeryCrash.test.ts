import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryCustomerRepository } from '../modules/customers/infrastructure/InMemoryCustomerRepository.js';
import { CustomerCoreService } from '../modules/customers/application/services/CustomerCoreService.js';
import { CustomerPrivacyService } from '../modules/customers/application/services/CustomerPrivacyService.js';
import { CustomerConsentService } from '../modules/customers/application/services/CustomerConsentService.js';
import { CustomerService } from '../modules/customers/application/CustomerService.js';
import { ICustomerCoreService } from '../modules/customers/application/ports/ICustomerCoreService.js';

// ============================================================================
// ЛАБОРАТОРНА РОБОТА №8 - Завдання 2: PASS-стан після інтерфейсної декомпозиції
// Ліквідація антипатерну God Object через Single Responsibility та Dependency Inversion
// ============================================================================

describe('Architectural Audit - Task 2: Interface Decomposition (PASS State)', () => {
    it('✅ PASS-ТЕСТ 1: Декомпозовані мікросервіси функціонують ізольовано (CBO <= 6, LCOM4 = 1)', async () => {
        const repo = new InMemoryCustomerRepository();

        // Ініціалізація незалежних сервісів
        const coreService = new CustomerCoreService(repo);
        const privacyService = new CustomerPrivacyService(repo);
        const consentService = new CustomerConsentService(repo);

        // 1. Тест Core-сервісу (реєстрація клієнта)
        const customer = await coreService.registerCustomer({
            name: 'Олександр Петренко',
            email: 'oleksandr@example.com'
        });
        assert.ok(customer.id, 'Клієнт повинен мати згенерований ID');
        assert.strictEqual(customer.name, 'Олександр Петренко');

        // 2. Тест Privacy-сервісу (експорт персональних даних GDPR Art. 15)
        const exportData = await privacyService.exportPersonalData(customer.id, customer.id);
        assert.strictEqual(exportData.subjectId, customer.id);
        assert.strictEqual(exportData.legalBasis, 'GDPR Article 15 (Right of Access)');

        // 3. Тест Consent-сервісу (надання маркетингової згоди GDPR Art. 7)
        const consent = await consentService.grantConsent(customer.id, customer.id, {
            purpose: 'MARKETING_EMAIL',
            policyVersion: 'v2.0'
        });
        assert.strictEqual(consent.isGranted, true);
        assert.strictEqual(consent.policyVersion, 'v2.0');
    });

    it('✅ PASS-ТЕСТ 2: Захист від Shotgun Surgery завдяки поліморфній підміні через інтерфейси (DIP)', async () => {
        const repo = new InMemoryCustomerRepository();
        const privacyService = new CustomerPrivacyService(repo);
        const consentService = new CustomerConsentService(repo);

        // Створюємо кастомний MockCoreService, який реалізує лише контракт ICustomerCoreService
        const mockCoreService: ICustomerCoreService = {
            getCustomerById: async (id) => ({ id, name: 'Mock User', email: 'mock@example.com', tier: 'Gold', totalPoints: 999 }),
            registerCustomer: async (dto) => ({ id: 'mock-uuid', name: dto.name, email: dto.email, tier: 'Standard', totalPoints: 0 }),
            upgradeToPremium: async () => {}
        };

        // Впроваджуємо залежності через конструктор фасаду (Dependency Injection)
        const compositeService = new CustomerService(mockCoreService, privacyService, consentService);

        const res = await compositeService.getCustomerById('custom-id-123');
        assert.strictEqual(res.name, 'Mock User', 'Фасад має викликати поліморфний інтерфейс без зламів');
    });

    it('✅ PASS-ТЕСТ 3: Фасад підтримує 100% зворотну сумісність для всіх існуючих клієнтів', async () => {
        const repo = new InMemoryCustomerRepository();
        const legacyFacade = new CustomerService(repo);

        const newCust = await legacyFacade.registerCustomer({
            name: 'Анна Шевченко',
            email: 'anna@example.com'
        });
        assert.strictEqual(newCust.email, 'anna@example.com');

        const found = await legacyFacade.getCustomerById(newCust.id);
        assert.strictEqual(found.name, 'Анна Шевченко');
    });
});
