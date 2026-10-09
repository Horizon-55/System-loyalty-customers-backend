import { Request, Response, NextFunction } from 'express';

// Глобальний стан для перемикання Fault Injection під час Live Demo
export let activeFaultMode: 'none' | '500' | 'timeout' = 'none';

export const setFaultMode = (mode: 'none' | '500' | 'timeout') => {
  activeFaultMode = mode;
  console.log(`⚡ [Fault Injection] Режим збою встановлено: ${mode.toUpperCase()}`);
};

/**
 * Middleware для контрольованого впровадження збоїв (Fault Injection)
 * Відтворює два ключові сценарії надійності:
 * 1. HTTP 5xx (Internal Server Error)
 * 2. Timeout (штучна затримка понад ліміт клієнта)
 */
export const faultInjectionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Не застосовуємо збої до керуючих ендпоінтів та health check
  if (req.path.includes('fault-injection') || req.path.includes('health')) {
    return next();
  }

  // Перевірка: або через HTTP-заголовок (для точкових тестів), або через глобальний режим
  const faultHeader = req.headers['x-simulate-fault'] as string | undefined;
  const faultType = faultHeader || activeFaultMode;

  if (!faultType || faultType === 'none') {
    return next();
  }

  const correlationId = req.headers['x-correlation-id'] || 'no-id';

  if (faultType === '500' || faultType === 'error') {
    console.warn(`🔥 [Fault Injection | ${correlationId}] СИМУЛЯЦІЯ ЗБОЮ: Повертаємо HTTP 500`);
    res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: 'FAULT INJECTION: Симуляція відмови зовнішньої залежності (HTTP 500 Internal Server Error)',
      simulated: true,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (faultType === 'timeout') {
    const delayMs = 4000; // 4 секунди перевищує клієнтський таймаут 2-3 сек
    console.warn(`⏳ [Fault Injection | ${correlationId}] СИМУЛЯЦІЯ ЗБОЮ: Затримка відповіді на ${delayMs} мс`);
    setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          status: 'error',
          statusCode: 504,
          message: 'FAULT INJECTION: Симуляція таймауту відповіді сервісу клієнтів',
          simulated: true,
        });
      }
    }, delayMs);
    return;
  }

  next();
};
