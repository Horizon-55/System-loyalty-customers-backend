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

    /**
     * @openapi
     * /api/v1/points/buy-premium:
     *   post:
     *     summary: Купівля Premium-статусу (Початок Саги)
     *     tags: [Points (Saga)]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - customerId
     *             properties:
     *               customerId:
     *                 type: string
     *                 example: "123"
     *     responses:
     *       200:
     *         description: Бали списано, запит в обробці (Pending)
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: "Запит на купівлю Premium прийнято. Обробка..."
     *                 customerId:
     *                   type: string
     *                   example: "123"
     *                 pointsDeducted:
     *                   type: number
     *                   example: 500
     *                 status:
     *                   type: string
     *                   example: "PENDING"
     *       400:
     *         description: Некоректний запит (відсутній customerId)
     *       404:
     *         description: Клієнта не знайдено
     *       500:
     *         description: Внутрішня помилка сервера
     */
    router.post('/buy-premium', controller.buyPremium); 
  /**
   * @openapi
   * /api/v1/points/{customerId}:
   *   get:
   *     summary: Отримати баланс балів клієнта
   *     tags:
   *       - Points
   *     parameters:
   *       - in: path
   *         name: customerId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID клієнта
   *     responses:
   *       200:
   *         description: Успішне отримання балансу
   */
  // Важливо: цей роут має ловити ID як параметр URL
  router.get('/:customerId', controller.getBalance);
    return router;
}
