import express from 'express';
import { tracingMiddleware } from './common/middlewares/tracing.middleware.js';
import { CustomerServiceClient } from './infrastructure/http/CustomerServiceClient.js';
import { PointService } from './application/PointService.js';
import { PointController } from './api/PointController.js';
import { createPointRoutes } from './api/PointRoutes.js';
import { errorHandler } from './common/middlewares/errorHandler.middleware.js';
import { connectToMockDatabase } from './infrastructure/database/MongoMemorySetup.js'; // In-memory DB
import { setupSwagger } from './config/swagger.js';

const app = express();
// Мідлвар для парсингу JSON у тілі запиту
app.use(express.json());
// Мідлвар для трасування запитів
app.use(tracingMiddleware);

const bootstrap = async () => {
    try {
      // 2. Запускаємо In-Memory БД, щоб уникнути MongoNetworkError
      await connectToMockDatabase();

      // 2. Налаштування Swagger
      setupSwagger(app);

      // 3. COMPOSITION ROOT (Збірка залежностей)
      const customerClient = new CustomerServiceClient(); // Наш клієнт з Axios, Retry та Circuit Breaker
      const pointService = new PointService(customerClient);
      const pointController = new PointController(pointService);
      const pointRouter = createPointRoutes(pointController);
  
      // 4. Підключення маршрутів
      app.use('/api/v1/points', pointRouter);
  
      // 5. ГЛОБАЛЬНИЙ ОБРОБНИК ПОМИЛОК (обов'язково в кінці)
      app.use(errorHandler);
  
      // 6. Запуск сервера
      const PORT = process.env.PORT || 3002;
      app.listen(PORT, () => {
        console.log(`🚀 Point Service успішно запущено на http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error('Помилка під час запуску Point Service:', error);
      process.exit(1);
    }
  };
  
  bootstrap();