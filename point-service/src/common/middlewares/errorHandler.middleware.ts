import { Request, Response, NextFunction } from 'express';
import { AppError } from './errors/AppError.js';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    //визначаємо статус код помилки якщо від нас прийшов AppError, якщо ні то 500
    const statusCode = err instanceof AppError ? err.statusCode : 500;

    //Формуємо відповідь з помилкою
    const errorResponse = {
        status: 'error',
        statusCode: statusCode,
        message: err.message,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        
    };

    //логуємо відповідь для себе
    console.error('HTTP error response:', errorResponse);

    res.status(statusCode).json(errorResponse);
}