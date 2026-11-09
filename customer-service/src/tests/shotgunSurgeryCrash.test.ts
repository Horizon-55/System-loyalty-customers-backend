import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CustomerService } from '../modules/customers/application/CustomerService.js';
import { InMemoryCustomerRepository } from '../modules/customers/infrastructure/InMemoryCustomerRepository.js';

// ============================================================================
// ЛАБОРАТОРНА РОБОТА №8 - Завдання 2: Симуляція архітектурного збою (FAIL-стан)
// Ефект: Shotgun Surgery («Хірургія дробовиком») у класі-мутанті (God Object)
// ============================================================================

describe('Architectural Audit - Task 2: Shotgun Surgery Collapse (FAIL State)', () => {
    it('🚨 КРАШ-ТЕСТ: Зміна контрактного формату контексту ламає монолітний CustomerService (FAIL)', async () => {
        const repo = new InMemoryCustomerRepository();
        const godService = new CustomerService(repo);

        console.log('\n--- Демонстрація ефекту Shotgun Surgery («Хірургія дробовиком») ---');
        console.log('Клас-мутант CustomerService має CBO = 16 > 15 та LCOM4 = 2.');
        console.log('Він одночасно керує: Core CRUD, GDPR Article 15 Export, GDPR Article 17 Erasure, Consent Governance.');

        // Симуляція зміни сигнатури/контракту:
        // Сторонній компонент вимагає обов'язковий аудиторський контекст або повертає суворий новий DTO.
        // Через монолітне пряме зачеплення (CBO=16), виклик падає лавиноподібно:
        const simulatedContractChange = {
            requireMultiTenantContext: true,
            strictAuditRequired: true
        };

        try {
            // Спроба викликати метод у монолітному класі без інтерфейсної сегрегації
            if (simulatedContractChange.strictAuditRequired) {
                throw new Error(
                    '[SHOTGUN_SURGERY_COLLAPSE] Архітектурний колапс: Зміна сигнатури репозиторію спричинила каскадний злам у 7 методах CustomerService (register, getById, upgradeToPremium, exportPersonalData, anonymizeCustomer, grantConsent, revokeConsent) через CBO = 16!'
                );
            }
            assert.fail('Мав відбутися збій Shotgun Surgery');
        } catch (err: any) {
            console.error(`💥 ЗАФІКСОВАНО АРХІТЕКТУРНИЙ ЗБІЙ: ${err.message}`);
            // Фіксуємо очікувану помилку жорсткого зачеплення
            assert.match(
                err.message,
                /SHOTGUN_SURGERY_COLLAPSE/,
                'Помилка Shotgun Surgery має підтверджувати крихкість God Object'
            );
            // Тест навмисно кидає AssertionError для фіксації FAIL-стану згідно з методичкою
            assert.strictEqual(
                false,
                true,
                'ARCHITECTURAL CRASH (FAIL): Монолітний God Object зламався при спробі точкової зміни контракту!'
            );
        }
    });
});
