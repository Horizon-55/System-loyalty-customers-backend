/**
 * Value Object: TransactionContext
 * Encapsulates transactional metadata, customer routing, and audit channel classification.
 * Guarantees immutability and validates invariants at construction time.
 */

export type SalesChannel = 'MOBILE_APP' | 'WEB_PORTAL' | 'IN_STORE';

export class TransactionContext {
    public readonly customerId: string;
    public readonly orderId: string;
    public readonly correlationId: string;
    public readonly channel: SalesChannel;
    public readonly auditTag: string;

    constructor(
        customerId: string,
        orderId: string,
        channel: SalesChannel = 'WEB_PORTAL',
        correlationId?: string
    ) {
        if (!customerId || customerId.trim().length === 0) {
            throw new Error('[TransactionContext] customerId не може бути порожнім.');
        }
        if (!orderId || orderId.trim().length === 0) {
            throw new Error('[TransactionContext] orderId не може бути порожнім.');
        }

        const validChannels: SalesChannel[] = ['MOBILE_APP', 'WEB_PORTAL', 'IN_STORE'];
        if (!validChannels.includes(channel)) {
            throw new Error(`[TransactionContext] Непідтримуваний канал продажу: ${channel}`);
        }

        this.customerId = customerId.trim();
        this.orderId = orderId.trim();
        this.correlationId = (correlationId && correlationId.trim().length > 0)
            ? correlationId.trim()
            : `corr-${Date.now()}`;
        this.channel = channel;

        // Капсуляція логіки вибору аудиторського тегу у Value Object замість if-else у бізнес-сервісі
        this.auditTag = channel === 'MOBILE_APP' ? 'DIGITAL' : 'IN_STORE';

        // Забезпечення принципу незмінності
        Object.freeze(this);
    }
}

