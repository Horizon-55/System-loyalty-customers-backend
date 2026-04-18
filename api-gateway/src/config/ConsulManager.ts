import Consul from 'consul';

// Підключаємося до локального Consul
const consul = new Consul({
  host: '127.0.0.1',
  port: 8500,
});

export class ConsulManager {
  // Тут ми будемо зберігати поточні налаштування
  public static currentConfig: any = {};

  // Метод для початкового завантаження
  public static async init(environment: string = 'dev') {
    try {
      console.log(`[Consul] Звертаємося до Consul Server...`);

      // 1. Отримуємо загальні налаштування (Application)
      const appItem: any = await consul.kv.get('config/application');
      const appConfig = appItem ? JSON.parse(appItem.Value) : {};

      // 2. Отримуємо налаштування середовища (DEV або PROD)
      const envItem: any = await consul.kv.get(`config/api-gateway/${environment}`);
      const envConfig = envItem ? JSON.parse(envItem.Value) : {};

      // 3. Зливаємо їх разом (Налаштування середовища перезаписують загальні)
      this.currentConfig = { ...appConfig, ...envConfig };

      console.log(`[Consul] Конфігурацію успішно завантажено (Профіль: ${environment})`);
      console.log(`[Consul] Поточні параметри:`, this.currentConfig);

    } catch (error) {
      console.error(`[Consul] Помилка завантаження конфігурацій:`, error);
      // У реальному житті тут можна зробити fallback на локальний .env
    }
  }

  // Метод для динамічного оновлення (Runtime Refresh)
  public static startWatching(environment: string = 'dev', intervalMs: number = 5000) {
    console.log(`[Consul] Запущено спостерігач за змінами (інтервал: ${intervalMs}мс)...`);

    setInterval(async () => {
      try {
        // Завантажуємо свіжі дані
        const appItem: any = await consul.kv.get('config/application');
        const appConfig = appItem ? JSON.parse(appItem.Value) : {};

        const envItem: any = await consul.kv.get(`config/api-gateway/${environment}`);
        const envConfig = envItem ? JSON.parse(envItem.Value) : {};

        const newConfig = { ...appConfig, ...envConfig };

        // Порівнюємо старі та нові налаштування
        // (Спрощений варіант порівняння через перетворення в рядок)
        if (JSON.stringify(this.currentConfig) !== JSON.stringify(newConfig)) {
          console.log(`\n[Consul] УВАГА! Виявлено зміни в центральному сховищі!`);
          this.currentConfig = newConfig; // Оновлюємо конфіг у пам'яті
          console.log(`[Consul] Нові параметри застосовано:`, this.currentConfig);
        }
      } catch (error) {
        console.error(`[Consul] Помилка під час перевірки оновлень:`, error);
      }
    }, intervalMs);
  }

  // Метод для отримання секретів (викликається окремо, не логується)
  public static async getSecret(secretPath: string): Promise<any> {
    try {
      const item: any = await consul.kv.get(secretPath);
      if (item && item.Value) 
         return JSON.parse(item.Value);
      return null;
    } catch (error) {
      console.error(`[Consul] Помилка отримання секрету: ${secretPath}`, error);
      return null;
    }
  }
}