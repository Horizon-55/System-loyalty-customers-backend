#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findGitleaks() {
    if (process.env.GITLEAKS_PATH && fs.existsSync(process.env.GITLEAKS_PATH)) {
        return process.env.GITLEAKS_PATH;
    }
    // Check in system PATH
    const checkPath = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['gitleaks'], { encoding: 'utf8' });
    if (checkPath.status === 0 && checkPath.stdout.trim()) {
        const lines = checkPath.stdout.trim().split(/\r?\n/);
        return lines[0];
    }
    // Check known WinGet packages path on Windows
    if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
        const wingetDir = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages');
        if (fs.existsSync(wingetDir)) {
            const dirs = fs.readdirSync(wingetDir);
            for (const d of dirs) {
                if (d.startsWith('Gitleaks.Gitleaks')) {
                    const candidate = path.join(wingetDir, d, 'gitleaks.exe');
                    if (fs.existsSync(candidate)) return candidate;
                }
            }
        }
    }
    return 'gitleaks';
}

const gitleaksBin = findGitleaks();
const args = process.argv.slice(2);
const defaultArgs = ['git', '--staged', '-v'];
const runArgs = args.length > 0 ? args : defaultArgs;

console.log(`[Secret-Scanner] Invoking Gitleaks binary: ${gitleaksBin}`);
console.log(`[Secret-Scanner] Command: gitleaks ${runArgs.join(' ')}\n`);

const res = spawnSync(gitleaksBin, runArgs, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env: process.env
});

if (res.error) {
    console.error(`[Secret-Scanner] Failed to execute gitleaks:`, res.error.message);
    process.exit(1);
}

process.exit(res.status ?? 0);
