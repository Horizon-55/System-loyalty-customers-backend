import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { CustomerServiceClient, setResilienceConfig } from '../src/infrastructure/http/CustomerServiceClient.js';
import { PointService } from '../src/application/PointService.js';

// ============================================================================
// ЛАБОРАТОРНА РОБОТА №2 - Завдання 3: Автоматизація верифікації стійкості
// Верифікація Graceful Degradation, Retry Policy та Fallback через Test Double
// ============================================================================

describe('Resilience Engineering: Automated Verification', () => {
  let fakeServer: http.Server;
  let fakePort: number;
  let requestCount = 0;
  let responseMode: '200' | '500' | 'timeout' = '200';
  let pointService: PointService;
  let customerClient: CustomerServiceClient;

  before(async () => {
    // 1. ПІДГОТОВКА TEST DOUBLE: Створення детермінованого Fake HTTP Server
    fakeServer = http.createServer((req, res) => {
      requestCount++;
      const url = req.url || '';

      if (responseMode === '200') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'test-101', name: 'Verified Customer' }));
        return;
      }

      if (responseMode === '500') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Simulated Upstream Failure' }));
        return;
      }

      if (responseMode === 'timeout') {
        // Симуляція затримки, яка перевищує встановлений timeoutMs
        setTimeout(() => {
          if (!res.writableEnded) {
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Gateway Timeout' }));
          }
        }, 500);
        return;
      }
    });

    // Запуск test double на динамічному вільному порті
    await new Promise<void>((resolve) => {
      fakeServer.listen(0, '127.0.0.1', () => {
        const address = fakeServer.address() as any;
        fakePort = address.port;
        resolve();
      });
    });

    // 2. Ініціалізація тестованих компонентів із прив'язкою до test double
    customerClient = new CustomerServiceClient(`http://127.0.0.1:${fakePort}/api/v1/customers`);
    pointService = new PointService(customerClient);

    // Оптимізація затримок для миттєвого та детермінованого виконання тестів
    setResilienceConfig({
      enabled: true,
      maxRetries: 3,
      baseDelayMs: 15, // Швидкий backoff для тестів (15ms -> 30ms -> 60ms)
      timeoutMs: 150,  // Короткий таймаут для тестування відсікання
      useJitter: false, // Без рандомізації для 100% детермінізму
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => fakeServer.close(() => resolve()));
  });

  beforeEach(() => {
    requestCount = 0;
  });

  // --------------------------------------------------------------------------
  // Перевірка 1: Позитивний сценарій за нормальної відповіді залежності
  // --------------------------------------------------------------------------
  it('1. Positive Test: Сервіс повертає штатний результат і Fallback НЕ активується при 200 OK', async () => {
    responseMode = '200';

    const result = await pointService.getBalance('test-101');

    assert.equal(result.customerId, 'test-101');
    assert.equal(result.status, 'ACTIVE');
    assert.equal(result.tier, 'Premium');
    assert.equal(result.points, 1500);
    assert.equal(result.fallbackApplied, undefined, 'Fallback не повинен бути активований');
    assert.equal(requestCount, 1, 'Має бути виконано рівно 1 запит без жодних retry');
  });

  // --------------------------------------------------------------------------
  // Перевірка 2: Збій залежності (HTTP 500), верифікація Retry та Graceful Fallback
  // --------------------------------------------------------------------------
  it('2. Resilience Test: При HTTP 500 виконується рівно 3 retry та активується Graceful Fallback', async () => {
    responseMode = '500';

    const result = await pointService.getBalance('test-500');

    // Перевірка 1: Відсутність unhandled exception і наявність безпечного fallback-body
    assert.ok(result, 'Відповідь повинна бути отримана без вильоту процесу');
    assert.equal(result.status, 'DEGRADED', 'Статус відповіді має бути DEGRADED');
    assert.equal(result.tier, 'Standard (Offline Mode)', 'Рівень має бути переведений в безпечний режим');
    assert.equal(result.points, 0, 'Бали мають бути безпечно деградовані до 0');
    assert.equal(result.fallbackApplied, true, 'Прапорець fallbackApplied має бути true');
    assert.ok(result.warning.includes('Graceful Degradation'), 'Повинно бути присутнє діагностичне попередження');

    // Перевірка 2: Детермінована кількість retry-спроб (1 початковий + 3 повтори = 4)
    assert.equal(requestCount, 4, 'Має бути зафіксовано 1 початковий запит + рівно 3 повторні спроби retry');
  });

  // --------------------------------------------------------------------------
  // Перевірка 3: Збій залежності за таймаутом (Timeout)
  // --------------------------------------------------------------------------
  it('3. Resilience Test: При таймауті зовнішньої залежності спрацьовує переривання та Fallback', async () => {
    responseMode = 'timeout';

    const result = await pointService.getBalance('test-timeout');

    assert.equal(result.status, 'DEGRADED');
    assert.equal(result.fallbackApplied, true);
    assert.equal(requestCount, 4, 'При таймаутах також має бути відпрацьовано 3 повтори');
  });

  // --------------------------------------------------------------------------
  // Перевірка 4: Стан «ДО» (Без захисту) — підтвердження наявності каскадного падіння
  // --------------------------------------------------------------------------
  it('4. Baseline Test: Без захисту (resilience disabled) відбувається каскадний збій без retry', async () => {
    responseMode = '500';

    await assert.rejects(
      async () => {
        // Виклик із bypassResilience = true симулює стан «ДО» впровадження захисту
        await pointService.getBalance('test-bypass', true);
      },
      (err: any) => {
        assert.equal(err.statusCode, 500);
        assert.ok(err.message.includes('Каскадний збій системи'));
        return true;
      },
      'Без захисту має викидатися помилка каскадного падіння 500'
    );

    assert.equal(requestCount, 1, 'Без захисту retry не повинен виконуватися (рівно 1 спроба)');
  });
});
