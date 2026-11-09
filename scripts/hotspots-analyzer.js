/**
 * Synergistic Hotspots Matrix & Git Code Churn Analyzer (Laboratory Work 7)
 * Cross-references McCabe/Halstead Complexity with Git Code Churn
 * Classifies repository files into 4 Risk Quadrants:
 * 1. Hotspots (Red): High Complexity + High Churn (Critical Defect Risk!)
 * 2. Sleeping Danger (Yellow): High Complexity + Low Churn (Latent Hazard)
 * 3. Active Development (Green): Low Complexity + High Churn (Safe Agile Evolution)
 * 4. Stable Code (Gray): Low Complexity + Low Churn (Reliable Foundation)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { analyzeFile } = require('./complexity-analyzer.js');

// Thresholds for 4-quadrant classification
const CHURN_THRESHOLD = 3;  // > 3 commits = High Churn
const COMPLEXITY_THRESHOLD_CC = 8; // Max CC >= 8 or Effort > 35,000 = High Complexity

const TARGET_FILES = [
    {
        name: 'CustomersController.ts',
        path: 'customer-service/src/modules/customers/Api/CustomersController.ts',
        layer: 'Integration / API Controller',
        service: 'customer-service'
    },
    {
        name: 'CustomerServiceClient.ts',
        path: 'point-service/src/infrastructure/http/CustomerServiceClient.ts',
        layer: 'Integration / Resilience HTTP Client',
        service: 'point-service'
    },
    {
        name: 'PiiSanitizer.ts',
        path: 'customer-service/src/common/logging/PiiSanitizer.ts',
        layer: 'Utility / Security Masking Engine',
        service: 'customer-service'
    },
    {
        name: 'PointService.ts',
        path: 'point-service/src/application/PointService.ts',
        layer: 'Core Domain / Transactional Business Logic',
        service: 'point-service'
    },
    {
        name: 'PointRoutes.ts',
        path: 'point-service/src/api/PointRoutes.ts',
        layer: 'Routing / HTTP Dispatcher',
        service: 'point-service'
    },
    {
        name: 'Money.ts',
        path: 'point-service/src/domain/Money.ts',
        layer: 'Domain / Immutable Value Object',
        service: 'point-service'
    }
];

function getFileChurn(filePath) {
    try {
        const out = execSync(`git log --format=oneline -- "${filePath}"`, { encoding: 'utf8' }).trim();
        if (!out) return 0;
        return out.split('\n').filter(line => line.trim().length > 0).length;
    } catch (e) {
        return 0;
    }
}

function determineQuadrant(churn, maxCC, effort) {
    const isHighChurn = churn >= CHURN_THRESHOLD;
    const isHighComplexity = maxCC >= COMPLEXITY_THRESHOLD_CC || effort >= 40000;

    if (isHighChurn && isHighComplexity) {
        return {
            id: 'HOTSPOT_RED',
            quadrant: 'Hotspot (Червона зона)',
            riskLevel: 'CRITICAL',
            action: 'Терміновий рефакторинг та декомпозиція, покриття інтеграційними тестами'
        };
    } else if (!isHighChurn && isHighComplexity) {
        return {
            id: 'SLEEPING_DANGER_YELLOW',
            quadrant: 'Sleeping Danger (Жовта зона)',
            riskLevel: 'HIGH_LATENT',
            action: 'Спляча міна. Заборонено модифікувати без попереднього модульного тестування'
        };
    } else if (isHighChurn && !isHighComplexity) {
        return {
            id: 'ACTIVE_DEV_GREEN',
            quadrant: 'Active Development (Зелена зона)',
            riskLevel: 'LOW_HEALTHY',
            action: 'Здорова інтенсивна розробка. Код часто змінюється, але залишається чистим'
        };
    } else {
        return {
            id: 'STABLE_GRAY',
            quadrant: 'Stable Code (Сіра зона)',
            riskLevel: 'NEGLIGIBLE',
            action: 'Стабільне ядро системи. Не потребує втручання'
        };
    }
}

function runHotspotsAnalysis() {
    console.log('================================================================================');
    console.log('  SYNERGISTIC HOTSPOTS MATRIX: COMPLEXITY vs CODE CHURN (LAB WORK 7)           ');
    console.log('================================================================================\n');

    const results = [];

    TARGET_FILES.forEach(target => {
        const fullPath = path.resolve(process.cwd(), target.path);
        if (!fs.existsSync(fullPath)) {
            console.warn(`File not found: ${target.path}`);
            return;
        }

        const metrics = analyzeFile(fullPath);
        const churn = getFileChurn(target.path);
        const classification = determineQuadrant(churn, metrics.cyclomatic.maxCC, metrics.halstead.effort);

        results.push({
            fileName: target.name,
            filePath: target.path,
            layer: target.layer,
            service: target.service,
            sloc: metrics.sloc,
            churnCommits: churn,
            maxCC: metrics.cyclomatic.maxCC,
            totalCC: metrics.cyclomatic.totalCC,
            halsteadEffort: Math.round(metrics.halstead.effort),
            halsteadVolume: Math.round(metrics.halstead.volume),
            quadrant: classification.quadrant,
            riskLevel: classification.riskLevel,
            recommendedAction: classification.action
        });
    });

    // Display formatted Markdown table
    console.log('| File Name | Service / Layer | Churn (Commits) | Max CC | Total CC | Halstead Effort (E) | Risk Quadrant | Status |');
    console.log('| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :---: |');
    results.forEach(r => {
        const name = r.fileName.padEnd(23);
        const srv = (r.service + ' / ' + r.layer.split('/')[0]).padEnd(28);
        const churn = String(r.churnCommits).padEnd(5);
        const maxCc = String(r.maxCC).padEnd(4);
        const totCc = String(r.totalCC).padEnd(4);
        const effort = String(r.halsteadEffort).padEnd(9);
        const quad = r.quadrant.padEnd(28);
        const risk = r.riskLevel;
        console.log(`| ${name} | ${srv} | ${churn} | ${maxCc} | ${totCc} | ${effort} | ${quad} | ${risk} |`);
    });

    console.log('\n--- Strategic Engineering Conclusions by Quadrant ---');
    const grouped = {};
    results.forEach(r => {
        grouped[r.quadrant] = grouped[r.quadrant] || [];
        grouped[r.quadrant].push(r);
    });

    for (const [quad, items] of Object.entries(grouped)) {
        console.log(`\n▶ ${quad}:`);
        items.forEach(it => {
            console.log(`  • ${it.fileName}: Max CC=${it.maxCC}, Churn=${it.churnCommits} commits. Рекомендація: ${it.recommendedAction}`);
        });
    }

    // Export JSON report for CI/CD artifact
    const reportsDir = path.resolve(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const outputPath = path.join(reportsDir, 'hotspots-matrix.json');
    fs.writeFileSync(outputPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        author: 'Antigravity Lead Architect (Lab 7)',
        thresholds: { churn: CHURN_THRESHOLD, maxCC: COMPLEXITY_THRESHOLD_CC },
        matrix: results
    }, null, 2), 'utf8');

    console.log(`\n✓ Hotspots Matrix JSON exported successfully to: ${outputPath}\n`);

    return results;
}

if (require.main === module) {
    runHotspotsAnalysis();
}

module.exports = { runHotspotsAnalysis };
