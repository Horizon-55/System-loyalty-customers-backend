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
}