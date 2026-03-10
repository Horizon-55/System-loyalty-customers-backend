import { Request, Response, NextFunction } from "express";
import { CustomerService } from "../application/CustomerService.js";
import { AppError } from "../../../common/middlewares/errors/AppError.js";
import { tracingContext } from "../../../common/middlewares/tracing/tracingContext.js";

export class CustomerController {
    constructor(private readonly customerService: CustomerService) {}

    public register = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
        try {
           //виклик сервісу
           const result = await this.customerService.registerCustomer(req.body);
           //відповідь 201 - Created
           res.status(201).json(result);
        } catch (error: any) {
            next(new AppError(error.message, error.statusCode));
        }
    }

    public getbyId = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
        try {
            const customerId = req.params.id;
        //Для демонстрації трасування: дістаємо Correlation ID, який прийшов від point-service
        const correlationId = tracingContext.getStore();
        console.log(`[${correlationId}] 🔍 Шукаємо клієнта з ID: ${customerId} у базі CustomerDB...`); 

        // Викликаємо сервіс (який звертається до репозиторію)
        const customer = await this.customerService.getCustomerById(customerId as string);
        if (!customer) {
            // Якщо клієнта немає, кидаємо 404 (point-service очікує саме цей статус)
            console.log(`[${correlationId}] ❌ Клієнта не знайдено`);
            return next(new AppError('Клієнта не знайдено', 404));
        }
        
        console.log(`[${correlationId}] ✅ Клієнта знайдено: ${customer.name}`);
        res.status(200).json(customer);
        } catch (error: any) {
            next(new AppError(error.message, error.statusCode));
        }
    }
}