/**
 * Pre-commit Hook Quality Gate: Staged Code Complexity Validator
 * Intercepts git commit and blocks any commit containing methods with Cyclomatic Complexity > 10.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { analyzeFile } = require('./complexity-analyzer.js');

const MAX_ALLOWED_CC = 10;

function getStagedTsFiles() {
    try {
        const stdout = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
        return stdout
            .split(/\r?\n/)
            .map(f => f.trim())
            .filter(f => f.length > 0 && f.endsWith('.ts') && !f.endsWith('.d.ts') && !f.includes('node_modules'));
    } catch (err) {
        console.error('[pre-commit] Error inspecting staged files:', err.message);
        return [];
    }
}

function runCheck() {
    console.log('[pre-commit] Inspecting staged TypeScript files for Cyclomatic Complexity (Limit CC <= 10)...');

    const stagedFiles = getStagedTsFiles();
    if (stagedFiles.length === 0) {
        console.log('[pre-commit] No TypeScript files in staged changes to inspect.');
        process.exit(0);
    }

    const violations = [];

    for (const relFile of stagedFiles) {
        const absPath = path.resolve(process.cwd(), relFile);
        if (!fs.existsSync(absPath)) continue;

        const analysis = analyzeFile(absPath);
        for (const func of analysis.cyclomatic.functions) {
            if (func.cyclomaticComplexity > MAX_ALLOWED_CC) {
                violations.push({
                    file: relFile,
                    funcName: func.name,
                    cc: func.cyclomaticComplexity,
                    startLine: func.startLine,
                    endLine: func.endLine
                });
            }
        }
    }

    if (violations.length > 0) {
        console.log('\n\x1b[31m================================================================================');
        console.log(' 🚨 [QUALITY GATE FAILED] Cyclomatic Complexity Threshold Violated! (CC > 10)');
        console.log(' Commit has been BLOCKED to prevent spaghetti code entering repository.');
        console.log('================================================================================\x1b[0m');
        console.log('\nDetected Complexity Anomalies:');
        violations.forEach((v, idx) => {
            console.log(`  ${idx + 1}. Method \x1b[33m'${v.funcName}'\x1b[0m in \x1b[36m${v.file}\x1b[0m (lines ${v.startLine}-${v.endLine}):`);
            console.log(`     Actual CC = \x1b[31m${v.cc}\x1b[0m | Max Allowed = \x1b[32m${MAX_ALLOWED_CC}\x1b[0m (\x1b[31mVIOLATION: +${v.cc - MAX_ALLOWED_CC}\x1b[0m)`);
        });
        console.log('\n\x1b[35mRecommended Architectural Remediation:\x1b[0m');
        console.log('  Apply Data-Driven Refactoring (Lookup Table / Map dictionary) to replace if/else cascades.');
        console.log('  Linearize decision branches to reduce CC <= 2.\n');
        process.exit(1);
    }

    console.log(`[pre-commit] \x1b[32m✓ Quality Gate PASS\x1b[0m: All staged methods satisfy Cyclomatic Complexity <= ${MAX_ALLOWED_CC}.`);
    process.exit(0);
}

if (require.main === module) {
    runCheck();
}

module.exports = { runCheck, MAX_ALLOWED_CC };
