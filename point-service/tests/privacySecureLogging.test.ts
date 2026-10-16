import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PiiSanitizer } from '../../customer-service/src/common/logging/PiiSanitizer.ts';
import { SecureLogger, StructuredLog } from '../../customer-service/src/common/logging/SecureLogger.ts';

describe('Privacy Engineering (Lab 4) - Task 1: Secure Logging & PII Masking', () => {
    let capturedLogs: { entry: StructuredLog; rawJson: string }[] = [];
    let removeSink: () => void;

    const SENSITIVE_INPUTS = {
        rawEmail: 'alex.test@example.com',
        rawPhone: '+380501234567',
        rawPassword: 'SuperSecretP@ssword2026!',
        rawToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.syntheticTokenPayload'
    };

    beforeEach(() => {
        capturedLogs = [];
        removeSink = SecureLogger.addSink((entry, rawJson) => {
            capturedLogs.push({ entry, rawJson });
        });
    });

    afterEach(() => {
        if (removeSink) removeSink();
    });

    /**
     * Test 1: Plain text masking of direct PII (Email & Phone)
     */
    test('1. Позитивний тест: Маскує Email та Телефон у звичайному текстовому повідомленні', () => {
        const message = `Користувач ${SENSITIVE_INPUTS.rawEmail} зареєстрований із номером ${SENSITIVE_INPUTS.rawPhone}`;
        SecureLogger.info(message, undefined, 'corr-test-1');

        assert.equal(capturedLogs.length, 1);
        const log = capturedLogs[0];

        // 1. Оригінальні дані не повинні бути присутні у відкритому вигляді
        assert.ok(!log.rawJson.includes(SENSITIVE_INPUTS.rawEmail), 'Лог не повинен містити відкритий email');
        assert.ok(!log.rawJson.includes(SENSITIVE_INPUTS.rawPhone), 'Лог не повинен містити відкритий телефон');

        // 2. Повинні бути присутні коректно замасковані версії
        assert.ok(log.entry.message.includes('al**@example.com'), 'Email має бути частково замаскований (al**@example.com)');
        assert.ok(log.entry.message.includes('+380******67'), 'Телефон має бути частково замаскований (+380******67)');
        assert.equal(log.entry.correlationId, 'corr-test-1', 'Correlation ID повинен зберігатися для діагностики');
    });

    /**
     * Test 2: Structured DTO and nested object sanitization (Redaction of credentials)
     */
    test('2. Позитивний тест: Повністю редагує паролі/токени та маскує вкладений DTO', () => {
        const nestedDto = {
            userId: 'cust-synt-001',
            profile: {
                fullName: 'Олександр Тестовий',
                email: SENSITIVE_INPUTS.rawEmail,
                phoneNumber: SENSITIVE_INPUTS.rawPhone
            },
            security: {
                password: SENSITIVE_INPUTS.rawPassword,
                accessToken: SENSITIVE_INPUTS.rawToken,
                sessionSecret: 'very-secret-session-key'
            }
        };

        SecureLogger.info('User registration attempt', nestedDto, 'corr-test-2');

        assert.equal(capturedLogs.length, 1);
        const { entry, rawJson } = capturedLogs[0];

        // Повне редагування секретів
        assert.equal(entry.context?.security?.password, '[REDACTED]', 'Пароль повинен бути [REDACTED]');
        assert.equal(entry.context?.security?.accessToken, '[REDACTED]', 'AccessToken повинен бути [REDACTED]');
        assert.equal(entry.context?.security?.sessionSecret, '[REDACTED]', 'SessionSecret повинен бути [REDACTED]');

        // Часткове маскування вкладеного DTO
        assert.equal(entry.context?.profile?.email, 'al**@example.com', 'Вкладений email має бути замаскований');
        assert.equal(entry.context?.profile?.phoneNumber, '+380******67', 'Вкладений телефон має бути замаскований');
        assert.equal(entry.context?.userId, 'cust-synt-001', 'Нейтральний ID зберігається для трасування');

        // Перевірка всього JSON-рядка
        assert.ok(!rawJson.includes(SENSITIVE_INPUTS.rawPassword), 'JSON логу не повинен містити пароль');
        assert.ok(!rawJson.includes(SENSITIVE_INPUTS.rawToken), 'JSON логу не повинен містити токен');
    });

    /**
     * Test 3: Exception messages and Error instances
     */
    test('3. Позитивний тест: Маскує PII та секрети у повідомленнях помилок (Exceptions)', () => {
        const sensitiveError = new Error(`Database error for account ${SENSITIVE_INPUTS.rawEmail} with token=${SENSITIVE_INPUTS.rawToken}`);
        SecureLogger.error('Operation failed with exception', sensitiveError, 'corr-test-3');

        assert.equal(capturedLogs.length, 1);
        const { entry, rawJson } = capturedLogs[0];

        assert.equal(entry.level, 'ERROR');
        assert.ok(!rawJson.includes(SENSITIVE_INPUTS.rawEmail), 'Лог помилки не повинен містити відкритий email');
        assert.ok(!rawJson.includes(SENSITIVE_INPUTS.rawToken), 'Лог помилки не повинен містити відкритий токен');
        assert.ok(entry.context?.message?.includes('al**@example.com'));
        assert.ok(entry.context?.message?.includes('[REDACTED]'));
    });

    /**
     * Test 4: Privacy-safe security event audit
     */
    test('4. Позитивний тест: Security Audit лог фіксує подію без дублювання PII', () => {
        SecureLogger.securityAudit('PASSWORD_RESET_REQUESTED', 'cust-synt-001', 'SUCCESS', {
            targetEmail: SENSITIVE_INPUTS.rawEmail,
            ipAddress: '192.168.1.105'
        }, 'corr-audit-4');

        assert.equal(capturedLogs.length, 1);
        const { entry, rawJson } = capturedLogs[0];

        assert.equal(entry.level, 'SECURITY');
        assert.equal(entry.context?.subjectId, 'cust-synt-001');
        assert.equal(entry.context?.result, 'SUCCESS');
        assert.equal(entry.context?.targetEmail, 'al**@example.com');
        assert.ok(!rawJson.includes(SENSITIVE_INPUTS.rawEmail));
    });

    /**
     * Test 5: Negative Scenario — fails if ANY raw sensitive token leaks into output
     */
    test('5. Негативний сценарій: Автоматичне виявлення витоку (Assertion FAIL при несанкціонованому PII)', () => {
        // Забезпечуємо контрольний виклик логування через захищений інтерфейс
        SecureLogger.warn('Testing leak detector', {
            dto: {
                userEmail: SENSITIVE_INPUTS.rawEmail,
                userSecret: SENSITIVE_INPUTS.rawPassword
            }
        });

        const latestLog = capturedLogs[capturedLogs.length - 1];

        // Негативна верифікація: функція перевірки витоку
        const verifyNoLeaks = (serializedOutput: string, forbiddenValues: string[]) => {
            const leaked = forbiddenValues.filter(val => serializedOutput.includes(val));
            if (leaked.length > 0) {
                assert.fail(`[SECURITY LEAK DETECTED]: Лог містить відкриті sensitive-дані: ${leaked.join(', ')}`);
            }
        };

        // Перевіряємо, що жодне з заборонених значень не просочилося
        verifyNoLeaks(latestLog.rawJson, [
            SENSITIVE_INPUTS.rawEmail,
            SENSITIVE_INPUTS.rawPhone,
            SENSITIVE_INPUTS.rawPassword,
            SENSITIVE_INPUTS.rawToken
        ]);
    });
});
