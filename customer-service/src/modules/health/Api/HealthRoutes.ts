import { Router } from "express";
import { HealthController } from "./HealthController.js";

export const createHealthRoutes = () => {
    const router = Router();
    const controller = new HealthController();
    /**
     * @openapi
     * /health:
     *   get:
     *     summary: Перевірка стану (Health Check)
     *     tags: [System]
     *     responses:
     *       200:
     *         description: Сервіс працює нормально
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: UP
     *                 uptime:
     *                   type: number
     *                 timestamp:
     *                   type: string
     */
    router.get('/', controller.check);
    return router;
}