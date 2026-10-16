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


    /**
     * @openapi
     * /api/v1/customers/{id}:
     *   get:
     *     summary: Отримання клієнта за ID (Міжсервісна взаємодія)
     *     tags: [Customers]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Унікальний ідентифікатор клієнта
     *     responses:
     *       200:
     *         description: Клієнта знайдено
     *       404:
     *         description: Клієнта не знайдено
     */
    router.get('/:id', controller.getbyId);

    /**
     * @openapi
     * /api/v1/customers/{id}/personal-data:
     *   get:
     *     summary: GDPR Article 15 - Right of Access & Personal Data Export
     *     tags: [Privacy Engineering]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Унікальний ідентифікатор суб'єкта персональних даних
     *       - in: header
     *         name: x-user-id
     *         required: true
     *         schema:
     *           type: string
     *         description: Ідентифікатор автентифікованого користувача (для захисту від IDOR)
     *     responses:
     *       200:
     *         description: Успішний структурований експорт персональних даних
     *       401:
     *         description: Відсутня автентифікація
     *       403:
     *         description: Спроба несанкціонованого доступу до чужих даних (IDOR)
     *       404:
     *         description: Суб'єкта не знайдено
     */
    router.get('/:id/personal-data', controller.exportPersonalData);

    /**
     * @openapi
     * /api/v1/customers/{id}/anonymize:
     *   post:
     *     summary: GDPR Article 17 - Right to Erasure & Anonymization Workflow
     *     tags: [Privacy Engineering]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Унікальний ідентифікатор суб'єкта для анонімізації
     *       - in: header
     *         name: x-user-id
     *         required: true
     *         schema:
     *           type: string
     *         description: Ідентифікатор авторизованого суб'єкта
     *     responses:
     *       200:
     *         description: Суб'єкта успішно анонімізовано або він вже був анонімізований (ідемпотентність)
     *       401:
     *         description: Відсутня автентифікація
     *       403:
     *         description: Відсутні повноваження на анонімізацію чужого профілю
     *       404:
     *         description: Суб'єкта не знайдено
     */
    router.post('/:id/anonymize', controller.anonymizeCustomer);
    router.delete('/:id', controller.anonymizeCustomer);

    /**
     * @openapi
     * /api/v1/customers/{id}/consents/grant:
     *   post:
     *     summary: GDPR Article 7 - Надання згоди (GRANT)
     *     tags: [Consent Management]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *       - in: header
     *         name: x-user-id
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - purpose
     *             properties:
     *               purpose:
     *                 type: string
     *                 enum: [MARKETING_EMAIL, OPTIONAL_ANALYTICS, PROFILING]
     *               policyVersion:
     *                 type: string
     *                 example: "v1.0"
     *               source:
     *                 type: string
     *                 example: "web_settings"
     *     responses:
     *       200:
     *         description: Згоду успішно зареєстровано
     */
    router.post('/:id/consents/grant', controller.grantConsent);

    /**
     * @openapi
     * /api/v1/customers/{id}/consents/revoke:
     *   post:
     *     summary: GDPR Article 7(3) - Відкликання згоди (REVOKE)
     *     tags: [Consent Management]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *       - in: header
     *         name: x-user-id
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - purpose
     *             properties:
     *               purpose:
     *                 type: string
     *                 enum: [MARKETING_EMAIL, OPTIONAL_ANALYTICS, PROFILING]
     *     responses:
     *       200:
     *         description: Згоду успішно відкликано з негайним блокуванням залежних дій
     */
    router.post('/:id/consents/revoke', controller.revokeConsent);

    /**
     * @openapi
     * /api/v1/customers/{id}/consents:
     *   get:
     *     summary: Отримання списку актуальних згод користувача
     *     tags: [Consent Management]
     */
    router.get('/:id/consents', controller.getConsents);

    /**
     * @openapi
     * /api/v1/customers/{id}/marketing/send-promotion:
     *   post:
     *     summary: Демонстрація Policy Gate - Залежна маркетингова дія
     *     tags: [Consent Management]
     *     responses:
     *       200:
     *         description: Дія дозволена (ALLOW) через наявність активної згоди
     *       403:
     *         description: Дія заблокована (DENY) через відсутність або відкликання згоди
     */
    router.post('/:id/marketing/send-promotion', controller.sendPromotion);

    return router;
}