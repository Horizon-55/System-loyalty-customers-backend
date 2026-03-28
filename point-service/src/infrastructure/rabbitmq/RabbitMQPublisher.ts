import amqp, { ChannelModel, Channel } from 'amqplib';

export class RabbitMQPublisher {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly queueName = 'loyalty_events_queue'; // Назва нашої черги

  public async connect(): Promise<void> {
    try {
      // Підключаємося до RabbitMQ (дані за замовчуванням з нашого docker-compose)
      const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
      this.connection = await amqp.connect(rabbitUrl);
      this.channel = await this.connection.createChannel();
      
      // Створюємо чергу, якщо її ще немає (durable: true означає, що черга переживе перезапуск брокера)
      await this.channel.assertQueue(this.queueName, { durable: true });
      console.log(`[RabbitMQ] Успішно підключено. Черга: ${this.queueName}`);
    } catch (error) {
      console.error('[RabbitMQ] Помилка підключення:', error);
    }
  }

  public async publishEvent(eventData: any): Promise<boolean> {
    if (!this.channel) {
      console.error('[RabbitMQ] Канал не створено!');
      return false;
    }

    try {
      // Відправляємо повідомлення у форматі JSON
      const buffer = Buffer.from(JSON.stringify(eventData));
      // persistent: true гарантує збереження повідомлення на диску RabbitMQ
      const success = this.channel.sendToQueue(this.queueName, buffer, { persistent: true });
      return success;
    } catch (error) {
      console.error('[RabbitMQ] Помилка відправки повідомлення:', error);
      return false;
    }
  }
}