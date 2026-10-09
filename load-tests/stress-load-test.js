import http from 'k6/http';
import { check, sleep } from 'k6';

// ========================================================================
// ЛАБОРАТОРНА РОБОТА №2 - Завдання 1: Performance Testing та валідація SLO
// РЕЖИМ 2: Підвищене / стресове навантаження -> Очікуваний статус: FAIL
// ========================================================================
// Мета: продемонструвати контрольоване порушення встановлених критеріїв якості
// (SLO Violation), коли час p95 або частота відмов перевищує допустимий ліміт.

export const options = {
  // Агресивна модель навантаження з великою кількістю паралельних VUs без think-time
  stages: [
    { duration: '3s', target: 50 },  // Стрімкий Ramp-up до 50 VUs
    { duration: '8s', target: 100 }, // Стресовий пік: 100 паралельних VUs
    { duration: '2s', target: 0 },   // Швидкий спад
  ],

  // Суворі SLO thresholds для фіксації порушення під час стрес-навантаження:
  // p95 має бути < 15ms (умова, яка гарантовано не виконується при 100 VUs на один Node.js процес)
  // або рівень помилок перевищує 0.5%
  thresholds: {
    http_req_duration: ['p(95)<15'],  // Жорсткий поріг 15 мс -> FAIL під навантаженням
    http_req_failed: ['rate<0.005'],  // Поріг помилок 0.5%
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3002/api/v1/points';

export default function () {
  const customerId = 'cust-stress-999';

  const res = http.get(`${BASE_URL}/${customerId}`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'k6-stress-agent',
    },
    timeout: '3s',
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  // Мінімальна пауза для створення максимального тиску на Event Loop
  sleep(0.01);
}
