
import { ICustomerServiceClient } from './ports/ICustomerServiceClient.js';
import { AppError } from '../common/middlewares/errors/AppError.js';

export class PointService {
    constructor(
      private readonly customerClient: ICustomerServiceClient // Наш новий HTTP-клієнт
    ) {}
  
    public async addPoints(customerId: string, amount: number): Promise<void> {
      // 1. СИНХРОННА ВЗАЄМОДІЯ: Перевіряємо, чи існує клієнт у сусідньому мікросервісі
      const exists = await this.customerClient.checkCustomerExists(customerId);
      if (!exists) 
        throw new AppError(`Клієнта з ID ${customerId} не знайдено.`, 404);
      // 2. Якщо клієнт є, продовжуємо бізнес-логіку нарахування балів...
      console.log(`Клієнт знайдений! Нараховуємо ${amount} балів...`);
      // await this.pointRepository.save(...);
    }
  }