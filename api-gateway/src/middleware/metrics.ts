import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// 1. Ініціалізація реєстру метрик (наш "блокнот")
export const register = new client.Registry();

// Додаємо збір стандартних метрик Node.js (завантаження CPU, використання RAM)
client.collectDefaultMetrics({ register });

// 2. Створюємо метрику для Throughput та Error Rate (Лічильник)
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Загальна кількість HTTP запитів',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestCounter);

// 3. Створюємо метрику для Latency (Гістограма часу відповіді)
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Тривалість HTTP запитів у мілісекундах',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 500, 1000, 2000], // Межі вимірювань у мс
});
register.registerMetric(httpRequestDurationMicroseconds);

// 4. Сам Middleware, який буде рахувати дані для КОЖНОГО запиту
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startEpoch = Date.now(); // Засікаємо час
  
  // Чекаємо, поки відповідь буде повністю відправлена клієнту
  res.on('finish', () => {
    const responseTimeInMs = Date.now() - startEpoch; // Рахуємо затримку (Latency)
    
    // Записуємо дані у лічильник запитів (Тут же фіксується Error Rate через status_code)
    httpRequestCounter.inc({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status_code: res.statusCode
    });

    // Записуємо час виконання
    httpRequestDurationMicroseconds.observe(
      {
        method: req.method,
        route: req.route ? req.route.path : req.path,
        status_code: res.statusCode
      },
      responseTimeInMs
    );
  });

  next();
};