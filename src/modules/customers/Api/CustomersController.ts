import { Request, Response, NextFunction } from "express";
import { CustomerService } from "../application/CustomerService.js";
import { AppError } from "../../../common/middlewares/errors/AppError.js";

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
}