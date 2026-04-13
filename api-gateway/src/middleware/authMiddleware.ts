import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Секретний ключ для підпису токенів (у реальному житті він лежить у .env)
const JWT_SECRET = process.env.JWT_SECRET || 'my_super_secret_jwt_key_for_lab7';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // 1. Шукаємо заголовок Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Відмовлено в доступі. Токен не надано.' });
    return;
  }

  // 2. Витягуємо сам токен (відкидаємо слово "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // 3. Перевіряємо, чи токен валідний і не підроблений
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, role: string };

    // 4. ПЕРЕДАЧА КОНТЕКСТУ БЕЗПЕКИ:
    // Додаємо дані користувача у заголовки запиту, щоб мікросервіси знали, хто це
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-role'] = decoded.role;

    console.log(`[Gateway Auth] ✅ Доступ дозволено для користувача: ${decoded.userId} (Роль: ${decoded.role})`);
    
    // Пропускаємо запит далі до мікросервісів
    next();
  } catch (error) {
    console.error(`[Gateway Auth] Невалідний токен`);
    res.status(403).json({ success: false, error: 'Токен недійсний або його термін дії минув.' });
  }
};