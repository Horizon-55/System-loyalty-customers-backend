import { Request, Response, NextFunction } from 'express';
import { PointService } from '../application/PointService.js';
import { AppError } from '../common/middlewares/errors/AppError.js'; // Наш глобальний клас помилок

export class PointController {
    constructor(private readonly pointService: PointService) {}

    public addPoints = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
        try {
            const { customerId, amount } = req.body;

            if (!customerId || !amount) 
                throw new AppError('customerId та amount є обов\'язковими', 400);
            
            await this.pointService.addPoints(customerId, amount);
            res.status(200).json({ message: 'Бали успішно нараховані', customerId, amount });
        } catch (error: any) {
            next(new AppError(error.message, error.statusCode));
        }
    }

    public buyPremium = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { customerId } = req.body;
      const premiumCost = 500; // Фіксована вартість Premium-статусу

      if (!customerId) 
        throw new AppError('customerId є обов\'язковим', 400);
      
      await this.pointService.deductPointsForPremium(customerId, premiumCost);
      
      res.status(200).json({ 
        message: 'Запит на купівлю Premium прийнято. Обробка...',
        customerId,
        pointsDeducted: premiumCost,
        status: 'PENDING' // Вказуємо, що це eventual consistency
      });
    } catch (error) {next(error); }
  };
}