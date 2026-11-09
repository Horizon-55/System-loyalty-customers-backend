/**
 * LEVEL 1 (Base Class): BaseNotificationService
 * Depth of Inheritance Tree: DIT = 1
 * Foundational infrastructure class for message formatting and delivery.
 */
export class BaseNotificationService {
    protected isConfigured: boolean = true;
    protected channelName: string = "GENERIC_CHANNEL";

    public validateChannelConfig(): boolean {
        return this.isConfigured;
    }

    public formatTemplate(templateName: string, variables: Record<string, any>): string {
        let content = `[Template: ${templateName}]`;
        for (const [key, val] of Object.entries(variables)) {
            content += ` ${key}=${val}`;
        }
        return content;
    }

    public async sendRawMessage(recipient: string, message: string): Promise<boolean> {
        console.log(`[BaseNotificationService] Sending to ${recipient}: ${message}`);
        return true;
    }

    public logDeliveryAudit(recipient: string, status: string): void {
        console.log(`[BaseNotificationService Audit] Recipient: ${recipient}, Status: ${status}`);
    }

    public async dispatch(recipient: string, templateName: string, variables: Record<string, any>): Promise<boolean> {
        if (!this.validateChannelConfig()) {
            throw new Error(`Channel ${this.channelName} is not configured.`);
        }
        const body = this.formatTemplate(templateName, variables);
        const sent = await this.sendRawMessage(recipient, body);
        this.logDeliveryAudit(recipient, sent ? "SENT" : "FAILED");
        return sent;
    }
}
