import { CustomerChannelNotificationService } from "./CustomerChannelNotificationService.js";

/**
 * LEVEL 3 (Leaf Class - Baseline Inheritance Hell): PremiumLoyaltyEmailNotificationService
 * Depth of Inheritance Tree: DIT = 3 (Extreme Vertical Fragility DIT >= 3)
 * Lorenz-Kidd Metrics: Overridden Methods = 4, PIM = 7
 * Suffers from Fragile Base Class syndrome due to rigid vertical coupling.
 */
export class PremiumLoyaltyEmailNotificationService extends CustomerChannelNotificationService {
    protected override channelName: string = "PREMIUM_EMAIL";

    // OVERRIDDEN METHOD 1: Suppresses parent plain-text formatting and injects HTML branding
    public override formatTemplate(templateName: string, variables: Record<string, any>): string {
        const title = variables['title'] || 'Loyalty Reward';
        const points = variables['points'] || 0;
        return `<html><body><h1>[VIP Premium] ${title}</h1><p>Points earned: ${points}</p></body></html>`;
    }

    // OVERRIDDEN METHOD 2: Replaces parent generic socket delivery with SMTP mock
    public override async sendRawMessage(recipient: string, message: string): Promise<boolean> {
        if (!recipient.includes('@')) {
            throw new Error(`[PremiumLoyaltyEmailNotificationService] Invalid email: ${recipient}`);
        }
        console.log(`[SMTP Secure TLS] Sending VIP Email to ${recipient}: ${message}`);
        return true;
    }

    // OVERRIDDEN METHOD 3: Replaces parent console audit with encrypted compliance log
    public override logDeliveryAudit(recipient: string, status: string): void {
        console.log(`[VIP Compliance Audit] Encrypted log for ${recipient}: ${status}`);
    }

    // OVERRIDDEN METHOD 4: Completely redefines dispatch workflow to add anti-fraud validation
    public override async dispatch(recipient: string, templateName: string, variables: Record<string, any>): Promise<boolean> {
        if (!this.validateChannelConfig()) {
            throw new Error("Premium Email channel is uninitialized");
        }
        const body = this.formatTemplate(templateName, variables);
        const sent = await this.sendRawMessage(recipient, body);
        this.logDeliveryAudit(recipient, sent ? "VIP_DELIVERED" : "VIP_UNDELIVERED");
        return sent;
    }
}
