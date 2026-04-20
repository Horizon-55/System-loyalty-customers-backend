import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import axios from 'axios';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import rateLimit from 'express-rate-limit';
import { ConsulManager } from './config/ConsulManager';
import { authMiddleware } from './middleware/authMiddleware';
import jwt from 'jsonwebtoken';
import { metricsMiddleware, register } from './middleware/metrics';

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
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/app.ts'], // Вказуємо, що документацію шукати в цьому ж файлі
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use(metricsMiddleware);

/**
 * @openapi
 * /metrics:
 *   get:
 *     summary: Отримати системні метрики (Prometheus)
 *     tags:
 *       - Monitoring
 *     responses:
 *       200:
 *         description: Метрики системи
 */
app.get('/metrics', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
});
//захист від перевантажень 
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Часове вікно: 1 хвилина
  max: 5, // Ліміт: максимум 5 запитів з одного IP за цю хвилину (ставимо мало спеціально для тесту)
  message: {
    success: false,
    error: 'Перевищено ліміт запитів (Rate Limit). Будь ласка, зачекайте хвилину.'
  },
  standardHeaders: true, // Відправляти інфо про ліміти в заголовках (RateLimit-Limit, RateLimit-Remaining)
  legacyHeaders: false, // Вимкнути старі заголовки X-RateLimit
});

app.use(limiter);
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
 *     summary: Отримати агрегований дашборд клієнта (API Composition) (Захищено JWT)
 *     description: Збирає дані про профіль клієнта з Customer Service та баланс балів з Point Service. Демонструє стійкість системи у разі падіння сервісу балів.
 *     tags:
 *       - [Dashboard]
 *     security:
 *       - bearerAuth: []
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
app.get('/api/dashboard/:customerId', authMiddleware, async (req: Request, res: Response) => {
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
/**
 * @openapi
 * /health:
 *   get:
 *     summary: Перевірка стану системи (Health Check)
 *     description: Повертає статус API Gateway та системні метрики. Це перший крок до виконання завдання на 10 балів (Observability).
 *     tags:
 *       - Monitoring
 *     responses:
 *       200:
 *         description: Система працює стабільно
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "UP"
 *                 uptime:
 *                   type: number
 *                   example: 120.5
 *                 timestamp:
 *                   type: string
 *                   example: "2026-04-13T12:00:00Z"
 */
// Базовий роут для перевірки, що Gateway живий
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    uptime: process.uptime(), // час роботи процесу в секундах
    timestamp: new Date().toISOString(),
    message: 'API Gateway працює в штатному режимі'
  });
});
/**
 * @openapi
 * /api/auth/mock-login:
 *   post:
 *     summary: Отримати тестовий JWT токен
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Токен успішно згенеровано
 */
// допоміжний ендпоінт для тестування (генерація JWT)
app.post('/api/auth/mock-login', async (req: Request, res: Response) => {
  // Імітуємо логін клієнта з ID 123
  const mockUser = { userId: '123', role: 'user' };

  // ВАЖЛИВО: беремо ТОЙ САМИЙ секрет, яким authMiddleware перевіряє токен,
  // інакше jwt.verify поверне "invalid signature".
  const secretData = await ConsulManager.getSecret('secrets/api-gateway/jwt');
  const JWT_SECRET = secretData?.jwtSecret || 'fallback_secret';

  const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '1h' });

  res.json({
    message: 'Успішний вхід',
    token: token
  });
});
/**
 * @openapi
 * /api/config-demo:
 *   get:
 *     summary: Демонстрація Runtime Refresh (Lab 8)
 *     tags:
 *       - Config
 *     responses:
 *       200:
 *         description: Поточна конфігурація з Consul
 */
app.get('/api/config-demo', (req: Request, res: Response) => {
  res.json({
    status: 'success',
    source: 'Consul Centralized Configuration',
    currentSettings: ConsulManager.currentConfig
  });
});
// 2. Створюємо асинхронну функцію для старту
async function startServer() {
  await ConsulManager.init('dev'); 

    // Вмикаємо динамічне оновлення кожні 5 секунд
    ConsulManager.startWatching('dev', 5000);

    // Перевіряємо, чи підтягнулися налаштування
    if (ConsulManager.currentConfig.welcomeMessage) 
      console.log(`Повідомлення від Consul: ${ConsulManager.currentConfig.welcomeMessage}`);
}

// Запуск
app.listen(PORT, () => {
  console.log(` API Gateway успішно запущено на порту ${PORT}`);
  console.log(` Проксі: /api/customers -> http://localhost:3001`);
  console.log(` Проксі: /api/points -> http://localhost:3002`);
});

startServer();