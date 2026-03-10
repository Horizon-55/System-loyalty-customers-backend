import { Router } from 'express';
import { PointController } from './PointController.js';

export const createPointRoutes = (controller: PointController) => {
    const router = Router();
    /**
     * @openapi
     * /api/v1/points/add:
     *   post:
     *     summary: Нарахування балів клієнту
     *     tags: [Points]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - customerId
     *               - amount
     *             properties:
     *               customerId:
     *                 type: string
     *                 example: "123"
     *               amount:
     *                 type: number
     *                 example: 50
     *     responses:
     *       200:
     *         description: Бали успішно нараховано
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: "Бали успішно нараховані"
     *                 customerId:
     *                   type: string
     *                   example: "123"
     *                 amount:
     *                   type: number
     *                   example: 50
     *       400:
     *         description: Некоректний запит, відсутні обов'язкові поля
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: "error"
     *                 statusCode:
     *                   type: number
     *                   example: 400
     *                 message:
     *                   type: string
     *                   example: "customerId та amount є обов'язковими"
     *                 timestamp:
     *                   type: string
     *                   example: "2026-03-09T12:00:00.000Z"
     *                 path:
     *                   type: string
     *                   example: "/api/v1/points/add"
     *       404:
     *         description: Клієнта з переданим ID не знайдено
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: "error"
     *                 statusCode:
     *                   type: number
     *                   example: 404
     *                 message:
     *                   type: string
     *                   example: "Клієнта з ID 123 не знайдено."
     *                 timestamp:
     *                   type: string
     *                   example: "2026-03-09T12:00:00.000Z"
     *                 path:
     *                   type: string
     *                   example: "/api/v1/points/add"
     *       503:
     *         description: Сервіс клієнтів тимчасово недоступний
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: "error"
     *                 statusCode:
     *                   type: number
     *                   example: 503
     *                 message:
     *                   type: string
     *                   example: "Сервіс клієнтів тимчасово недоступний. Спробуйте пізніше."
     *                 timestamp:
     *                   type: string
     *                   example: "2026-03-09T12:00:00.000Z"
     *                 path:
     *                   type: string
     *                   example: "/api/v1/points/add"
     *       500:
     *         description: Внутрішня помилка сервера під час нарахування балів
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: "error"
     *                 statusCode:
     *                   type: number
     *                   example: 500
     *                 message:
     *                   type: string
     *                   example: "Не вдалося перевірити клієнта через внутрішню помилку."
     *                 timestamp:
     *                   type: string
     *                   example: "2026-03-09T12:00:00.000Z"
     *                 path:
     *                   type: string
     *                   example: "/api/v1/points/add"
     */
    router.post('/add', controller.addPoints);
    return router;
}
