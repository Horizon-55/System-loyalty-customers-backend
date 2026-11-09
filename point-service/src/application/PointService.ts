import mongoose from 'mongoose';
import { ICustomerServiceClient } from './ports/ICustomerServiceClient.js';
import { OutboxEventModel } from '../infrastructure/database/OutboxEvent.js'; // Наша нова таблиця
import { Money } from '../domain/Money.js';
import { TransactionContext, SalesChannel } from '../domain/TransactionContext.js';
import { LoyaltyRewardPolicy, SettlementResult } from '../domain/LoyaltyRewardPolicy.js';

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
   * ЛАБОРАТОРНА РОБОТА №7 - Завдання 2 (PASS-стан):
   * Рефакторинг за допомогою концепцій Immutable Data та Value Objects.
   * - Ліквідовано всі 7 мутабельних змінних класу M (M = 0).
   * - Капсульовано контрольні умови (клас C) у конструкторах Value Objects.
   * - Цикломатична складність методу: CC = 1 (абсолютна лінійність).
   * - Метрика Чепіна: C_ch знижено з 29.5 до 3.0 (зниження на 89.8% при нормативі >= 50%).
   */
  public settleOrderLoyaltyTransaction(
    orderAmount: Money,
    context: TransactionContext,
    policy: LoyaltyRewardPolicy
  ): SettlementResult {
    return policy.calculateSettlement(orderAmount, context);
  }

  /**
   * Адаптер зворотної сумісності для легасі-викликів з автоматичним мапінгом у Value Objects
   */
  public settleOrderLoyaltyTransactionLegacy(
    customerId: string,
    orderId: string,
    rawAmount: number,
    currency: string = 'UAH',
    discountPercentage: number = 0,
    taxRate: number = 0.20,
    bonusMultiplier: number = 1,
    channel: SalesChannel = 'WEB_PORTAL',
    correlationId?: string
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
    const context = new TransactionContext(customerId, orderId, channel, correlationId);
    const money = Money.of(rawAmount, currency);
    const policy = new LoyaltyRewardPolicy(discountPercentage, taxRate, bonusMultiplier);

    const settlement = this.settleOrderLoyaltyTransaction(money, context, policy);

    return {
      customerId: settlement.context.customerId,
      orderId: settlement.context.orderId,
      currency: settlement.originalTotal.currency,
      rawAmount: settlement.originalTotal.amount,
      discountAmount: settlement.discountAmount.amount,
      taxAmount: settlement.taxAmount.amount,
      finalPayable: settlement.finalPayable.amount,
      rewardPoints: settlement.rewardPoints,
      status: settlement.status
    };
  }
}