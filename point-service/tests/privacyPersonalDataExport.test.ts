import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { CustomerService } from '../../customer-service/src/modules/customers/application/CustomerService.ts';
import { InMemoryCustomerRepository } from '../../customer-service/src/modules/customers/infrastructure/InMemoryCustomerRepository.ts';
import { Customers } from '../../customer-service/src/modules/customers/domain/Customers.ts';
import { LoyaltyTier } from '../../customer-service/src/modules/customers/domain/LoyaltyTier.ts';
import { SecureLogger, StructuredLog } from '../../customer-service/src/common/logging/SecureLogger.ts';

describe('Privacy Engineering (Lab 4) - Task 2: Right of Access & Personal Data Export (GDPR Art. 15)', () => {
    let customerRepository: InMemoryCustomerRepository;
    let customerService: CustomerService;
    let capturedLogs: { entry: StructuredLog; rawJson: string }[] = [];
    let removeSink: () => void;

    const TEST_SUBJECT = {
        id: 'cust-synt-001-uuid',
        name: 'Олександр Тестовий',
        email: 'alex.test@example.com',
        phone: '+380501234567'
    };

    const ATTACKER_ID = 'cust-synt-999-attacker';

    beforeEach(async () => {
        customerRepository = new InMemoryCustomerRepository();
        customerService = new CustomerService(customerRepository);

        // Підготовка тестового суб'єкта з усіма 4 категоріями персональних даних
        const customer = new Customers(
            TEST_SUBJECT.id,
            TEST_SUBJECT.name,
            TEST_SUBJECT.email,
            LoyaltyTier.STANDART,
            0,
            TEST_SUBJECT.phone,
            { preferredLanguage: 'uk-UA', notificationsEnabled: true, theme: 'dark' }
        );

        // Нараховуємо бали для створення транзакційної історії (Loyalty Ledger)
        customer.addPoints(1200, 'Вітальний бонус за реєстрацію');

        // Додаємо згоду користувача (Consent record)
        customer.setConsent({
            userId: TEST_SUBJECT.id,
            purpose: 'MARKETING_EMAIL',
            isGranted: true,
            policyVersion: 'v1.0',
            grantedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'web_portal_registration'
        });

        await customerRepository.save(customer);

        // Перехоплення логів для аудиту витоку
        capturedLogs = [];
        removeSink = SecureLogger.addSink((entry, rawJson) => {
            capturedLogs.push({ entry, rawJson });
        });
    });

    afterEach(() => {
        if (removeSink) removeSink();
    });

    /**
     * Test 1: Full structured personal data export for authenticated subject
     */
    test('1. Позитивний тест: Агрегує всі 4 категорії даних (profile, loyalty, settings, consents) для автентифікованого суб\'єкта', async () => {
        const exportResult = await customerService.exportPersonalData(
            TEST_SUBJECT.id,
            TEST_SUBJECT.id, // authenticatedUserId === subjectId
            'corr-export-1'
        );

        assert.ok(exportResult, 'Результат експорту повинен бути сформований');
        assert.equal(exportResult.version, '1.0');
        assert.equal(exportResult.subjectId, TEST_SUBJECT.id);
        assert.equal(exportResult.legalBasis, 'GDPR Article 15 (Right of Access)');
        assert.ok(exportResult.exportedAt);

        // Секція 1: Профіль
        assert.equal(exportResult.categories.profile.name, TEST_SUBJECT.name);
        assert.equal(exportResult.categories.profile.email, TEST_SUBJECT.email);
        assert.equal(exportResult.categories.profile.phone, TEST_SUBJECT.phone);

        // Секція 2: Бали лояльності та історія
        assert.equal(exportResult.categories.loyalty.tier, LoyaltyTier.VIP);
        assert.equal(exportResult.categories.loyalty.totalPoints, 1200);
        assert.equal(exportResult.categories.loyalty.history.length, 1);
        assert.equal(exportResult.categories.loyalty.history[0].points, 1200);

        // Секція 3: Налаштування
        assert.equal(exportResult.categories.settings.preferredLanguage, 'uk-UA');
        assert.equal(exportResult.categories.settings.theme, 'dark');

        // Секція 4: Згоди
        assert.equal(exportResult.categories.consents.length, 1);
        assert.equal(exportResult.categories.consents[0].purpose, 'MARKETING_EMAIL');
        assert.equal(exportResult.categories.consents[0].isGranted, true);
    });

    /**
     * Test 2: Data Minimization & Omission of Security Fields
     */
    test('2. Позитивний тест: Принцип мінімізації — відсутність password/tokens у категоріях даних та наявність documentedOmissions', async () => {
        const exportResult = await customerService.exportPersonalData(
            TEST_SUBJECT.id,
            TEST_SUBJECT.id,
            'corr-export-2'
        );

        const serializedCategories = JSON.stringify(exportResult.categories).toLowerCase();

        // Перевіряємо відсутність security-чутливих полів у фактичних даних користувача
        assert.ok(!serializedCategories.includes('password'), 'Секції даних не повинні містити password чи password_hash');
        assert.ok(!serializedCategories.includes('sessionsecret'), 'Секції даних не повинні містити sessionSecret');
        assert.ok(!serializedCategories.includes('token'), 'Секції даних не повинні містити auth-токенів');
        assert.ok(!serializedCategories.includes('antifraud'), 'Секції даних не повинні містити внутрішніх антифрод-полів');

        // Перевіряємо наявність задекларованих виключень (documented omissions)
        assert.ok(exportResult.documentedOmissions.length >= 4);
        assert.ok(exportResult.documentedOmissions.includes('password_hash'));
        assert.ok(exportResult.documentedOmissions.includes('access_and_refresh_tokens'));
        assert.ok(exportResult.documentedOmissions.includes('session_secrets'));
    });

    /**
     * Test 3: Anti-IDOR Authorization Check (Negative Scenario)
     */
    test('3. Негативний тест (Anti-IDOR): Відхиляє спробу доступу стороннього користувача (403 Forbidden)', async () => {
        await assert.rejects(
            async () => {
                await customerService.exportPersonalData(
                    TEST_SUBJECT.id,
                    ATTACKER_ID, // Спроба доступу до чужого профілю!
                    'corr-idor-attack'
                );
            },
            (error: any) => {
                assert.equal(error.statusCode, 403);
                assert.ok(error.message.includes('Доступ заборонено'));
                return true;
            }
        );

        // Перевіряємо, що факт атаки зареєстровано в security логах із статусом DENIED
        const deniedAuditLog = capturedLogs.find(l => l.entry.message.includes('PERSONAL_DATA_EXPORT_ATTEMPT'));
        assert.ok(deniedAuditLog, 'Спроба IDOR повинна бути зафіксована у security-аудиті');
        assert.equal(deniedAuditLog.entry.context?.result, 'DENIED');
        assert.equal(deniedAuditLog.entry.context?.reason, 'IDOR_VIOLATION');
    });

    /**
     * Test 4: Missing User Handling (Negative Scenario)
     */
    test('4. Негативний тест: Повертає 404 Not Found для неіснуючого суб\'єкта без витоку даних', async () => {
        await assert.rejects(
            async () => {
                await customerService.exportPersonalData(
                    'non-existent-user-id',
                    'non-existent-user-id',
                    'corr-missing-user'
                );
            },
            (error: any) => {
                assert.equal(error.statusCode, 404);
                return true;
            }
        );
    });

    /**
     * Test 5: Verify privacy-safe audit logging during export (No full JSON dump in logs)
     */
    test('5. Позитивний тест: Логи під час експорту містять лише факт операції, без повного JSON-дампу', async () => {
        await customerService.exportPersonalData(
            TEST_SUBJECT.id,
            TEST_SUBJECT.id,
            'corr-export-log-check'
        );

        // Знаходимо лог успішного завершення експорту
        const completionLog = capturedLogs.find(l => l.entry.message.includes('PERSONAL_DATA_EXPORT_COMPLETED'));
        assert.ok(completionLog, 'Подія завершення експорту має бути в логах');
        assert.equal(completionLog.entry.level, 'SECURITY');
        assert.equal(completionLog.entry.context?.subjectId, TEST_SUBJECT.id);
        assert.equal(completionLog.entry.context?.result, 'SUCCESS');

        // Перевіряємо, що в сирому тексті логу НЕМАЄ повного тіла експорту або несанкціонованого PII
        assert.ok(!completionLog.rawJson.includes('documentedOmissions'), 'Лог не повинен дублювати тіло відповіді експорту');
        assert.ok(!completionLog.rawJson.includes('notificationsEnabled'), 'Лог не повинен містити секцію налаштувань');
    });
});
