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
  public async getBalance(customerId: string, bypassResilience = false): Promise<any> {
    try {
      // 1. Перевіряємо, чи існує клієнт (повертає true або false)
      const exists = await (this.customerClient as any).checkCustomerExists(customerId, bypassResilience);
      
      // 2. Якщо клієнта немає, віддаємо пустий баланс
      if (!exists) {
        return { 
          customerId: customerId, 
          points: 0, 
          tier: 'Standard' 
        };
      }

      // 3. Віддаємо повні дані при нормальній роботі
      return {
        customerId: customerId,
        points: 1500,
        tier: 'Premium',
        status: 'ACTIVE',
        lastTransactionDate: new Date().toISOString()
      };
    } catch (error: any) {
      // Якщо це стан «ДО» (без захисту): прокидаємо помилку для демонстрації каскадного падіння 500
      if (!error.isFallback) {
        throw error;
      }

      // СТАН «ПІСЛЯ»: Graceful Degradation (безпечна відповідь замість падіння системи)
      console.warn(`🛡️ [PointService] Graceful Degradation активовано для клієнта ${customerId}. Віддаємо деградовану відповідь.`);
      return {
        customerId: customerId,
        points: 0,
        tier: 'Standard (Offline Mode)',
        status: 'DEGRADED',
        warning: 'Сервіс клієнтів тимчасово недоступний. Система працює в режимі Graceful Degradation.',
        fallbackApplied: true,
        lastTransactionDate: new Date().toISOString()
      };
    }
  }

  /**
   * ЛАБОРАТОРНА РОБОТА №7 - Завдання 1:
   * Розрахунок та фінансовий сеттлмент бонусів лояльності за чеком замовлення.
   * Початковий стан: лінійний за Мак-Кейбом (CC = 3), але містить інформаційний хаос (високий Chapin C_ch = 29.5)
   * та високий ризик дефектів неконтрольованої мутації примітивних змінних (тип M).
   */
  public settleOrderLoyaltyTransaction(
    customerId: string,
    orderId: string,
    rawAmount: number,
    currency: string,
    discountPercentage: number,
    taxRate: number,
    bonusMultiplier: number,
    channel: string,
    correlationId: string
  ): {
    customerId: string;
    orderId: string;
    currency: string;
    rawAmount: number;
    discountAmount: number;
    taxAmount: number;
    finalPayable: number;
    rewardPoints: number;
    status: string;
  } {
    // 1. Контрольні перевірки валідності вхідних даних (Низька цикломатична складність CC <= 5)
    if (rawAmount <= 0) {
      throw new Error("Сума транзакції повинна бути строго додатною.");
    }
    if (currency !== "UAH") {
      throw new Error(`Непідтримувана валюта розрахунку: ${currency}`);
    }
    if (discountPercentage > 100) {
      throw new Error("Відсоток знижки не може перевищувати 100%.");
    }

    // 2. Локальні мутабельні змінні (клас M за Чепіним)
    let discountAmount: number = 0;
    let taxableAmount: number = 0;
    let taxAmount: number = 0;
    let finalPayable: number = 0;
    let rewardPoints: number = 0;
    let status: string = "INITIALIZED";
    let auditChannelTag: string = "STANDARD";

    // 3. Керуюче розгалуження за каналом продажу (channel - клас C за Чепіним)
    if (channel === "MOBILE_APP") {
      auditChannelTag = "DIGITAL";
    } else {
      auditChannelTag = "IN_STORE";
    }

    // 4. Обчислення зі зміною проміжних змінних стану
    discountAmount = (rawAmount * discountPercentage) / 100;

    // 🚨 КРАШ-ТЕСТ: Симуляція неконтрольованої мутації даних (Data Mutation Flaw, FAIL)
    // Через відсутність захисту імутабельності (використання mutable змінних типу M)
    // значення знижки помилково перезаписує базову ціну товару, викликаючи фінансовий касовий розрив!
    rawAmount = discountAmount; // ПОМИЛКА МУТАЦІЇ: базова ціна 1000 замінена на знижку 100!
    taxableAmount = rawAmount - discountAmount; // 100 - 100 = 0 замість 900!
    taxAmount = taxableAmount * taxRate; // 0 замість 180!
    finalPayable = taxableAmount + taxAmount; // 0 замість 1080 грн!
    rewardPoints = Math.floor(finalPayable * bonusMultiplier); // 0 балів замість 2160!
    status = "SETTLED";

    // 5. Повернення агрегованого результату
    return {
      customerId,
      orderId,
      currency,
      rawAmount,
      discountAmount,
      taxAmount,
      finalPayable,
      rewardPoints,
      status: `${status}_${auditChannelTag}`
    };
  }
}