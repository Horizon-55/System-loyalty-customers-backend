// customer-service/src/infrastructure/rabbitmq/RabbitMQConsumer.ts
import amqp, { ChannelModel, Channel, ConsumeMessage } from 'amqplib';

export class RabbitMQConsumer {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly queueName = 'loyalty_events_queue'; // Та сама черга!

  public async connectAndConsume(): Promise<void> {
    try {
      // 1. Підключаємося до RabbitMQ
      const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
      this.connection = await amqp.connect(rabbitUrl);
      this.channel = await this.connection.createChannel();
      
      // 2. Переконуємося, що черга існує
      await this.channel.assertQueue(this.queueName, { durable: true });
      console.log(`[RabbitMQ Consumer] Успішно підключено. Слухаємо чергу: ${this.queueName}`);

      // 3. Підписуємося на повідомлення
      this.channel.consume(this.queueName, async (msg: ConsumeMessage | null) => {
        if (msg) {
          try {
            // Розпаковуємо JSON
            const eventData = JSON.parse(msg.content.toString());
            
            console.log(`\n[RabbitMQ Consumer] Отримано нову подію: ${eventData.eventType}`);
            console.log(`Суть події (Payload):`, eventData.payload);

            // ТУТ БІЗНЕС-ЛОГІКА: 
            // В реальному проєкті ми б тут викликали CustomerService, 
            // щоб він додав ці бали до загального рахунку клієнта (TotalPoints).
            console.log(`Обробляємо нарахування балів для клієнта ${eventData.aggregateId}...`);

            // 4. Підтверджуємо брокеру, що все ок (ACK - Acknowledgement)
            // Тільки після цього RabbitMQ видалить повідомлення з черги!
            this.channel!.ack(msg);
            console.log(`[RabbitMQ Consumer] Повідомлення успішно оброблено (ACK)!`);
            
          } catch (err) {
            console.error('Помилка обробки повідомлення:', err);
            // Якщо щось пішло не так, не видаляємо повідомлення (NACK)
            this.channel!.nack(msg); 
          }
        }
      });
    } catch (error) {
      console.error('[RabbitMQ Consumer] Помилка підключення:', error);
    }
  }
}