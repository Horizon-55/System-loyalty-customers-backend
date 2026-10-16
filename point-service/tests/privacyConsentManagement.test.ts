import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { CustomerService } from '../../customer-service/src/modules/customers/application/CustomerService.ts';
import { InMemoryCustomerRepository } from '../../customer-service/src/modules/customers/infrastructure/InMemoryCustomerRepository.ts';
import { Customers } from '../../customer-service/src/modules/customers/domain/Customers.ts';
import { LoyaltyTier } from '../../customer-service/src/modules/customers/domain/LoyaltyTier.ts';
import { SecureLogger, StructuredLog } from '../../customer-service/src/common/logging/SecureLogger.ts';

describe('Privacy Engineering (Lab 4) - Task 4: Consent Management Engine & Policy Gate (GDPR Art. 7)', () => {
    let customerRepository: InMemoryCustomerRepository;
    let customerService: CustomerService;
    let capturedLogs: { entry: StructuredLog; rawJson: string }[] = [];
    let removeSink: () => void;

    const TEST_USER = {
        id: 'cust-synt-003-uuid',
        name: 'Марія Коваленко',
        email: 'maria.kovalenko@example.com',
        phone: '+380509876543'
    };

    const ATTACKER_ID = 'cust-synt-999-intruder';

    beforeEach(async () => {
        customerRepository = new InMemoryCustomerRepository();
        customerService = new CustomerService(customerRepository);

        // Початковий профіль користувача БЕЗ жодних згод
        const customer = new Customers(
            TEST_USER.id,
            TEST_USER.name,
            TEST_USER.email,
            LoyaltyTier.STANDART,
            500,
            TEST_USER.phone
        );

        await customerRepository.save(customer);

        capturedLogs = [];
        removeSink = SecureLogger.addSink((entry, rawJson) => {
            capturedLogs.push({ entry, rawJson });
        });
    });

    afterEach(() => {
        if (removeSink) removeSink();
    });

    /**
     * Test 1: Full Lifecycle: DENY -> GRANT -> ALLOW -> REVOKE -> DENY
     */
    test('1. Повний життєвий цикл згоди: DENY (початковий) -> GRANT -> ALLOW -> REVOKE -> DENY (негайне блокування)', async () => {
        // Етап 1: Початковий стан — спроба відправити маркетингову акцію без згоди
        const initialDispatch = await customerService.sendMarketingPromotion(
            TEST_USER.id,
            'Black_Friday_2026',
            'corr-consent-initial'
        );

        assert.equal(initialDispatch.executed, false, 'Дія НЕ повинна виконуватися без згоди');
        assert.equal(initialDispatch.status, 'DENIED');
        assert.equal(initialDispatch.reason, 'NO_CONSENT_RECORDED');

        // Етап 2: GRANT — Користувач надає згоду на маркетингові розсилки
        const grantedConsent = await customerService.grantConsent(
            TEST_USER.id,
            TEST_USER.id,
            {
                purpose: 'MARKETING_EMAIL',
                policyVersion: 'v2.0',
                source: 'checkout_checkbox'
            },
            'corr-consent-grant'
        );

        assert.equal(grantedConsent.purpose, 'MARKETING_EMAIL');
        assert.equal(grantedConsent.isGranted, true);
        assert.equal(grantedConsent.policyVersion, 'v2.0');
        assert.equal(grantedConsent.source, 'checkout_checkbox');
        assert.ok(grantedConsent.grantedAt);

        // Етап 3: ALLOW — Повторна дія тепер дозволена Policy Gate, побічний ефект зафіксовано
        const allowedDispatch = await customerService.sendMarketingPromotion(
            TEST_USER.id,
            'Black_Friday_2026',
            'corr-consent-allowed'
        );

        assert.equal(allowedDispatch.executed, true, 'Дія повинна виконатися після отримання згоди');
        assert.equal(allowedDispatch.status, 'ALLOWED');
        assert.equal(allowedDispatch.reason, 'PROMOTION_DISPATCHED_SUCCESSFULLY');
        assert.equal(allowedDispatch.campaignName, 'Black_Friday_2026');
        assert.equal(allowedDispatch.recipientEmail, TEST_USER.email);

        // Етап 4: REVOKE — Користувач відкликає згоду в налаштуваннях
        const revokedConsent = await customerService.revokeConsent(
            TEST_USER.id,
            TEST_USER.id,
            {
                purpose: 'MARKETING_EMAIL',
                source: 'account_privacy_settings'
            },
            'corr-consent-revoke'
        );

        assert.equal(revokedConsent.isGranted, false);
        assert.ok(revokedConsent.withdrawnAt, 'Мітка часу відкликання обов\'язкова');

        // Етап 5: DENY — Наступна дія негайно блокується Policy Gate без побічного ефекту
        const blockedDispatch = await customerService.sendMarketingPromotion(
            TEST_USER.id,
            'Spring_Sale_2026',
            'corr-consent-blocked'
        );

        assert.equal(blockedDispatch.executed, false, 'Дія повинна блокуватися після REVOKE');
        assert.equal(blockedDispatch.status, 'DENIED');
        assert.equal(blockedDispatch.reason, 'CONSENT_WITHDRAWN');
    });

    /**
     * Test 2: Purpose Specificity & Isolation (Згода на одну мету не дозволяє іншу)
     */
    test('2. Позитивний тест: Ізоляція мети (Purpose Specificity) — згода на MARKETING_EMAIL не дозволяє OPTIONAL_ANALYTICS', async () => {
        // Надаємо згоду ТІЛЬКИ на маркетинг
        await customerService.grantConsent(
            TEST_USER.id,
            TEST_USER.id,
            { purpose: 'MARKETING_EMAIL', policyVersion: 'v1.0' }
        );

        const policyGate = customerService.getPolicyGate();

        // Перевірка 1: Маркетинг дозволено
        const marketingDecision = await policyGate.checkConsent(TEST_USER.id, 'MARKETING_EMAIL');
        assert.equal(marketingDecision.isAllowed, true);
        assert.equal(marketingDecision.reason, 'CONSENT_ACTIVE');

        // Перевірка 2: Необов'язкова аналітика заборонена (ізоляція)
        const analyticsDecision = await policyGate.checkConsent(TEST_USER.id, 'OPTIONAL_ANALYTICS');
        assert.equal(analyticsDecision.isAllowed, false);
        assert.equal(analyticsDecision.reason, 'NO_CONSENT_RECORDED');

        // Перевірка 3: Профайлінг заборонено
        const profilingDecision = await policyGate.checkConsent(TEST_USER.id, 'PROFILING');
        assert.equal(profilingDecision.isAllowed, false);
        assert.equal(profilingDecision.reason, 'NO_CONSENT_RECORDED');
    });

    /**
     * Test 3: Evidentiary metadata & Consent History
     */
    test('3. Позитивний тест: Збереження доказів — версія політики, джерело та повна історія змін стану згоди', async () => {
        // 1. Надання v1.0
        await customerService.grantConsent(TEST_USER.id, TEST_USER.id, {
            purpose: 'OPTIONAL_ANALYTICS',
            policyVersion: 'v1.0',
            source: 'cookie_banner'
        });

        // 2. Відкликання
        await customerService.revokeConsent(TEST_USER.id, TEST_USER.id, {
            purpose: 'OPTIONAL_ANALYTICS',
            source: 'cookie_settings'
        });

        // 3. Повторне надання під нову версію v2.0
        await customerService.grantConsent(TEST_USER.id, TEST_USER.id, {
            purpose: 'OPTIONAL_ANALYTICS',
            policyVersion: 'v2.0',
            source: 'modal_prompt'
        });

        const storedCustomer = await customerRepository.findById(TEST_USER.id);
        const history = storedCustomer?.getConsentHistory() || [];

        assert.equal(history.length, 3, 'Історія повинна містити всі 3 операції');
        assert.equal(history[0].action, 'GRANT');
        assert.equal(history[0].policyVersion, 'v1.0');
        assert.equal(history[1].action, 'REVOKE');
        assert.equal(history[2].action, 'GRANT');
        assert.equal(history[2].policyVersion, 'v2.0');
        assert.equal(history[2].source, 'modal_prompt');
    });

    /**
     * Test 4: Idempotency of REVOKE and GRANT
     */
    test('4. Позитивний тест (Ідемпотентність): Повторний REVOKE не створює суперечливих станів', async () => {
        // Надаємо згоду
        await customerService.grantConsent(TEST_USER.id, TEST_USER.id, { purpose: 'MARKETING_EMAIL' });

        // Перший REVOKE
        const revoke1 = await customerService.revokeConsent(TEST_USER.id, TEST_USER.id, { purpose: 'MARKETING_EMAIL' });
        assert.equal(revoke1.isGranted, false);

        // Повторний REVOKE
        const revoke2 = await customerService.revokeConsent(TEST_USER.id, TEST_USER.id, { purpose: 'MARKETING_EMAIL' });
        assert.equal(revoke2.isGranted, false);

        const activeConsents = await customerService.getConsents(TEST_USER.id, TEST_USER.id);
        const marketingConsent = activeConsents.find(c => c.purpose === 'MARKETING_EMAIL');
        assert.equal(marketingConsent?.isGranted, false);
    });

    /**
     * Test 5: Authorization & Anti-IDOR for Consent Management
     */
    test('5. Негативний тест: Відхиляє спробу маніпуляції згодами іншого користувача (403 Forbidden)', async () => {
        await assert.rejects(
            async () => {
                await customerService.grantConsent(
                    TEST_USER.id,
                    ATTACKER_ID, // Спроба стороннього суб'єкта
                    { purpose: 'MARKETING_EMAIL' }
                );
            },
            (error: any) => {
                assert.equal(error.statusCode, 403);
                assert.ok(error.message.includes('Доступ заборонено'));
                return true;
            }
        );
    });
});
