import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import CircuitBreaker from 'opossum';
import { ICustomerServiceClient } from '../../application/ports/ICustomerServiceClient.js';
import { tracingContext } from '../../common/tracing/tracingContext.js';
import { AppError } from '../../common/middlewares/errors/AppError.js';

export class CustomerServiceClient implements ICustomerServiceClient {
  // Беремо URL сусіднього сервісу зі змінних середовища
  private baseUrl = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3001/api/v1/customers';
  private breaker: CircuitBreaker<[string], boolean>;
  private apiClient: AxiosInstance;

  constructor() {
    //1 створюємо API Client
    this.apiClient = axios.create({ timeout: 3000 });
      // ДОДАЄМО INTERCEPTOR ДЛЯ TRACING
     this.apiClient.interceptors.request.use((config) => {
        // Дістаємо поточний Correlation ID з нашого сховища
        const correlationId = tracingContext.getStore();
        
        if (correlationId) {
          // Додаємо його в заголовки вихідного запиту!
          config.headers['x-correlation-id'] = correlationId;
          console.log(`[${correlationId}] 📤 Відправка запиту до Customer Service...`);
        }
        
        return config;
      });
    //2 три спроби
    axiosRetry(this.apiClient, { retries: 3,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error) => {
            return axiosRetry.isNetworkOrIdempotentRequestError(error) || (error.response?.status || 0) >= 500; //500 це помилка сервера
        }
     });
    //3 Circuit Breaker
    this.breaker = new CircuitBreaker(this.makeHttpRequest.bind(this), {
      timeout: 1000, //1 секунда
      errorThresholdPercentage: 50, //50% помилок
      resetTimeout: 5000 //5 секунд
    });

    // Тестування надійності: налаштування Fallback (запасного плану), якщо сервіс лежить
    this.breaker.fallback(() => {
        console.warn('⚠️ [Circuit Breaker] Ланцюг розірвано! Customer Service перевантажений або недоступний.');
        throw new AppError('Сервіс клієнтів тимчасово недоступний. Спробуйте пізніше.', 503);
      });
  }

  public async checkCustomerExists(customerId: string): Promise<boolean> {
    try {
        // Викликаємо функцію не напряму, а через Circuit Breaker (fire) щоб обробляти помилки
        return await this.breaker.fire(customerId);
      } catch (error: unknown) {
        // Якщо це просто 404 (клієнта немає), це нормальна бізнес-логіка, а не збій системи
        if (axios.isAxiosError(error) && error.response?.status === 404) 
          return false; 

        if (error instanceof AppError) {
          throw error;
        }

        if (axios.isAxiosError(error) && (!error.response || error.response.status >= 500)) {
          throw new AppError('Сервіс клієнтів тимчасово недоступний. Спробуйте пізніше.', 503);
        }

        throw new AppError('Не вдалося перевірити клієнта через внутрішню помилку.', 500);
      }
  }

  private async makeHttpRequest(customerId: string): Promise<boolean> {
    const response = await this.apiClient.get(`${this.baseUrl}/${customerId}`);
    return response.status === 200; //200 це OK
  }
}