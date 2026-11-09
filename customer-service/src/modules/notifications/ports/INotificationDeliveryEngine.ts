/**
 * Interface: INotificationDeliveryEngine
 * Decouples transport protocol delivery from domain notification composition.
 */
export interface INotificationDeliveryEngine {
    sendRawMessage(recipient: string, message: string): Promise<boolean>;
    logDeliveryAudit(recipient: string, status: string): void;
    validateChannelConfig(): boolean;
}
