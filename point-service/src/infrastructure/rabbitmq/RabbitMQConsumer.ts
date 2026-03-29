import amqp, { ChannelModel, Channel, ConsumeMessage } from 'amqplib';
import { PointService } from '../../application/PointService.js';

export class RabbitMQConsumer {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly queueName = 'point_events_queue'; // Окрема черга для Point Service!
  constructor(private readonly pointService: PointService) {}

  public async connectAndConsume(): Promise<void> {
    try {
      const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
      this.connection = await amqp.connect(rabbitUrl);
      this.channel = await this.connection.createChannel();
      
      await this.channel.assertQueue(this.queueName, { durable: true });
      console.log(`[RabbitMQ Consumer] Успішно підключено. Слухаємо чергу: ${this.queueName}`);

      this.channel.consume(this.queueName, async (msg: ConsumeMessage | null) => {
        if (msg) {
          const eventData = JSON.parse(msg.content.toString());

          try {
            // saga: компенсація (rollback)
            if (eventData.eventType === 'PREMIUM_UPGRADE_FAILED') {
              console.log(`\n[PointService] Отримано подію: ${eventData.eventType}`);
              console.log(`Причина відкату: ${eventData.payload.reason}`);
              
              // Викликаємо метод компенсації
              await this.pointService.refundPoints(
                eventData.aggregateId, 
                eventData.payload.amountToRefund
              );
            }

            this.channel!.ack(msg); // Підтверджуємо обробку
          } catch (err) {
            console.error('[PointService] Помилка обробки події:', err);
            this.channel!.nack(msg);
          }
        }
      });
    } catch (error) {console.error('[PointService] Помилка RabbitMQ Consumer:', error);}
  }
}