import { BaseNotificationService } from "./BaseNotificationService.js";
import { CustomerChannelNotificationService } from "./CustomerChannelNotificationService.js";
import { INotificationDeliveryEngine } from "./ports/INotificationDeliveryEngine.js";

/**
 * REFACTORED PASS STATE: PremiumLoyaltyEmailNotificationService
 * Pattern: Replace Inheritance with Composition (GoF: Favor object composition over class inheritance)
 * Depth of Inheritance Tree: DIT = 1 (Down from DIT = 3)
 * Lorenz-Kidd Metrics: Overridden Methods = 0 (Down from 4), PIM = 3
 * 
 * Instead of extending fragile base classes, this service encapsulates
 * delivery engines as private fields injected via constructor (Dependency Injection).
 */
export class PremiumLoyaltyEmailNotificationService {
    private readonly channelName: string = "PREMIUM_EMAIL";
    private readonly deliveryEngine: INotificationDeliveryEngine;
    private readonly channelRouter: CustomerChannelNotificationService;

    constructor(
        deliveryEngine?: INotificationDeliveryEngine,
        channelRouter?: CustomerChannelNotificationService
    ) {
        // Композиція об'єктів через Dependency Injection замість успадкування
        this.deliveryEngine = deliveryEngine || new BaseNotificationService();
        this.channelRouter = channelRouter || new CustomerChannelNotificationService();
    }

    public formatVipEmailBody(variables: Record<string, any>): string {
        const title = variables['title'] || 'Loyalty Reward';
        const points = variables['points'] || 0;
        return `<html><body><h1>[VIP Premium] ${title}</h1><p>Points earned: ${points}</p></body></html>`;
    }

    /**
     * Відправка VIP-повідомлення через делегування внутрішньому компоненту-помічнику
     * Жодних перевизначень методів предка (Overridden Methods = 0)
     */
    public async sendVipEmail(
        customerId: string, 
        recipientEmail: string, 
        variables: Record<string, any>
    ): Promise<boolean> {
        if (!recipientEmail.includes('@')) {
            throw new Error(`[PremiumLoyaltyEmailNotificationService] Invalid email: ${recipientEmail}`);
        }

        if (!this.deliveryEngine.validateChannelConfig()) {
            throw new Error("Delivery engine is not configured");
        }

        // Збагачення контексту через делегування помічнику
        const enriched = this.channelRouter.enrichCustomerContext(customerId, variables);
        const emailHtml = this.formatVipEmailBody(enriched);

        // Делегування фізичної відправки об'єкту доставки
        const sent = await this.deliveryEngine.sendRawMessage(recipientEmail, emailHtml);
        this.deliveryEngine.logDeliveryAudit(recipientEmail, sent ? "VIP_DELIVERED" : "VIP_UNDELIVERED");

        return sent;
    }

    public getChannelInfo(): { channel: string; dit: number; overriddenMethods: number } {
        return {
            channel: this.channelName,
            dit: 1, // Базовий мінімум (жодного успадкування)
            overriddenMethods: 0
        };
    }
}
