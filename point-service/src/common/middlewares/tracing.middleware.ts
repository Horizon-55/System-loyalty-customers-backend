import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { tracingContext } from '../tracing/tracingContext.js';

export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Шукаємо ID в заголовках, або генеруємо новий
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  // Додаємо цей ID у відповідь, щоб клієнт теж його бачив
  res.setHeader('x-correlation-id', correlationId);
  // Запускаємо весь подальший ланцюжок запиту всередині нашого контексту
  tracingContext.run(correlationId, () => {
    // Логуємо вхідний запит разом з ID
    console.log(`[${correlationId}] 📥 Вхідний запит: ${req.method} ${req.originalUrl}`);
    next();
  });
};