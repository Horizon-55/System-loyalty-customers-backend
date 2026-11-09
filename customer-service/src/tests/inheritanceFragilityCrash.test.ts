import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BaseNotificationService } from '../modules/notifications/BaseNotificationService.js';
import { CustomerChannelNotificationService } from '../modules/notifications/CustomerChannelNotificationService.js';
import { PremiumLoyaltyEmailNotificationService } from '../modules/notifications/PremiumLoyaltyEmailNotificationService.js';
import { INotificationDeliveryEngine } from '../modules/notifications/ports/INotificationDeliveryEngine.js';

// ============================================================================
// ЛАБОРАТОРНА РОБОТА №8 - Завдання 3: PASS-стан після рефакторингу
// Патерн: Replace Inheritance with Composition (GoF)
// Ліквідація антипатерну Inheritance Hell (DIT знижено з 3 до 1, Overridden = 0)
// ============================================================================

describe('Architectural Audit - Task 3: Replace Inheritance with Composition (PASS State)', () => {
    it('✅ PASS-ТЕСТ 1: Глибина успадкування впала до DIT = 1, а Overridden Methods = 0', () => {
        const service = new PremiumLoyaltyEmailNotificationService();
        const info = service.getChannelInfo();

        console.log('\n--- Отримані верифіковані результати рефакторингу ієрархії (PASS) ---');
        console.log(`Початковий DIT (ДО)        : 3 (Крихка вертикальна ієрархія)`);
        console.log(`Поточний DIT (ПІСЛЯ)       : ${info.dit} (Абсолютна безпека DIT = 1)`);
        console.log(`Кількість Overridden методів: ${info.overriddenMethods} (Повна ліквідація перевизначень)`);

        assert.strictEqual(info.dit, 1, 'DIT має дорівнювати 1 після видалення extends');
        assert.strictEqual(info.overriddenMethods, 0, 'Кількість Overridden методів має бути рівною 0');
    });

    it('✅ PASS-ТЕСТ 2: Успішна відправка VIP-повідомлення через делегування помічникам', async () => {
        const service = new PremiumLoyaltyEmailNotificationService();

        const success = await service.sendVipEmail(
            'cust-vip-777',
            'vip.client@example.com',
            { title: 'Річний бонус Platinum', points: 5000 }
        );

        assert.strictEqual(success, true, 'Повідомлення має бути успішно доставлене через композицію');
    });

    it('✅ PASS-ТЕСТ 3: Повна ізоляція від змін базового класу завдяки Dependency Injection (DIP)', async () => {
        // Моделюємо кастомний Delivery Engine (змінений базовий транспорт)
        const mockDeliveryEngine: INotificationDeliveryEngine = {
            sendRawMessage: async (recipient, msg) => {
                console.log(`[Mock Isolated Engine] Delivered to ${recipient}`);
                return true;
            },
            logDeliveryAudit: (recipient, status) => {},
            validateChannelConfig: () => true
        };

        // Впроваджуємо змінений рушій через конструктор без жодного збою компіляції чи наслідування!
        const isolatedService = new PremiumLoyaltyEmailNotificationService(mockDeliveryEngine);

        const result = await isolatedService.sendVipEmail(
            'cust-isolated-1',
            'test@isolated.local',
            { title: 'Isolated Test', points: 100 }
        );

        assert.strictEqual(result, true, 'Сервіс працює стабільно навіть при повній заміні транспорту!');
    });
});
