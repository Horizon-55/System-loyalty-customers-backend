import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { CustomerService } from '../../customer-service/src/modules/customers/application/CustomerService.ts';
import { InMemoryCustomerRepository } from '../../customer-service/src/modules/customers/infrastructure/InMemoryCustomerRepository.ts';
import { Customers } from '../../customer-service/src/modules/customers/domain/Customers.ts';
import { LoyaltyTier } from '../../customer-service/src/modules/customers/domain/LoyaltyTier.ts';
import { SecureLogger, StructuredLog } from '../../customer-service/src/common/logging/SecureLogger.ts';

describe('Privacy Engineering (Lab 4) - Task 3: Right to Erasure & Anonymization Workflow (GDPR Art. 17)', () => {
    let customerRepository: InMemoryCustomerRepository;
    let customerService: CustomerService;
    let capturedLogs: { entry: StructuredLog; rawJson: string }[] = [];
    let removeSink: () => void;

    const INITIAL_USER = {
        id: 'cust-synt-002-uuid',
        name: 'Іван Петренко',
        email: 'ivan.petrenko@example.com',
        phone: '+380671112233'
    };

    const ATTACKER_ID = 'cust-synt-999-intruder';

    beforeEach(async () => {
        customerRepository = new InMemoryCustomerRepository();
        customerService = new CustomerService(customerRepository);

        // Створюємо профіль із пов'язаними бізнес-записами (транзакції балів, згоди, налаштування)
        const customer = new Customers(
            INITIAL_USER.id,
            INITIAL_USER.name,
            INITIAL_USER.email,
            LoyaltyTier.STANDART,
            0,
            INITIAL_USER.phone,
            { preferredLanguage: 'uk-UA', notificationsEnabled: true, theme: 'light' }
        );

        // Нараховуємо 2 транзакції балів (фінансовий леджер)
        customer.addPoints(1000, 'Покупка електроніки');
        customer.addPoints(1500, 'Річний бонус активності');

        // Додаємо дві згоди
        customer.setConsent({
            userId: INITIAL_USER.id,
            purpose: 'MARKETING_EMAIL',
            isGranted: true,
            policyVersion: 'v1.0',
            grantedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'checkout_consent_checkbox'
        });
        customer.setConsent({
            userId: INITIAL_USER.id,
            purpose: 'OPTIONAL_ANALYTICS',
            isGranted: true,
            policyVersion: 'v1.0',
            grantedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'cookie_banner'
        });

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
     * Test 1: Full Anonymization & Referential Integrity Preservation
     */
    test('1. Позитивний тест: Незворотна анонімізація PII зі збереженням референційної цілісності фінансових балів (Retention Rule)', async () => {
        const result = await customerService.anonymizeCustomer(
            INITIAL_USER.id,
            INITIAL_USER.id,
            'corr-erasure-1'
        );

        assert.equal(result.subjectId, INITIAL_USER.id);
        assert.equal(result.status, 'ANONYMIZED');
        assert.ok(result.retainedEntities.includes('loyalty_points_ledger'));
        assert.ok(result.purgedEntities.includes('profile_pii'));

        // Перевірка стану у сховищі (БД)
        const storedCustomer = await customerRepository.findById(INITIAL_USER.id);
        assert.ok(storedCustomer, 'Запис суб\'єкта повинен залишатися для збереження зв\'язків');

        // 1. PII видалено / незворотно знеособлено
        assert.equal(storedCustomer.getName(), 'Anonymous User', 'Ім\'я замінено на анонімне');
        assert.equal(storedCustomer.getEmail(), `deleted_${INITIAL_USER.id}@anon.local`, 'Email замінено на унікальний синтетичний');
        assert.equal(storedCustomer.getPhone(), undefined, 'Телефон повністю вилучено');
        assert.equal(storedCustomer.getConsents().length, 0, 'Усі згоди вилучено (purged)');
        assert.equal(storedCustomer.getSettings().notificationsEnabled, false, 'Сповіщення примусово вимкнено');

        // 2. Референційна цілісність збережена (Retention rule):
        assert.equal(storedCustomer.getTotalPoints(), 2500, 'Баланс балів збережено для бізнес-звітності');
        assert.equal(storedCustomer.getPointsHistory().length, 2, 'Історія транзакцій збережена без orphan rows');
        assert.equal(storedCustomer.getTier(), LoyaltyTier.VIP, 'Рівень збережено');
    });

    /**
     * Test 2: Idempotency (Repeat call handling)
     */
    test('2. Позитивний тест (Ідемпотентність): Повторний запуск повертає ALREADY_ANONYMIZED без помилок чи спотворення даних', async () => {
        // Перший запуск
        await customerService.anonymizeCustomer(INITIAL_USER.id, INITIAL_USER.id, 'corr-erasure-first');

        // Другий (повторний) запуск
        const repeatResult = await customerService.anonymizeCustomer(
            INITIAL_USER.id,
            INITIAL_USER.id,
            'corr-erasure-repeat'
        );

        assert.equal(repeatResult.status, 'ALREADY_ANONYMIZED');
        assert.equal(repeatResult.subjectId, INITIAL_USER.id);

        const storedCustomer = await customerRepository.findById(INITIAL_USER.id);
        assert.ok(storedCustomer?.isAnonymized());
        assert.equal(storedCustomer?.getName(), 'Anonymous User');
    });

    /**
     * Test 3: Anti-Unauthorized Actor Check
     */
    test('3. Негативний тест: Відхиляє спробу видалення чужого профілю стороннім користувачем (403 Forbidden)', async () => {
        await assert.rejects(
            async () => {
                await customerService.anonymizeCustomer(
                    INITIAL_USER.id,
                    ATTACKER_ID, // Спроба стороннього втручання
                    'corr-unauthorized-erasure'
                );
            },
            (error: any) => {
                assert.equal(error.statusCode, 403);
                assert.ok(error.message.includes('Доступ заборонено'));
                return true;
            }
        );

        // Перевіряємо, що дані користувача НЕ постраждали
        const storedCustomer = await customerRepository.findById(INITIAL_USER.id);
        assert.equal(storedCustomer?.getName(), INITIAL_USER.name, 'Дані користувача не повинні змінитися при відхиленому запиті');
    });

    /**
     * Test 4: Missing User Handling
     */
    test('4. Негативний тест: Повертає 404 Not Found для неіснуючого суб\'єкта', async () => {
        await assert.rejects(
            async () => {
                await customerService.anonymizeCustomer(
                    'non-existent-subject-id',
                    'non-existent-subject-id',
                    'corr-missing-erasure'
                );
            },
            (error: any) => {
                assert.equal(error.statusCode, 404);
                return true;
            }
        );
    });

    /**
     * Test 5: Privacy-Safe Audit Event Verification (No PII residual in logs)
     */
    test('5. Позитивний тест: Audit log фіксує лише подію анонімізації, БЕЗ копіювання видалених PII', async () => {
        await customerService.anonymizeCustomer(
            INITIAL_USER.id,
            INITIAL_USER.id,
            'corr-audit-erasure'
        );

        const auditLog = capturedLogs.find(l => l.entry.message.includes('ANONYMIZE_SUBJECT_COMPLETED'));
        assert.ok(auditLog, 'Подія анонімізації має бути зафіксована у security-аудиті');
        assert.equal(auditLog.entry.level, 'SECURITY');
        assert.equal(auditLog.entry.context?.subjectId, INITIAL_USER.id);
        assert.equal(auditLog.entry.context?.status, 'ANONYMIZED');

        // Переконуємося, що в сирому тексті логу НЕМАЄ вихідного імені, email або телефону
        assert.ok(!auditLog.rawJson.includes(INITIAL_USER.name), 'Audit log не повинен зберігати видалене ім\'я');
        assert.ok(!auditLog.rawJson.includes(INITIAL_USER.email), 'Audit log не повинен зберігати видалений email');
        assert.ok(!auditLog.rawJson.includes(INITIAL_USER.phone), 'Audit log не повинен зберігати видалений телефон');
    });
});
