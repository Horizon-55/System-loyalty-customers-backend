import amqp, { ChannelModel, Channel, ConsumeMessage } from 'amqplib';
import { CustomerService } from '../../application/CustomerService.js';
import { RabbitMQPublisher } from './RabbitMQPublisher.js';

export class RabbitMQConsumer {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly queueName = 'loyalty_events_queue';

  constructor(
    private readonly customerService: CustomerService,
    private readonly publisher: RabbitMQPublisher // Додали Publisher для відкатів
  ) {}

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
          console.log(`\n[CustomerService] Отримано подію: ${eventData.eventType}`);

          try {
            // saga:horeography
            if (eventData.eventType === 'POINTS_DEDUCTED') {
              console.log(`Спроба видати Premium клієнту ${eventData.aggregateId}...`);
              
              // Намагаємося видати статус
              await this.customerService.upgradeToPremium(eventData.aggregateId);
              console.log(`[CustomerService] САГА: Premium успішно видано! Транзакцію завершено.`);
            }
            this.channel!.ack(msg); // Все ок, видаляємо повідомлення
            
          } catch (err: any) {
            console.error(`[CustomerService] Помилка: ${err.message}`);
            
            //saga: компенсація (rollback)
            if (eventData.eventType === 'POINTS_DEDUCTED') {
              console.log(`[CustomerService] САГА: Ініціюємо відкат (Компенсаційну транзакцію)...`);
              
              await this.publisher.publishEvent({
                eventType: 'PREMIUM_UPGRADE_FAILED',
                aggregateId: eventData.aggregateId,
                payload: { 
                  reason: err.message, 
                  amountToRefund: eventData.payload.amountDeducted // Скільки балів треба повернути
                },
                timestamp: new Date().toISOString()
              });
            }
            // Ми обробили помилку (відправили відкат), тому підтверджуємо повідомлення, щоб воно не зациклилось
            this.channel!.ack(msg); 
          }
        }
      });
    } catch (error) {console.error('[CustomerService] Помилка RabbitMQ:', error);}
  }
}