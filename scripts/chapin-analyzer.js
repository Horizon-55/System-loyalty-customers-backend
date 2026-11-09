/**
 * Enterprise Ned Chapin Semantic Data Complexity Analyzer
 * Analyzes variables and computes Chapin Information Complexity Index (C_ch)
 * Formula: C_ch = 1*P + 2*M + 3*C + 0.5*T
 * Hierarchy priority: C > M > P > T
 */

const CHAPIN_WEIGHTS = {
    C: 3.0, // Control variables
    M: 2.0, // Modified variables
    P: 1.0, // Input / Passive variables
    T: 0.5  // Transit variables
};

// ============================================================================
// СТАН «ДО» (Legacy Mutable Transactional Settlement)
// Об'єкт: PointService.settleOrderLoyaltyTransaction (CC = 5 <= 5)
// ============================================================================
const LEGACY_VARIABLE_INVENTORY = [
    {
        name: 'rawAmount',
        type: 'number',
        roles: ['P', 'C'],
        assignedClass: 'C',
        justification: 'Вхідний аргумент, але бере участь у контролі if (rawAmount <= 0) -> пріоритет C'
    },
    {
        name: 'currency',
        type: 'string',
        roles: ['P', 'C'],
        assignedClass: 'C',
        justification: 'Вхідний аргумент, бере участь в умові if (currency !== "UAH") -> пріоритет C'
    },
    {
        name: 'discountPercentage',
        type: 'number',
        roles: ['P', 'C'],
        assignedClass: 'C',
        justification: 'Вхідний аргумент, контролюється умовою if (discountPercentage > 100) -> пріоритет C'
    },
    {
        name: 'channel',
        type: 'string',
        roles: ['P', 'C'],
        assignedClass: 'C',
        justification: 'Вхідний аргумент, керує вибором тегу аудиту if (channel === "MOBILE_APP") -> пріоритет C'
    },
    {
        name: 'taxRate',
        type: 'number',
        roles: ['P'],
        assignedClass: 'P',
        justification: 'Вхідне пасивне значення для розрахунку ПДВ, без мутацій і перевірок'
    },
    {
        name: 'bonusMultiplier',
        type: 'number',
        roles: ['P'],
        assignedClass: 'P',
        justification: 'Вхідний пасивний коефіцієнт нарахування бонусів, без мутацій'
    },
    {
        name: 'customerId',
        type: 'string',
        roles: ['T'],
        assignedClass: 'T',
        justification: 'Транзитний ідентифікатор клієнта, передається у результат без змін'
    },
    {
        name: 'orderId',
        type: 'string',
        roles: ['T'],
        assignedClass: 'T',
        justification: 'Транзитний ідентифікатор чека замовлення, передається без змін'
    },
    {
        name: 'correlationId',
        type: 'string',
        roles: ['T'],
        assignedClass: 'T',
        justification: 'Транзитний маркер трасування запиту'
    },
    {
        name: 'discountAmount',
        type: 'number',
        roles: ['M'],
        assignedClass: 'M',
        justification: 'Локальна змінна (let), ініціалізується 0 і перезаписується обчисленою знижкою'
    },
    {
        name: 'taxableAmount',
        type: 'number',
        roles: ['M'],
        assignedClass: 'M',
        justification: 'Локальна змінна (let), перезаписується базою оподаткування (raw - discount)'
    },
    {
        name: 'taxAmount',
        type: 'number',
        roles: ['M'],
        assignedClass: 'M',
        justification: 'Локальна змінна (let), перезаписується сумою нарахованого податку'
    },
    {
        name: 'finalPayable',
        type: 'number',
        roles: ['M'],
        assignedClass: 'M',
        justification: 'Локальна змінна (let), перезаписується фінальною сумою до оплати'
    },
    {
        name: 'rewardPoints',
        type: 'number',
        roles: ['M'],
        assignedClass: 'M',
        justification: 'Локальна змінна (let), перезаписується кількістю нарахованих балів'
    },
    {
        name: 'status',
        type: 'string',
        roles: ['M'],
        assignedClass: 'M',
        justification: 'Локальна змінна (let), перезаписується з INITIALIZED на SETTLED'
    },
    {
        name: 'auditChannelTag',
        type: 'string',
        roles: ['M'],
        assignedClass: 'M',
        justification: 'Локальна змінна (let), мутується в умові на DIGITAL або IN_STORE'
    }
];

function calculateChapin(inventory) {
    const counts = { P: 0, M: 0, C: 0, T: 0 };
    inventory.forEach(item => {
        counts[item.assignedClass] = (counts[item.assignedClass] || 0) + 1;
    });

    const c_ch = (CHAPIN_WEIGHTS.P * counts.P) +
                 (CHAPIN_WEIGHTS.M * counts.M) +
                 (CHAPIN_WEIGHTS.C * counts.C) +
                 (CHAPIN_WEIGHTS.T * counts.T);

    return { counts, c_ch };
}

function runAudit() {
    console.log('================================================================');
    console.log('  NED CHAPIN SEMANTIC DATA COMPLEXITY AUDIT (LABORATORY WORK 7)');
    console.log('================================================================\n');

    console.log('Target Method: PointService.settleOrderLoyaltyTransaction');
    console.log('McCabe Cyclomatic Complexity: CC = 5 (Low Topological Complexity, CC <= 5)');
    console.log('Examined Variable Count: ' + LEGACY_VARIABLE_INVENTORY.length + ' variables\n');

    const result = calculateChapin(LEGACY_VARIABLE_INVENTORY);

    console.log('| #  | Variable Name          | Data Type | Roles   | Chapin Class | Weight | Justification |');
    console.log('|:---|:-----------------------|:----------|:--------|:------------:|:------:|:--------------|');
    LEGACY_VARIABLE_INVENTORY.forEach((v, i) => {
        const num = String(i + 1).padEnd(2);
        const name = v.name.padEnd(22);
        const type = v.type.padEnd(9);
        const roles = v.roles.join(',').padEnd(7);
        const cls = v.assignedClass.padEnd(12);
        const weight = String(CHAPIN_WEIGHTS[v.assignedClass]).padEnd(6);
        console.log(`| ${num} | ${name} | ${type} | ${roles} | ${cls} | ${weight} | ${v.justification} |`);
    });

    console.log('\n--- Group Counts by Chapin Classes ---');
    console.log(`  - Control (C, weight 3.0) : ${result.counts.C} variables -> Subtotal: ${result.counts.C * CHAPIN_WEIGHTS.C}`);
    console.log(`  - Modified (M, weight 2.0): ${result.counts.M} variables -> Subtotal: ${result.counts.M * CHAPIN_WEIGHTS.M}`);
    console.log(`  - Passive (P, weight 1.0) : ${result.counts.P} variables -> Subtotal: ${result.counts.P * CHAPIN_WEIGHTS.P}`);
    console.log(`  - Transit (T, weight 0.5) : ${result.counts.T} variables -> Subtotal: ${result.counts.T * CHAPIN_WEIGHTS.T}`);

    console.log('\n--- Chapin Complexity Formula Calculation ---');
    console.log(`  C_ch = (1 * P) + (2 * M) + (3 * C) + (0.5 * T)`);
    console.log(`  C_ch = (1 * ${result.counts.P}) + (2 * ${result.counts.M}) + (3 * ${result.counts.C}) + (0.5 * ${result.counts.T})`);
    console.log(`  C_ch = ${result.counts.P * 1} + ${result.counts.M * 2} + ${result.counts.C * 3} + ${result.counts.T * 0.5} = ${result.c_ch}`);

    console.log('\n--- Engineering Assessment ---');
    if (result.c_ch > 10) {
        console.log(`🚨 CRITICAL DATA CHAOS: C_ch = ${result.c_ch} > 10.0 (Enterprise Risk Threshold Exceeded!).`);
        console.log('   The method has low cyclomatic complexity (CC=5), but extreme data entanglement.');
        console.log('   High proportion of mutable M-variables (7) introduces critical vulnerability to mutation bugs.');
    } else {
        console.log(`✓ SAFE: C_ch = ${result.c_ch} <= 10.0.`);
    }
}

if (require.main === module) {
    runAudit();
}

module.exports = { calculateChapin, LEGACY_VARIABLE_INVENTORY, CHAPIN_WEIGHTS };

