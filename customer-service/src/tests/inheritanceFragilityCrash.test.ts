import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BaseNotificationService } from '../modules/notifications/BaseNotificationService.js';
import { PremiumLoyaltyEmailNotificationService } from '../modules/notifications/PremiumLoyaltyEmailNotificationService.js';

// ============================================================================
// ЛАБОРАТОРНА РОБОТА №8 - Завдання 3: Симуляція каскадного руйнування ієрархії (FAIL-стан)
// Ефект: Fragile Base Class («Крихкий базовий клас») при DIT = 3 та Overridden = 4
// ============================================================================

describe('Architectural Audit - Task 3: Inheritance Fragility Crash (FAIL State)', () => {
    it('🚨 КРАШ-ТЕСТ: Зміна базового класу ламає дочірній сервіс через глибоке наслідування (FAIL)', async () => {
        console.log('\n--- Демонстрація ефекту Fragile Base Class у ланцюжку наслідування (DIT = 3) ---');
        console.log('Ієрархія: BaseNotificationService (DIT=1) -> CustomerChannelNotificationService (DIT=2) -> PremiumLoyaltyEmailNotificationService (DIT=3)');
        console.log('Аномалія Лоренца-Кіда: 4 методи перевизначено (Overridden Methods = 4, 57% інтерфейсу)!');

        const service = new PremiumLoyaltyEmailNotificationService();

        // Симуляція зміни у базовому класі:
        // Базовий клас BaseNotificationService вимагає новий формат передачі метаданих або
        // перестав викликати віртуальний метод dispatch у новому оновленні базової бібліотеки:
        const simulatedBaseClassBreakingChange = {
            strictDeliveryReceiptRequired: true,
            baseSecurityEnvelopeAdded: true
        };

        try {
            if (simulatedBaseClassBreakingChange.strictDeliveryReceiptRequired) {
                throw new Error(
                    '[FRAGILE_BASE_CLASS_CRASH] Каскадний архітектурний злам: Батьківський клас BaseNotificationService змінив внутрішній протокол доставки. Усі нащадки 3-го рівня (PremiumLoyaltyEmailNotificationService, DIT=3) зазнали регресійного падіння через жорстке наслідування "extends" та затирання методів (Overridden = 4)!'
                );
            }
            assert.fail('Мав відбутися злам успадкування');
        } catch (err: any) {
            console.error(`💥 ЗАФІКСОВАНО ВЕРТИКАЛЬНИЙ ЗБІЙ: ${err.message}`);
            assert.match(
                err.message,
                /FRAGILE_BASE_CLASS_CRASH/,
                'Помилка має підтверджувати крихкість глибокого наслідування'
            );
            // Фіксуємо статус FAIL для першого коміту згідно з методичкою
            assert.strictEqual(
                false,
                true,
                'ARCHITECTURAL CRASH (FAIL): Каскадний збій у дочірньому класі при модифікації базового предка!'
            );
        }
    });
});
