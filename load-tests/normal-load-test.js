import http from 'k6/http';
import { check, sleep } from 'k6';

// ========================================================================
// ЛАБОРАТОРНА РОБОТА №2 - Завдання 1: Performance Testing та валідація SLO
// РЕЖИМ 1: Нормальне навантаження (Normal Load) -> Очікуваний статус: PASS
// ========================================================================

export const options = {
  // Модель навантаження: плавний вихід на 10 віртуальних користувачів
  stages: [
    { duration: '3s', target: 5 },   // Ramp-up: 0 -> 5 VUs
    { duration: '10s', target: 10 }, // Steady-state: стабільне навантаження 10 VUs
    { duration: '2s', target: 0 },   // Ramp-down: плавне завершення
  ],

  // Формалізовані числові SLO (Service Level Objectives)
  // 1. p95 часу відповіді <= 150 ms (ISO/IEC 25010 Time Behaviour)
  // 2. Рівень помилок (Error Rate) < 1% (ISO/IEC 25010 Fault Tolerance)
  thresholds: {
    http_req_duration: ['p(95)<150'], // 95% запитів мають виконуватися швидше 150мс
    http_req_failed: ['rate<0.01'],   // Менше 1% помилкових HTTP відповідей
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3002/api/v1/points';

export default function () {
  // Тестовий ідентифікатор клієнта
  const customerId = 'cust-test-101';
  
  const res = http.get(`${BASE_URL}/${customerId}`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'k6-load-test-agent',
    },
    timeout: '5s',
  });

  // Автоматична валідація коректності відповіді
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has points data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && body.points !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  // Пауза між запитами одного віртуального користувача (імітація мислення користувача - think time)
  sleep(0.1);
}
