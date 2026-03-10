import {Request, NextFunction, RequestHandler} from 'express';
import {plainToInstance} from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { AppError } from './errors/AppError.js';

export const validationMiddleware = (type: any): RequestHandler => {
    return async (req: Request, _res, next: NextFunction) => {
        const dtoObject = plainToInstance(type, req.body);
        const errors: ValidationError[] = await validate(dtoObject);

        if (errors.length > 0) {
            const errorMessages = errors.flatMap((error) =>
                Object.values(error.constraints || {})
            );

            next(new AppError(`Помилка валідації: ${errorMessages.join(', ')}`, 400));
            return;
        }

        req.body = dtoObject;
        next();
    }
}