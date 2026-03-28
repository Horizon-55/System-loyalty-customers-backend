import mongoose from 'mongoose';
import { ICustomerServiceClient } from './ports/ICustomerServiceClient.js';
import { OutboxEventModel } from '../infrastructure/database/OutboxEvent.js'; // Наша нова таблиця

export class PointService {
  constructor( private readonly customerClient: ICustomerServiceClient ) {}

  public async addPoints(customerId: string, amount: number): Promise<void> {
    // 1. Синхронний виклик (перевіряємо, чи існує клієнт)
    const exists = await this.customerClient.checkCustomerExists(customerId);
    
    if (!exists) 
      throw new Error(`Неможливо нарахувати бали: Клієнта з ID ${customerId} не знайдено.`);
    
    // 2. Відкриваємо транзакцію бази даних
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 3. БІЗНЕС-ОПЕРАЦІЯ: Імітуємо збереження балів (якби у нас була колекція PointModel)
      console.log(`[PointService] Бізнес-логіка: Нарахування ${amount} балів клієнту ${customerId}...`);
      // await PointModel.create([{ customerId, amount }], { session });

      // 4. OUTBOX ПАТЕРН: Зберігаємо подію в окрему таблицю в межах тієї ж транзакції
      await OutboxEventModel.create([{
        eventType: 'POINTS_ADDED',
        aggregateId: customerId,
        payload: { 
          customerId: customerId, 
          amount: amount, 
          timestamp: new Date().toISOString() 
        }
      }], { session });

      // 5. Якщо все пройшло без помилок - зберігаємо зміни (Commit)
      await session.commitTransaction();
      console.log(`[PointService] Транзакція успішна. Подію "POINTS_ADDED" збережено в Outbox!`);

    } catch (error) {
      // 6. Якщо база впала або сталася помилка — відміняємо ВСЕ (Rollback)
      await session.abortTransaction();
      console.error(`[PointService] Помилка транзакції, зміни скасовано:`, error);
      throw error;
    } finally {
      // Обов'язково закриваємо сесію, щоб не було витоку пам'яті в межах транзакції
      session.endSession();
    }
  }
}