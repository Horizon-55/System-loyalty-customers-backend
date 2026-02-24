import { Router } from "express";
import { CustomerController } from "./CustomersController.js";
import { validationMiddleware } from "../../../common/middlewares/validation.middleware.js";
import { CreateCustomerDto } from "../application/dto/CreateCustomerDto.js";

export const createCustomerRoutes = (controller: CustomerController) => {
    const router = Router();
    /**
     * @openapi
     * /api/v1/customers/register:
     *   post:
     *     summary: Реєстрація нового клієнта (v1)
     *     tags: [Customers]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - name
     *               - email
     *             properties:
     *               name:
     *                 type: string
     *                 example: Олександр
     *               email:
     *                 type: string
     *                 example: alex@example.com
     *     responses:
     *       201:
     *         description: Клієнта успішно створено
     *       400:
     *         description: Помилка валідації або клієнт вже існує
     *       409:
     *         description: Клієнт вже існує
     */
    router.post('/register', validationMiddleware(CreateCustomerDto), controller.register);
    return router;
}