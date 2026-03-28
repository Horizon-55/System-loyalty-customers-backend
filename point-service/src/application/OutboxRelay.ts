import { OutboxEventModel } from '../infrastructure/database/OutboxEvent.js';
import { RabbitMQPublisher } from '../infrastructure/rabbitmq/RabbitMQPublisher.js';

export class OutboxRelay {
  constructor(private readonly publisher: RabbitMQPublisher) {}

  // Запускаємо Polling кожні 5 секунд
  public start(): void {
    setInterval(async () => {await this.processOutbox();}, 5000);
    console.log('[OutboxRelay] Фоновий процес запущено (Polling кожні 5 сек)');
  }

  private async processOutbox(): Promise<void> {
    try {
      // 1. Шукаємо всі події, які ще НЕ відправлені в брокер
      const pendingEvents = await OutboxEventModel.find({ isProcessed: false });

      if (pendingEvents.length === 0) return; // Немає нових подій - нічого не робимо

      console.log(`[OutboxRelay] Знайдено ${pendingEvents.length} необроблених подій. Відправляємо...`);

      // 2. Проходимося по кожній події
      for (const event of pendingEvents) {
        // Формуємо структуру JSON для брокера
        const messagePayload = {
          eventId: event._id,
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          payload: event.payload,
          timestamp: event.createdAt
        };

        // 3. Відправляємо в RabbitMQ
        const isPublished = await this.publisher.publishEvent(messagePayload);

        // 4. Якщо відправка успішна — позначаємо як оброблене в базі
        if (isPublished) {
          event.isProcessed = true;
          await event.save();
          console.log(`[OutboxRelay] Подію ${event._id} успішно доставлено в RabbitMQ!`);
        }
      }
    } catch (error) {
      console.error('[OutboxRelay] Помилка під час обробки Outbox:', error);
    }
  }
}