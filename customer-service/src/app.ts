import express from 'express';
import { config } from './config/env.js';
import { setupSwagger } from './config/swagger.js';
import { InMemoryCustomerRepository } from './modules/customers/infrastructure/InMemoryCustomerRepository.js';
import { CustomerService } from './modules/customers/application/CustomerService.js';
import { CustomerController } from './modules/customers/Api/CustomersController.js';
import { createCustomerRoutes } from './modules/customers/Api/CustomerRoutes.js';
import { connectToMockDatabase } from './modules/customers/infrastructure/database/MongoMemorySetup.js';
import { errorHandler } from './common/middlewares/errorHandler.middleware.js';
import { AppError } from './common/middlewares/errors/AppError.js';
import { createHealthRoutes } from './modules/health/Api/HealthRoutes.js';
import { tracingMiddleware } from './common/middlewares/tracing.middleware.js';
import { faultInjectionMiddleware, setFaultMode, activeFaultMode } from './common/middlewares/faultInjection.middleware.js';
import { RabbitMQConsumer } from './modules/customers/infrastructure/rabbitmq/RabbitMQConsumer.js';
import { RabbitMQPublisher } from './modules/customers/infrastructure/rabbitmq/RabbitMQPublisher.js';

const app = express();
// Мідлвар для парсингу JSON у тілі запиту
app.use(express.json());

app.use(tracingMiddleware);
app.use(faultInjectionMiddleware);
const bootstrap = async () => {
  try {
    //1. Підключення до бази даних в памяті
    await connectToMockDatabase();

    //2. Налаштування Swagger
    setupSwagger(app);

    //3. Infrastructure: Створюємо репозиторій
    const customerRepository = new InMemoryCustomerRepository();
    //4. Application: Створюємо сервіс і передаємо йому репозиторій (Dependency Injection)
    const customerService = new CustomerService(customerRepository);
    //5. API: Створюємо контролер і передаємо йому сервіс
    const customerController = new CustomerController(customerService);
    //6. Створюємо роутер для нашого модуля
    const customerRouter = createCustomerRoutes(customerController);
    const healthRouter = createHealthRoutes();
    //7. Підключення до RabbitMQ та запуск Consumer
    const rabbitPublisher = new RabbitMQPublisher();
    await rabbitPublisher.connect();
    //8.Передаємо CustomerService та RabbitMQPublisher всередину Consumer
    const rabbitConsumer = new RabbitMQConsumer(customerService, rabbitPublisher);
    //9. Запуск Consumer
    await rabbitConsumer.connectAndConsume();
    //10. Реєструємо всі маршрути модуля Customers під базовим шляхом v1
    // Реєструємо всі маршрути модуля Customers під базовим шляхом v1
    app.use('/api/v1/customers', customerRouter);
    //11.Реєструємо всі маршрути модуля Health під базовим шляхом v1
    app.use('/health', healthRouter);
    // 12. Ендпоінти контролю Fault Injection (для Live Demo)
    app.post('/api/v1/fault-injection', (req, res) => {
      const { mode } = req.body;
      if (mode === '500' || mode === 'timeout' || mode === 'none') {
        setFaultMode(mode);
        return res.json({ success: true, activeFaultMode: mode });
      }
      res.status(400).json({ error: 'Mode must be 500, timeout, or none' });
    });
    app.get('/api/v1/fault-injection', (req, res) => {
      res.json({ activeFaultMode });
    });

    //13.Перенаправлення на Swagger документацію
    app.get('/', (req, res) => {
      res.redirect('/api-docs');
    });
    //13.Обробка неіснуючи маршутів 
    app.all('/{*path}', (req: express.Request, res: express.Response, next: express.NextFunction) => {
      next(new AppError(`Маршрут ${req.originalUrl} не знайдений`, 404));
    });
    //14. Обробка помилок
    app.use(errorHandler);
    //15. Запуск сервера
    app.listen(config.port, () => {
      console.log(`Модульний моноліт запущено на http://localhost:${config.port}`);
      console.log(`Модуль Customers доступний за адресою http://localhost:${config.port}/api/customers`);
      console.log(`Swagger документація доступна за адресою http://localhost:${config.port}/api-docs`);
    });
  } catch (error) {
    console.error('Помилка підключення до бази даних:', error);
    process.exit(1);
  }
}

bootstrap();