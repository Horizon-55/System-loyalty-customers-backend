import axios, { AxiosInstance } from 'axios';
import { ICustomerServiceClient } from '../../application/ports/ICustomerServiceClient.js';
import { tracingContext } from '../../common/tracing/tracingContext.js';
import { AppError } from '../../common/middlewares/errors/AppError.js';

export interface ResilienceConfig {
  enabled: boolean;          // true = Стан «ПІСЛЯ» (захист увімкнено), false = Стан «ДО» (захист вимкнено)
  maxRetries: number;        // Максимальна кількість повторів (запобігання Retry Storm)
  baseDelayMs: number;       // Базова затримка для Exponential Backoff
  timeoutMs: number;         // Клієнтський таймаут одного запиту
  useJitter: boolean;        // Додавання рандомізованого зсуву для згладжування піків
}

// Поточна конфігурація стійкості за замовчуванням (Стан «ПІСЛЯ»)
export let activeResilienceConfig: ResilienceConfig = {
  enabled: true,
  maxRetries: 3,
  baseDelayMs: 150,
  timeoutMs: 2000,
  useJitter: true,
};

export const setResilienceConfig = (config: Partial<ResilienceConfig>) => {
  activeResilienceConfig = { ...activeResilienceConfig, ...config };
  console.log(`🛡️ [Resilience Config Updated]:`, activeResilienceConfig);
};

export interface CheckCustomerResult {
  exists: boolean;
  degraded: boolean;
  retryAttempts: number;
}

export class CustomerServiceClient implements ICustomerServiceClient {
  private baseUrl = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3001/api/v1/customers';
  private apiClient: AxiosInstance;

  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
    this.apiClient = axios.create();
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Перевірка існування клієнта із реалізацією патернів Retry, Exponential Backoff, Jitter та Fallback
   */
  public async checkCustomerExists(customerId: string, bypassResilience = false): Promise<boolean> {
    const isProtected = activeResilienceConfig.enabled && !bypassResilience;
    const correlationId = tracingContext.getStore() || 'trace-req';

    // =========================================================================
    // СТАН «ДО» ВПРОВАДЖЕННЯ ЗАХИСТУ (Resilience Disabled)
    // Жодних повторів, жодного Fallback — прямий запит, що падає каскадно
    // =========================================================================
    if (!isProtected) {
      console.warn(`⚠️ [CustomerClient | ${correlationId}] СТАН «ДО»: Виклик без механізму захисту (Retry/Fallback вимкнено)...`);
      try {
        const response = await this.apiClient.get(`${this.baseUrl}/${customerId}`, {
          timeout: 4000,
          headers: { 'x-correlation-id': correlationId },
          validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
        });

        if (response.status === 404) return false;
        return true;
      } catch (error: any) {
        console.error(`💥 [CustomerClient | ${correlationId}] СТАН «ДО»: Каскадний збій! Unhandled dependency error: ${error.message}`);
        throw new AppError(`Каскадний збій системи: Зовнішній сервіс клієнтів недоступний (${error.message})`, 500);
      }
    }

    // =========================================================================
    // СТАН «ПІСЛЯ» ВПРОВАДЖЕННЯ ЗАХИСТУ (Resilience Enabled)
    // 1. Обмежена кількість Retry (max 3)
    // 2. Exponential Backoff + Jitter для захисту від Retry Storm
    // 3. Graceful Fallback замість каскадного падіння
    // =========================================================================
    const { maxRetries, baseDelayMs, timeoutMs, useJitter } = activeResilienceConfig;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        if (attempt > 0) {
          console.log(`🔄 [CustomerClient | ${correlationId}] Retry спроба ${attempt}/${maxRetries} для клієнта ${customerId}...`);
        } else {
          console.log(`📤 [CustomerClient | ${correlationId}] Відправка запиту до Customer Service...`);
        }

        const response = await this.apiClient.get(`${this.baseUrl}/${customerId}`, {
          timeout: timeoutMs,
          headers: { 'x-correlation-id': correlationId },
          validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
        });

        // 404 — коректна бізнес-відповідь («клієнта немає»), а не аварія системи
        if (response.status === 404) {
          return false;
        }

        return true; // 200 OK — клієнт існує
      } catch (error: any) {
        attempt++;
        const isLastAttempt = attempt > maxRetries;
        const status = error.response?.status || error.code || 'TIMEOUT';

        console.warn(
          `⚠️ [CustomerClient | ${correlationId}] Спроба ${attempt - 1} зазнала невдачі (Статус/Код: ${status}).`
        );

        if (!isLastAttempt) {
          // РОЗРАХУНОК ЗАТРИМКИ: Exponential Backoff (base * 2^attempt) + Jitter
          const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
          const jitter = useJitter ? Math.floor(Math.random() * 50) : 0;
          const totalDelay = exponentialDelay + jitter;

          console.log(
            `⏳ [Retry Policy] Захист від Retry Storm: пауза ${totalDelay}ms (backoff: ${exponentialDelay}ms, jitter: ${jitter}ms)`
          );
          await this.sleep(totalDelay);
        } else {
          // =====================================================================
          // GRACEFUL FALLBACK (Всі спроби вичерпано)
          // Замість падіння в 500 — повідомляємо систему про контрольовану деградацію
          // =====================================================================
          console.error(
            `🚨 [Resilience] Вичерпано всі ${maxRetries} спроби Retry! Активуємо Graceful Degradation (Fallback)...`
          );
          // Викидаємо спеціальну Fallback-помилку для перехоплення шаром Application
          const fallbackError = new AppError('DEGRADED_FALLBACK_TRIGGERED', 503);
          (fallbackError as any).isFallback = true;
          throw fallbackError;
        }
      }
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}