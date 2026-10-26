
/**
 * Test-Ops Experiment 2: Dynamic Metrics Stability Crash-Test
 * Simulates and benchmarks p95 response time and Quality Gate decisions
 * under Clean Isolated Infrastructure vs Contended / CPU-Throttled Environment.
 * Demonstrates the False-Negative Quality Gate FAIL phenomenon.
 */

const fs = require('fs');
const path = require('path');

// SLO Threshold defined in Quality Gate
const SLO_P95_THRESHOLD_MS = 150.0;
const SLO_MAX_ERROR_RATE = 0.01; // 1%

/**
 * Generates synthetic latency samples following a realistic log-normal distribution
 * with occasional tail latency spikes.
 */
function simulateLatencySamples(sampleCount, medianMs, sigma, spikeProbability, spikeMultiplier) {
    const samples = [];
    for (let i = 0; i < sampleCount; i++) {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

        // Log-normal value
        let val = Math.exp(Math.log(medianMs) + sigma * z0);

        // Infrastructure contention jitter / tail latency
        if (Math.random() < spikeProbability) {
            val *= (spikeMultiplier + Math.random() * 2);
        }
        samples.push(Math.round(val * 10) / 10);
    }
    return samples.sort((a, b) => a - b);
}

function calculatePercentile(sortedArr, percentile) {
    const idx = Math.ceil((percentile / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, Math.min(idx, sortedArr.length - 1))];
}

function runStabilityExperiment() {
    console.log('================================================================');
    console.log('      TEST-OPS EXPERIMENT 2: DYNAMIC STABILITY CRASH-TEST      ');
    console.log('================================================================');
    console.log(`Quality Gate Threshold: p95 Latency <= ${SLO_P95_THRESHOLD_MS} ms | Error Rate < 1.0%\n`);

    const SAMPLES = 1000;

    // Run 1: Clean Isolated Environment (Docker 2.0 CPU, 2GB RAM, dedicated core)
    const baselineSamples = simulateLatencySamples(SAMPLES, 32, 0.35, 0.01, 1.8);
    const baselineP50 = calculatePercentile(baselineSamples, 50);
    const baselineP90 = calculatePercentile(baselineSamples, 90);
    const baselineP95 = calculatePercentile(baselineSamples, 95);
    const baselineP99 = calculatePercentile(baselineSamples, 99);
    const baselineMax = baselineSamples[baselineSamples.length - 1];
    const baselineMean = Math.round((baselineSamples.reduce((a, b) => a + b, 0) / SAMPLES) * 10) / 10;
    const baselineErrorRate = 0.0;
    const baselinePass = (baselineP95 <= SLO_P95_THRESHOLD_MS) && (baselineErrorRate < SLO_MAX_ERROR_RATE);

    // Run 2: Contended Environment (Docker CPU limit throttled to 0.25 CPU, noisy neighbor)
    const noisySamples = simulateLatencySamples(SAMPLES, 115, 0.65, 0.12, 3.5);
    const noisyP50 = calculatePercentile(noisySamples, 50);
    const noisyP90 = calculatePercentile(noisySamples, 90);
    const noisyP95 = calculatePercentile(noisySamples, 95);
    const noisyP99 = calculatePercentile(noisySamples, 99);
    const noisyMax = noisySamples[noisySamples.length - 1];
    const noisyMean = Math.round((noisySamples.reduce((a, b) => a + b, 0) / SAMPLES) * 10) / 10;
    const noisyErrorRate = 0.018; // 1.8% timeouts under CPU starvation
    const noisyPass = (noisyP95 <= SLO_P95_THRESHOLD_MS) && (noisyErrorRate < SLO_MAX_ERROR_RATE);

    console.log('| Telemetry Metric          | Isolated Baseline  | Noisy Neighbor Contention | Fluctuation Impact |');
    console.log('| :------------------------ | :----------------- | :------------------------ | :----------------- |');
    console.log(`| Infrastructure Profile    | Dedicated (2 CPU)  | Starved (0.25 CPU Limit)  | Hardware Noise     |`);
    console.log(`| Sample Count ($N$)        | ${String(SAMPLES).padEnd(18)} | ${String(SAMPLES).padEnd(25)} | Identical Volume   |`);
    console.log(`| Median Latency (p50)      | ${String(baselineP50 + ' ms').padEnd(18)} | ${String(noisyP50 + ' ms').padEnd(25)} | +${Math.round(noisyP50 - baselineP50)} ms (+${Math.round((noisyP50 / baselineP50 - 1) * 100)}%) |`);
    console.log(`| Mean Latency (Arithmetic) | ${String(baselineMean + ' ms').padEnd(18)} | ${String(noisyMean + ' ms').padEnd(25)} | +${Math.round(noisyMean - baselineMean)} ms (Distorted) |`);
    console.log(`| 90th Percentile (p90)     | ${String(baselineP90 + ' ms').padEnd(18)} | ${String(noisyP90 + ' ms').padEnd(25)} | +${Math.round(noisyP90 - baselineP90)} ms           |`);
    console.log(`| 95th Percentile (p95)*    | ${String(baselineP95 + ' ms').padEnd(18)} | ${String(noisyP95 + ' ms').padEnd(25)} | 🚨 SPIKE: +${Math.round(noisyP95 - baselineP95)} ms |`);
    console.log(`| 99th Percentile (p99)     | ${String(baselineP99 + ' ms').padEnd(18)} | ${String(noisyP99 + ' ms').padEnd(25)} | Severe Tail Lag    |`);
    console.log(`| Maximum Latency           | ${String(baselineMax + ' ms').padEnd(18)} | ${String(noisyMax + ' ms').padEnd(25)} | Extreme Outlier    |`);
    console.log(`| Error Rate (Timeouts)     | ${(baselineErrorRate * 100).toFixed(1)}%              | ${(noisyErrorRate * 100).toFixed(1)}%                     | Degradation         |`);
    console.log(`| **Quality Gate Verdict**  | **${baselinePass ? 'PASS ✅' : 'FAIL ❌'}**          | **${noisyPass ? 'PASS ✅' : 'FAIL ❌ (FALSE NEGATIVE)'}** | **Systemic Risk**   |`);

    console.log('\n--- Stability Evaluation Conclusion ---');
    console.log('1. False Negative Demonstration:');
    console.log('   The application code was 100% identical between both runs.');
    console.log(`   Yet Quality Gate evaluated Run 1 as PASS (p95=${baselineP95}ms <= 150ms)`);
    console.log(`   and Run 2 as FAIL (p95=${noisyP95}ms > 150ms) due solely to infrastructure noise!`);
    console.log('2. Architectural Remediation:');
    console.log('   - Pin CPU and RAM quotas in Docker and CI runners.');
    console.log('   - Execute load/perf audits in isolated single-tenant runner nodes.');
    console.log('   - Use warmup cycles before sampling telemetry.');
}

if (require.main === module) {
    runStabilityExperiment();
}

module.exports = { runStabilityExperiment };
