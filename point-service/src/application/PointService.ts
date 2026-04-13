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
      // 3. business logic: Імітуємо збереження балів (якби у нас була колекція PointModel)
      console.log(`[PointService] Бізнес-логіка: Нарахування ${amount} балів клієнту ${customerId}...`);
      // await PointModel.create([{ customerId, amount }], { session });

      // 4. outbox pattern: Зберігаємо подію в окрему таблицю в межах тієї ж транзакції
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

   //новий метод для саги: Списання балів для купівлі Premium
  public async deductPointsForPremium(customerId: string, amount: number): Promise<void> {
    // 1. Перевіряємо, чи існує клієнт
    const exists = await this.customerClient.checkCustomerExists(customerId);
    if (!exists) 
      throw new Error(`Клієнта з ID ${customerId} не знайдено.`);
    
    // 2. Відкриваємо транзакцію бази даних
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 3. business logic: Імітуємо списання балів (перевірка балансу і віднімання)
      console.log(`[PointService] saga: Списання ${amount} балів у клієнта ${customerId} для покупки Premium...`);
      // У реальному житті тут була б перевірка: if (currentPoints < amount) throw Error('Недостатньо балів');

      // 4. outbox pattern: Зберігаємо подію points deducted
      // Ця подія стане тригером для Customer Service, щоб він видав Premium-статус
      await OutboxEventModel.create([{
        eventType: 'POINTS_DEDUCTED',
        aggregateId: customerId,
        payload: { 
          customerId: customerId, 
          amountDeducted: amount,
          action: 'BUY_PREMIUM',
          timestamp: new Date().toISOString() 
        }
      }], { session });

      // 5. Якщо все пройшло без помилок - зберігаємо зміни (Commit)
      await session.commitTransaction();
      console.log(`[PointService] saga: Бали успішно списано. Подію points deducted збережено в Outbox!`);

    } catch (error) {
      await session.abortTransaction();
      console.error(`[PointService] Помилка під час списання балів:`, error);
      throw error;
    } finally {session.endSession();}
  }

  //saga: компенсація (rollback)
  public async refundPoints(customerId: string, amount: number): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log(`\n[PointService] saga: компенсація (rollback): Повернення ${amount} балів клієнту ${customerId}...`);
      
      // business logic: Імітуємо додавання балів назад на баланс
      // У реальному житті тут: await PointModel.updateOne(..., { $inc: { amount: amount } })
      await session.commitTransaction();
      console.log(`[PointService] saga: Відкат успішний! Бали повернуто, цілісність даних збережено.`);

    } catch (error) {
      await session.abortTransaction();
      console.error(`[PointService] Помилка під час компенсації:`, error);
    } finally {session.endSession();}
  }

  //метод: Отримання балансу балів по ID клієнта
  public async getBalance(customerId: string): Promise<any> {
    // 1. Перевіряємо, чи існує клієнт (повертає true або false)
    const exists = await this.customerClient.checkCustomerExists(customerId);
    
    // 2. Якщо клієнта немає, віддаємо пустий баланс
    if (!exists) {
      return { 
        customerId: customerId, 
        points: 0,
        tier: 'Standard' 
      };
    }

    // 3. Оскільки ми "імітували" БД балів, для Gateway віддаємо умовний баланс.
    // Це дозволить нам ідеально перевірити роботу API Composition!
    return {
      customerId: customerId,
      points: 1500, // Умовні бали, щоб побачити їх у Дашборді Gateway
      tier: 'Premium',
      lastTransactionDate: new Date().toISOString()
    };
  }
}