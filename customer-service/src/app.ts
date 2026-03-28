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
import { RabbitMQConsumer } from './modules/customers/infrastructure/rabbitmq/RabbitMQConsumer.js';

const app = express();
// Мідлвар для парсингу JSON у тілі запиту
app.use(express.json());

app.use(tracingMiddleware);
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
    const rabbitConsumer = new RabbitMQConsumer();
    await rabbitConsumer.connectAndConsume();
    // Реєструємо всі маршрути модуля Customers під базовим шляхом v1
    app.use('/api/v1/customers', customerRouter);
    // Реєструємо всі маршрути модуля Health під базовим шляхом v1
    app.use('/health', healthRouter);
    //Перенаправлення на Swagger документацію
    app.get('/', (req, res) => {
      res.redirect('/api-docs');
    });
    //Обробка неіснуючи маршутів 
    app.all('/{*path}', (req: express.Request, res: express.Response, next: express.NextFunction) => {
      next(new AppError(`Маршрут ${req.originalUrl} не знайдений`, 404));
    });
    //8. Обробка помилок
    app.use(errorHandler);
    //9. Запуск сервера
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