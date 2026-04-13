import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import axios from 'axios';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const app = express();
const PORT = 3000;
app.use(cors());

// Налаштування маршрутизації (проксі)
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'API Gateway Documentaton',
      version: '1.0.0',
      description: 'Єдина точка входу та агрегація даних (API Composition)',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Gateway Server'
      },
    ],
  },
  apis: ['./src/app.ts'], // Вказуємо, що документацію шукати в цьому ж файлі
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Усі запити на /api/customers перенаправляємо на Customer Service (порт 3001)
app.use('/api/customers', createProxyMiddleware({ 
  target: 'http://localhost:3001', 
  changeOrigin: true,
  // Якщо в твоїх мікросервісах базовий шлях /api/v1/customers, залишаємо його таким.
  // Якщо треба переписати шлях, використовується pathRewrite.
}));

// Усі запити на /api/points перенаправляємо на Point Service (порт 3002)
app.use('/api/points', createProxyMiddleware({ 
  target: 'http://localhost:3002', 
  changeOrigin: true,
}));

/**
 * @openapi
 * /api/dashboard/{customerId}:
 *   get:
 *     summary: Отримати агрегований дашборд клієнта (API Composition)
 *     description: Збирає дані про профіль клієнта з Customer Service та баланс балів з Point Service. Демонструє стійкість системи у разі падіння сервісу балів.
 *     tags:
 *       - Dashboard
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID клієнта для пошуку
 *     responses:
 *       200:
 *         description: Успішна агрегація даних
 *       500:
 *         description: Критична помилка (недоступний Customer Service)
 */

// api composition (Дашборд)
app.get('/api/dashboard/:customerId', async (req: Request, res: Response) => {
  const { customerId } = req.params;
  console.log(`[Gateway] Збираємо дашборд для клієнта: ${customerId}`);
  try {
    // 1. Запит до Customer Service (Обов'язкові дані)
    // Якщо цього сервісу немає, ми взагалі не можемо показати профіль
    const customerResponse = await axios.get(`http://localhost:3001/api/v1/customers/${customerId}`);
    const customerData = customerResponse.data;

    // 2. Запит до Point Service (Необов'язкові дані - СТІЙКІСТЬ)
    let loyaltyData = null;
    try {
      const pointsResponse = await axios.get(`http://localhost:3002/api/v1/points/${customerId}`);
      loyaltyData = pointsResponse.data;
    } catch (error: any) {
      console.warn(`[Gateway] Увага: Point Service недоступний для клієнта ${customerId}`);
      // Реалізуємо стійкість: повертаємо часткові дані замість помилки 500
      loyaltyData = { 
        status: 'Service Unavailable', 
        message: 'Баланс балів тимчасово недоступний' 
      };
    }

    // 3. Формуємо фінальну агреговану відповідь (API Composition)
    res.status(200).json({
      success: true,
      data: {
        profile: customerData,
        loyalty: loyaltyData
      }
    });

  } catch (error: any) {
    console.error(`[Gateway] Критична помилка. Customer Service недоступний.`);
    res.status(500).json({ 
      success: false, 
      error: 'Не вдалося завантажити профіль клієнта.' 
    });
  }
});

// Базовий роут для перевірки, що Gateway живий
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'API Gateway is running' });
});

app.listen(PORT, () => {
  console.log(` API Gateway успішно запущено на порту ${PORT}`);
  console.log(` Проксі: /api/customers -> http://localhost:3001`);
  console.log(` Проксі: /api/points -> http://localhost:3002`);
});