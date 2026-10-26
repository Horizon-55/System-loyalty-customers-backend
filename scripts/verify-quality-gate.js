/**
 * Enterprise Balanced Quality Gate Validator
 * Implements strict multi-dimensional validation countering Goodhart's Law.
 * Formula:
 * (LineCoverage >= 80%) AND (MutationScore >= 65%) AND (CognitiveComplexity <= 15) AND (CriticalCVE == 0)
 */

const fs = require('fs');
const path = require('path');

// Defined Enterprise Thresholds
const THRESHOLDS = {
    minLineCoverage: 80.0,      // Ratio Scale (%)
    minMutationScore: 65.0,     // Ratio Scale (%) - Counteracting balancer
    maxCognitiveComplexity: 15, // Ratio Scale (Points)
    maxCriticalCVE: 0           // Ratio Scale (Count)
};

/**
 * Evaluates telemetry metrics against the Balanced Quality Gate
 * @param {Object} metrics - Extracted static/dynamic engineering metrics
 * @returns {Object} Evaluation report with pass/fail decision and Goodhart flag
 */
function evaluateQualityGate(metrics) {
    const checks = {
        lineCoverage: {
            actual: metrics.lineCoverage,
            target: `>= ${THRESHOLDS.minLineCoverage}%`,
            passed: metrics.lineCoverage >= THRESHOLDS.minLineCoverage
        },
        mutationScore: {
            actual: metrics.mutationScore,
            target: `>= ${THRESHOLDS.minMutationScore}%`,
            passed: metrics.mutationScore >= THRESHOLDS.minMutationScore
        },
        cognitiveComplexity: {
            actual: metrics.cognitiveComplexity,
            target: `<= ${THRESHOLDS.maxCognitiveComplexity}`,
            passed: metrics.cognitiveComplexity <= THRESHOLDS.maxCognitiveComplexity
        },
        criticalCVE: {
            actual: metrics.criticalCVE,
            target: `=== ${THRESHOLDS.maxCriticalCVE}`,
            passed: metrics.criticalCVE <= THRESHOLDS.maxCriticalCVE
        }
    };

    // Strict AND logic across all dimensions
    const isOverallPass = Object.values(checks).every(c => c.passed);

    // Goodhart's Law Detection Rule:
    // If Line Coverage is artificially high (>=80%) but Mutation Score is low (<50%),
    // the system flags an intentional metric manipulation (dummy tests without asserts).
    const isGoodhartAbuse = (metrics.lineCoverage >= THRESHOLDS.minLineCoverage) &&
                            (metrics.mutationScore < 50.0);

    return {
        isOverallPass,
        isGoodhartAbuse,
        checks,
        summary: isOverallPass 
            ? 'PASSED: Balanced Quality Gate satisfied across all contours.'
            : isGoodhartAbuse
                ? 'FAILED: GOODHART\'S LAW ALERT: High coverage detected with deficient assertion mutation score!'
                : 'FAILED: One or more engineering quality metrics violated threshold.'
    };
}

// Interactive execution / test demonstration
function runSimulation() {
    console.log('================================================================');
    console.log('   ENTERPRISE BALANCED QUALITY GATE & GOODHART STRESS TEST     ');
    console.log('================================================================\n');

    const scenarioGaming = {
        name: 'Scenario A: Developer Gaming Metric (Dummy Tests without Asserts)',
        metrics: {
            lineCoverage: 94.2,        // Artificially inflated via dummy calls
            mutationScore: 19.4,       // Balancer catches surviving mutants!
            cognitiveComplexity: 9,
            criticalCVE: 0
        }
    };

    const scenarioCompliant = {
        name: 'Scenario B: Production-Grade Balanced Implementation',
        metrics: {
            lineCoverage: 84.8,        // Legitimate coverage
            mutationScore: 72.5,       // Robust assertions killing injected mutants
            cognitiveComplexity: 8,
            criticalCVE: 0
        }
    };

    [scenarioGaming, scenarioCompliant].forEach((scenario, idx) => {
        console.log(`[TEST RUN ${idx + 1}] ${scenario.name}`);
        console.log('Telemetry Metrics:', JSON.stringify(scenario.metrics, null, 2));
        
        const result = evaluateQualityGate(scenario.metrics);
        console.log('Check Details:');
        for (const [key, val] of Object.entries(result.checks)) {
            const status = val.passed ? '✓ PASS' : '✗ FAIL';
            console.log(`  - ${key.padEnd(22)}: Actual=${String(val.actual).padEnd(6)} | Target=${val.target.padEnd(10)} | ${status}`);
        }

        console.log(`Decision: ${result.isOverallPass ? 'STATUS: [PASS]' : 'STATUS: [FAIL]'}`);
        if (result.isGoodhartAbuse) {
            console.log('🚨 ANOMALY: Goodhart\'s Law abuse detected! High line coverage with dead mutation assertions.');
        }
        console.log(`Summary : ${result.summary}\n----------------------------------------------------------------\n`);
    });
}

if (require.main === module) {
    runSimulation();
}

module.exports = { evaluateQualityGate, THRESHOLDS };
