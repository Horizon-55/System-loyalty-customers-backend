/**
 * Automated Review Date Currency Auditor (Lab 11 DaC Governance)
 * Parses YAML front matter in docs/ and verifies that no documents have an overdue review_date.
 */

const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '../docs');
const today = new Date();
today.setHours(0, 0, 0, 0);

console.log('=== AUTOMATED REVIEW DATE CURRENCY AUDIT ===');
console.log(`Current Date: ${today.toISOString().split('T')[0]}`);

let overdueCount = 0;
let totalChecked = 0;

function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            scanDir(fullPath);
        } else if (entry.name.endsWith('.md')) {
            totalChecked++;
            const content = fs.readFileSync(fullPath, 'utf8');
            const frontMatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            const relPath = path.relative(docsDir, fullPath).replace(/\\/g, '/');

            if (!frontMatterMatch) {
                console.warn(`⚠️ [NO-PASSPORT]: docs/${relPath} is missing YAML front matter!`);
                continue;
            }

            const fm = frontMatterMatch[1];
            const dateMatch = fm.match(/review_date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
            const statusMatch = fm.match(/status:\s*([a-zA-Z0-9_\-]+)/);
            const ownerMatch = fm.match(/owner:\s*([^\r\n]+)/);

            const status = statusMatch ? statusMatch[1].trim() : 'unknown';
            const owner = ownerMatch ? ownerMatch[1].trim() : 'unassigned';

            if (!dateMatch) {
                console.warn(`⚠️ [NO-REVIEW-DATE]: docs/${relPath} (owner: ${owner}) lacks review_date!`);
                continue;
            }

            const reviewDateStr = dateMatch[1];
            const reviewDate = new Date(reviewDateStr);

            if (reviewDate < today && status !== 'deprecated') {
                overdueCount++;
                console.error(`❌ [OVERDUE DECAY]: docs/${relPath} expired on ${reviewDateStr}! (owner: ${owner})`);
            } else {
                console.log(`✓ [CURRENT]: docs/${relPath} (valid until ${reviewDateStr}, owner: ${owner}, status: ${status})`);
            }
        }
    }
}

scanDir(docsDir);

console.log('\n--- AUDIT SUMMARY ---');
console.log(`Total documents inspected: ${totalChecked}`);
console.log(`Overdue documents: ${overdueCount}`);

if (overdueCount > 0) {
    console.error(`[FAIL] Quality Gate Rejected: ${overdueCount} document(s) have expired review_date!`);
    process.exit(1);
} else {
    console.log('[PASS] Quality Gate Approved: 100% of documentation is active and up to date.');
    process.exit(0);
}
