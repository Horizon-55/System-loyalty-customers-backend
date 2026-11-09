import { BaseNotificationService } from "./BaseNotificationService.js";

/**
 * LEVEL 2 (Intermediate Class): CustomerChannelNotificationService
 * Depth of Inheritance Tree: DIT = 2
 * Extends BaseNotificationService adding customer-specific routing.
 */
export class CustomerChannelNotificationService extends BaseNotificationService {
    protected override channelName: string = "CUSTOMER_PORTAL";

    public override validateChannelConfig(): boolean {
        return super.validateChannelConfig() && this.channelName.length > 0;
    }

    public enrichCustomerContext(customerId: string, variables: Record<string, any>): Record<string, any> {
        return {
            ...variables,
            customerId,
            timestamp: new Date().toISOString()
        };
    }

    public async sendCustomerNotification(
        customerId: string, 
        recipient: string, 
        templateName: string, 
        variables: Record<string, any>
    ): Promise<boolean> {
        const enriched = this.enrichCustomerContext(customerId, variables);
        return this.dispatch(recipient, templateName, enriched);
    }
}
