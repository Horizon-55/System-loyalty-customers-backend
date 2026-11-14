#!/usr/bin/env node
/**
 * Lab 9 / Task 2 — Software Economics Financial Simulator (Node.js)
 *
 * Читає сирий SQALE-JSON, зафіксований у Завданні 1 через SonarQube Cloud REST API,
 * та симулює інвестиційний цикл повного remediation-рефакторингу системи:
 *
 *   Principal (Тіло боргу)  = (sqale_index / 60) x HOURLY_RATE x OVERLOAD_COEFF
 *   Cost of Delay (1 міс)   = (ncloc / 100) x 1 інженер-год x HOURLY_RATE x OVERLOAD_COEFF
 *   NPV(t)                  = SUM(i=1..t)[ CoD / (1 + DISCOUNT_RATE)^i ] - Principal
 *
 * Локалізує точку окупності (Payback Period: перший t, де NPV(t) > 0) та
 * автоматично генерує FINANCIAL_LEDGER.md у корінь проєкту з вердиктом
 * Quality Gate: PASS (NPV у плюсі на дистанції 6 міс) або FAIL.
 *
 * Environment Variables:
 *   REPORT_JSON     шлях до сирого JSON Завдання 1
 *                   (default: reports/sonarcloud-api/sqale-raw-measures.json)
 *   HOURLY_RATE     погодинна ставка інженера, USD (індустріальний діапазон 35..50)
 *   OVERLOAD_COEFF  коефіцієнт накладних витрат компанії (default: 1.3)
 *   DISCOUNT_RATE   щомісячний коефіцієнт знецінення грошей (default: 0.01)
 */

const fs = require('fs');
const path = require('path');

// --- Конфігураційні змінні оточення (Environment Variables) -------------------
const REPORT_JSON = process.env.REPORT_JSON || 'reports/sonarcloud-api/sqale-raw-measures.json';
const HOURLY_RATE = Number(process.env.HOURLY_RATE || 45);
const OVERLOAD_COEFF = Number(process.env.OVERLOAD_COEFF || 1.3);
const DISCOUNT_RATE = Number(process.env.DISCOUNT_RATE || 0.01);

const HORIZON_MONTHS = 6;               // інвестиційна дистанція симуляції
const MINUTES_PER_HOUR = 60;            // SQALE: борг рахується в інженерних хвилинах
const HOURS_PER_WORK_DAY = 8;           // робочий день інженера
const HOURS_PER_100_LOC_PER_MONTH = 1;  // індустріальне правило: 1 інженер-год/міс за кожні 100 ncloc
const MIN_RATE = 35;
const MAX_RATE = 50;

const repoRoot = path.join(__dirname, '..');
const reportPath = path.isAbsolute(REPORT_JSON)
    ? REPORT_JSON
    : path.join(repoRoot, REPORT_JSON);
const ledgerPath = path.join(repoRoot, 'FINANCIAL_LEDGER.md');

const log = (msg) => console.log(`[FIN-SIM] ${msg}`);

// --- Крок 1. Парсинг сирих SQALE-даних з JSON Завдання 1 ----------------------
function loadSqaleMeasures(reportFile) {
    if (!fs.existsSync(reportFile)) {
        throw new Error(`Файл звіту не знайдено: ${reportFile}`);
    }
    const raw = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    const measures = (raw.component && raw.component.measures) || [];
    const pick = (metric) => {
        const entry = measures.find((m) => m.metric === metric);
        if (!entry) {
            throw new Error(`Метрика "${metric}" відсутня у ${reportFile} — виконайте Завдання 1`);
        }
        return Number(entry.value);
    };
    return { ncloc: pick('ncloc'), sqaleIndexMinutes: pick('sqale_index'), rating: measures.find((m) => m.metric === 'sqale_rating') };
}

// --- Крок 2. Фінансове ядро: Тіло боргу та Cost of Delay (FAIL-стан) ----------
function computePrincipal(sqaleIndexMinutes) {
    return (sqaleIndexMinutes / MINUTES_PER_HOUR) * HOURLY_RATE * OVERLOAD_COEFF;
}

function computeCostOfDelay(ncloc) {
    return (ncloc / 100) * HOURS_PER_100_LOC_PER_MONTH * HOURLY_RATE * OVERLOAD_COEFF;
}

// --- Крок 3. Інвестиційний цикл NPV (PASS-стан) -------------------------------
function simulateNpvCycle(principal, costOfDelay) {
    const rows = [];
    let cumulative = 0;
    let paybackMonth = null;
    for (let t = 1; t <= HORIZON_MONTHS; t += 1) {
        const discountFactor = Math.pow(1 + DISCOUNT_RATE, t);
        const discountedProfit = costOfDelay / discountFactor;
        cumulative += discountedProfit;
        const npv = cumulative - principal;
        if (npv > 0 && paybackMonth === null) {
            paybackMonth = t; // локалізація точки окупності
        }
        rows.push({ month: t, discountFactor, discountedProfit, npv });
    }
    return { rows, paybackMonth };
}

// --- Крок 4. Генерація Ledger-артефакту ---------------------------------------
function formatUsd(value) {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildLedger(ctx) {
    const { ncloc, sqaleIndexMinutes, debtHours, debtDays, principal, costOfDelay, cycle } = ctx;
    const lines = [];
    lines.push('# 💰 SOFTWARE ECONOMICS & FINANCIAL QUALITY LEDGER');
    lines.push('');
    lines.push('> **Лабораторна робота №9 / Завдання 2** — Інженерія якості та супровід програмних систем.');
    lines.push(`> Файл згенеровано автоматизованою утилітою \`scripts/financial-simulator.js\` (Node.js) — ${new Date().toISOString()}.`);
    lines.push(`> Джерело даних: сирий JSON SonarQube Cloud REST API (\`${path.relative(repoRoot, reportPath).replace(/\\/g, '/')}\`).`);
    lines.push('');
    lines.push('## 1. Вхідні параметри аудиту (System Baseline)');
    lines.push('');
    lines.push('| Параметр | Значення |');
    lines.push('| :--- | :--- |');
    lines.push(`| Назва аналізованого проєкту (Key) | \`typeorm_typeorm\` (organization: \`typeorm\`) |`);
    lines.push(`| Масштаб системи (NCLOC) | ${ncloc.toLocaleString('en-US')} |`);
    lines.push(`| Початковий технічний борг (SQALE Index) | ${sqaleIndexMinutes.toLocaleString('en-US')} інженерних хвилин (${debtHours.toFixed(2)} год / ${debtDays.toFixed(2)} людино-днів) |`);
    lines.push(`| Погодинна ставка HOURLY_RATE | ${formatUsd(HOURLY_RATE)}/год |`);
    lines.push(`| Коефіцієнт накладних витрат OVERLOAD_COEFF | ${OVERLOAD_COEFF} |`);
    lines.push(`| Щомісячний дисконт DISCOUNT_RATE | ${DISCOUNT_RATE} (1%) |`);
    lines.push('');
    lines.push('## 2. Капіталізація інвестиційних маркерів');
    lines.push('');
    lines.push('| Маркер | Формула | Значення |');
    lines.push('| :--- | :--- | ---: |');
    lines.push(`| Тіло боргу (Вартість рефакторингу / Principal) | (sqale_index / 60) × RATE × OVERLOAD | **${formatUsd(principal)}** |`);
    lines.push(`| Щомісячні збитки від бездіяльності (Cost of Delay) | (ncloc / 100) × 1 год × RATE × OVERLOAD | **${formatUsd(costOfDelay)}/міс** |`);
    lines.push('');
    lines.push('## 3. Динаміка окупності інвестицій у часі (6 ітерацій розробки)');
    lines.push('');
    lines.push('| Місяць t | Коефіцієнт дисконтування (1 + r)^t | Щомісячний прибуток (дисконтований), $ | Кумулятивний індекс NPV, $ |');
    lines.push('| :---: | :---: | ---: | ---: |');
    for (const row of cycle.rows) {
        lines.push(`| ${row.month} | ${row.discountFactor.toFixed(4)} | ${formatUsd(row.discountedProfit)} | ${formatUsd(row.npv)} |`);
    }
    lines.push('');
    lines.push('## 4. Фінальний інженерно-економічний вердикт');
    lines.push('');
    if (cycle.paybackMonth) {
        lines.push(`**Точка виходу в нуль (Payback Period): окупність наступить на ${cycle.paybackMonth} місяці розробки.**`);
    } else {
        lines.push('**Точка окупності не досягнута на дистанції 6 місяців.**');
    }
    lines.push('');
    lines.push('## 5. СТАТУС ВОРІТ ЯКОСТІ (Quality Gate)');
    lines.push('');
    if (cycle.paybackMonth) {
        lines.push(`## ✅ **PASS** — NPV вийшов у позитивну зону на місяці ${cycle.paybackMonth} (дистанція ${HORIZON_MONTHS} міс). Рефакторинг фінансово обґрунтований.`);
    } else {
        lines.push(`## ❌ **FAIL** — NPV залишився негативним після ${HORIZON_MONTHS} місяців. ⚠️ Архітектурне попередження: технічний борг занадто великий відносно грошового потоку — інвестувати в повний remediation наразі недоцільно.`);
    }
    lines.push('');
    return lines.join('\n');
}

// --- Головний контур симулятора ------------------------------------------------
function main() {
    log('Software Economics Financial Simulator (Lab 9 / Task 2, Node.js)');
    log(`Report JSON : ${path.relative(repoRoot, reportPath).replace(/\\/g, '/')}`);
    log(`HOURLY_RATE : ${formatUsd(HOURLY_RATE)}/h | OVERLOAD_COEFF: ${OVERLOAD_COEFF} | DISCOUNT_RATE: ${DISCOUNT_RATE}`);

    if (HOURLY_RATE < MIN_RATE || HOURLY_RATE > MAX_RATE) {
        console.warn(`[FIN-SIM] ⚠️ HOURLY_RATE = ${HOURLY_RATE} поза індустріальним діапазоном $${MIN_RATE}–$${MAX_RATE}/год`);
    }

    const { ncloc, sqaleIndexMinutes } = loadSqaleMeasures(reportPath);
    log(`Parsed SQALE measures: ncloc=${ncloc}, sqale_index=${sqaleIndexMinutes} min`);

    const debtHours = sqaleIndexMinutes / MINUTES_PER_HOUR;
    const debtDays = debtHours / HOURS_PER_WORK_DAY;
    const principal = computePrincipal(sqaleIndexMinutes);
    const costOfDelay = computeCostOfDelay(ncloc);
    log(`Debt volume : ${debtHours.toFixed(2)} h (${debtDays.toFixed(2)} person-days)`);
    log(`Principal (Remediation Cost)      : ${formatUsd(principal)}`);
    log(`Cost of Delay (monthly losses)    : ${formatUsd(costOfDelay)}/month`);

    const cycle = simulateNpvCycle(principal, costOfDelay);
    for (const row of cycle.rows) {
        log(`t=${row.month} | DF=${row.discountFactor.toFixed(4)} | Profit=${formatUsd(row.discountedProfit)} | NPV=${formatUsd(row.npv)}`);
    }

    const verdict = cycle.paybackMonth ? 'PASS' : 'FAIL';
    log(`Payback Period: ${cycle.paybackMonth ? `month ${cycle.paybackMonth}` : 'not reached in ' + HORIZON_MONTHS + ' months'}`);
    log(`QUALITY GATE VERDICT: ${verdict}`);

    const ctx = {
        ncloc,
        sqaleIndexMinutes,
        debtHours,
        debtDays,
        principal,
        costOfDelay,
        cycle,
    };
    fs.writeFileSync(ledgerPath, buildLedger(ctx), 'utf8');
    log(`FINANCIAL_LEDGER.md generated successfully -> ${ledgerPath}`);
    log(`System message: financial quality ledger created, gate ${verdict}`);

    if (verdict === 'FAIL') {
        process.exitCode = 2; // ворота якості зачинені для CI/CD
    }
}

main();
