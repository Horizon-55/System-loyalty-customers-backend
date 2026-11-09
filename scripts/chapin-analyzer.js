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

// ============================================================================
// СТАН «ПІСЛЯ» (Refactored Immutable Value Objects)
// Об'єкт: PointService.settleOrderLoyaltyTransaction(orderAmount, context, policy)
// ============================================================================
const REFACTORED_VARIABLE_INVENTORY = [
    {
        name: 'orderAmount',
        type: 'Money (VO)',
        roles: ['P'],
        assignedClass: 'P',
        justification: 'Імутабельний Value Object, передається як чисте пасивне посилання без мутацій'
    },
    {
        name: 'context',
        type: 'TransactionContext (VO)',
        roles: ['P'],
        assignedClass: 'P',
        justification: 'Імутабельний Value Object, містить усі аудиторські інваріанти, жодних мутацій чи умов'
    },
    {
        name: 'policy',
        type: 'LoyaltyRewardPolicy (VO)',
        roles: ['P'],
        assignedClass: 'P',
        justification: 'Імутабельний доменний об\'єкт бізнес-правил, виконує чисту детерміновану дію'
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

function printInventoryTable(inventory, title) {
    console.log(`\n### ${title}`);
    console.log('| #  | Variable Name          | Data Type             | Roles   | Chapin Class | Weight | Justification |');
    console.log('|:---|:-----------------------|:----------------------|:--------|:------------:|:------:|:--------------|');
    inventory.forEach((v, i) => {
        const num = String(i + 1).padEnd(2);
        const name = v.name.padEnd(22);
        const type = v.type.padEnd(21);
        const roles = v.roles.join(',').padEnd(7);
        const cls = v.assignedClass.padEnd(12);
        const weight = String(CHAPIN_WEIGHTS[v.assignedClass]).padEnd(6);
        console.log(`| ${num} | ${name} | ${type} | ${roles} | ${cls} | ${weight} | ${v.justification} |`);
    });
}

function runAudit() {
    console.log('================================================================================');
    console.log('   ENTERPRISE NED CHAPIN SEMANTIC DATA COMPLEXITY AUDIT & COMPARISON            ');
    console.log('================================================================================\n');

    const legacy = calculateChapin(LEGACY_VARIABLE_INVENTORY);
    const refactored = calculateChapin(REFACTORED_VARIABLE_INVENTORY);

    printInventoryTable(LEGACY_VARIABLE_INVENTORY, 'СТАН «ДО» (Legacy Mutable Primitives: PointService.settleOrderLoyaltyTransaction)');
    console.log(`  Підсумки ДО: C = ${legacy.counts.C}, M = ${legacy.counts.M}, P = ${legacy.counts.P}, T = ${legacy.counts.T}`);
    console.log(`  Формула ДО: C_ch = (1 * ${legacy.counts.P}) + (2 * ${legacy.counts.M}) + (3 * ${legacy.counts.C}) + (0.5 * ${legacy.counts.T}) = ${legacy.c_ch}`);

    printInventoryTable(REFACTORED_VARIABLE_INVENTORY, 'СТАН «ПІСЛЯ» (Refactored Immutable Value Objects: PointService.settleOrderLoyaltyTransaction)');
    console.log(`  Підсумки ПІСЛЯ: C = ${refactored.counts.C}, M = ${refactored.counts.M}, P = ${refactored.counts.P}, T = ${refactored.counts.T}`);
    console.log(`  Формула ПІСЛЯ: C_ch = (1 * ${refactored.counts.P}) + (2 * ${refactored.counts.M}) + (3 * ${refactored.counts.C}) + (0.5 * ${refactored.counts.T}) = ${refactored.c_ch}`);

    const reductionPercent = (((legacy.c_ch - refactored.c_ch) / legacy.c_ch) * 100).toFixed(2);

    console.log('\n================================================================================');
    console.log('   ПОРІВНЯЛЬНИЙ ЗВЕДЕНИЙ АНАЛІЗ ЕФЕКТИВНОСТІ РЕФАКТОРИНГУ (AUDIT SUMMARY)      ');
    console.log('================================================================================');
    console.log(`- Початкова складність Чепіна (Baseline)   : C_ch = ${legacy.c_ch} (Критичний поріг > 10)`);
    console.log(`- Оптимізована складність (Refactored)     : C_ch = ${refactored.c_ch} (Цільовий норматив <= 6.0)`);
    console.log(`- Відносне зниження інформаційного хаосу  : -${reductionPercent}% (Вимога методички: >= 50%)`);
    console.log(`- Змінні модифікації стану (Клас M)        : ${legacy.counts.M} -> ${refactored.counts.M} (Повна ліквідація M = 0)`);
    console.log(`- Керуючі змінні розгалужень (Клас C)      : ${legacy.counts.C} -> ${refactored.counts.C} (Інкапсульовано у Value Objects)`);
    console.log('================================================================================\n');

    return { legacy, refactored, reductionPercent };
}

if (require.main === module) {
    runAudit();
}

module.exports = {
    calculateChapin,
    LEGACY_VARIABLE_INVENTORY,
    REFACTORED_VARIABLE_INVENTORY,
    CHAPIN_WEIGHTS,
    runAudit
};
