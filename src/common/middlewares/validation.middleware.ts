import {Request, Response, NextFunction, RequestHandler} from 'express';
import {plainToInstance} from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { AppError } from './errors/AppError.js';

export const validationMiddleware = (type: any): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        const dtoObject = plainToInstance(type, req.body);
        validate(dtoObject).then((errors: ValidationError[]) => {
            if (errors.length > 0) {
                //Якщо є помилки, то повертаємо 400 статус і список помилок
                const errorMessages = errors.map((error) => {
                    Object.values(error.constraints || {}).join(', ');
                    next(new AppError("Помилка валідації: " + errorMessages, 400));
                });
                
            } else {
                req.body = dtoObject;
                next();
            }
        });
    }
}