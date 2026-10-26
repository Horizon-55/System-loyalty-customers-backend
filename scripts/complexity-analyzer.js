/**
 * Enterprise Static Code Complexity Analyzer
 * Computes Maurice Halstead Metrics & Thomas McCabe Cyclomatic Complexity
 * using native TypeScript Compiler AST.
 */

const fs = require('fs');
const path = require('path');
let ts;
try {
    ts = require(path.join(__dirname, '../point-service/node_modules/typescript'));
} catch (e) {
    try {
        ts = require(path.join(__dirname, '../customer-service/node_modules/typescript'));
    } catch (e2) {
        ts = require('typescript');
    }
}

/**
 * Tokenizes and computes Halstead & McCabe metrics for a single source file
 * @param {string} filePath - Absolute or relative path to TS file
 * @returns {Object} Computed metrics
 */
function analyzeFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
        path.basename(filePath),
        code,
        ts.ScriptTarget.Latest,
        /*setParentNodes*/ true
    );

    const operators = [];
    const operands = [];
    const functions = [];

    // Helper to extract operators & operands from tokens
    function visit(node) {
        // Function-level complexity tracking
        if (ts.isFunctionDeclaration(node) || 
            ts.isMethodDeclaration(node) || 
            ts.isArrowFunction(node) || 
            ts.isFunctionExpression(node)) {
            
            let funcName = '<anonymous>';
            if (node.name && ts.isIdentifier(node.name)) {
                funcName = node.name.text;
            } else if (node.parent && ts.isPropertyDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
                funcName = node.parent.name.text;
            } else if (node.parent && ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
                funcName = node.parent.name.text;
            }

            const funcCC = calculateFunctionCC(node);
            functions.push({
                name: funcName,
                cyclomaticComplexity: funcCC,
                startLine: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
                endLine: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1
            });
        }

        // Halstead token classification
        classifyHalsteadToken(node, operators, operands);

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    // Compute unique & total counts
    const uniqueOperators = new Set(operators);
    const uniqueOperands = new Set(operands);

    const n1 = uniqueOperators.size;  // η1: Unique operators
    const n2 = uniqueOperands.size;   // η2: Unique operands
    const N1 = operators.length;       // N1: Total operators
    const N2 = operands.length;        // N2: Total operands

    // Derived Halstead Indicators
    const vocabulary = n1 + n2;                             // η = η1 + η2
    const length = N1 + N2;                                  // N = N1 + N2
    const volume = vocabulary > 0 ? length * Math.log2(vocabulary) : 0; // V = N * log2(η)
    const difficulty = (n2 > 0) ? (n1 / 2) * (N2 / n2) : 0; // D = (η1 / 2) * (N2 / η2)
    const effort = volume * difficulty;                     // E = V * D
    const timeToImplementSec = effort / 18;                 // T = E / 18 seconds (Halstead formula)

    // Lines of code
    const rawLines = code.split(/\r?\n/).length;
    const sloc = code.split(/\r?\n/).filter(l => l.trim().length > 0 && !l.trim().startsWith('//') && !l.trim().startsWith('/*') && !l.trim().startsWith('*')).length;

    // Overall Cyclomatic Complexity (sum of function CC or module base)
    const maxFunctionCC = functions.length > 0 ? Math.max(...functions.map(f => f.cyclomaticComplexity)) : 1;
    const totalCyclomaticComplexity = functions.reduce((acc, f) => acc + f.cyclomaticComplexity, 0) || 1;

    return {
        filePath: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
        fileName: path.basename(filePath),
        sloc,
        rawLines,
        halstead: {
            n1, // unique operators
            n2, // unique operands
            N1, // total operators
            N2, // total operands
            vocabulary,
            length,
            volume: Math.round(volume * 100) / 100,
            difficulty: Math.round(difficulty * 100) / 100,
            effort: Math.round(effort * 100) / 100,
            timeSec: Math.round(timeToImplementSec * 10) / 10
        },
        cyclomatic: {
            maxCC: maxFunctionCC,
            totalCC: totalCyclomaticComplexity,
            functions
        }
    };
}

/**
 * Classifies an AST node into Halstead Operator or Operand
 */
function classifyHalsteadToken(node, operators, operands) {
    const kind = node.kind;

    // Operands: Identifiers, String/Numeric/Boolean Literals
    if (ts.isIdentifier(node)) {
        operands.push(`id:${node.text}`);
        return;
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        operands.push(`str:${node.text}`);
        return;
    }
    if (ts.isNumericLiteral(node)) {
        operands.push(`num:${node.text}`);
        return;
    }
    if (kind === ts.SyntaxKind.TrueKeyword || kind === ts.SyntaxKind.FalseKeyword) {
        operands.push(`bool:${node.getText()}`);
        return;
    }
    if (kind === ts.SyntaxKind.NullKeyword || kind === ts.SyntaxKind.UndefinedKeyword) {
        operands.push(`literal:${node.getText()}`);
        return;
    }

    // Operators: Keywords and Syntax Punctuation
    const operatorKeywords = [
        ts.SyntaxKind.IfKeyword, ts.SyntaxKind.ElseKeyword, ts.SyntaxKind.SwitchKeyword,
        ts.SyntaxKind.CaseKeyword, ts.SyntaxKind.DefaultKeyword, ts.SyntaxKind.WhileKeyword,
        ts.SyntaxKind.ForKeyword, ts.SyntaxKind.DoKeyword, ts.SyntaxKind.BreakKeyword,
        ts.SyntaxKind.ContinueKeyword, ts.SyntaxKind.ReturnKeyword, ts.SyntaxKind.ThrowKeyword,
        ts.SyntaxKind.TryKeyword, ts.SyntaxKind.CatchKeyword, ts.SyntaxKind.FinallyKeyword,
        ts.SyntaxKind.NewKeyword, ts.SyntaxKind.TypeofKeyword, ts.SyntaxKind.InstanceofKeyword,
        ts.SyntaxKind.AwaitKeyword, ts.SyntaxKind.AsyncKeyword, ts.SyntaxKind.ConstKeyword,
        ts.SyntaxKind.LetKeyword, ts.SyntaxKind.VarKeyword, ts.SyntaxKind.FunctionKeyword,
        ts.SyntaxKind.ClassKeyword, ts.SyntaxKind.InterfaceKeyword, ts.SyntaxKind.TypeKeyword,
        ts.SyntaxKind.ImportKeyword, ts.SyntaxKind.ExportKeyword, ts.SyntaxKind.FromKeyword
    ];

    if (operatorKeywords.includes(kind)) {
        operators.push(ts.SyntaxKind[kind]);
        return;
    }

    // Operators: Binary, Prefix, Postfix expressions
    if (ts.isBinaryExpression(node)) {
        operators.push(`op:${node.operatorToken.getText()}`);
    } else if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
        operators.push(`op:${ts.SyntaxKind[node.operator]}`);
    } else if (ts.isConditionalExpression(node)) {
        operators.push('op:?');
    } else if (ts.isCallExpression(node)) {
        operators.push('op:()');
    } else if (ts.isPropertyAccessExpression(node)) {
        operators.push('op:.');
    } else if (ts.isElementAccessExpression(node)) {
        operators.push('op:[]');
    }
}

/**
 * Calculates Cyclomatic Complexity for a single function AST
 * Base CC = 1 + Decision Points
 */
function calculateFunctionCC(funcNode) {
    let decisionCount = 0;

    function countDecisions(node) {
        // If, Ternary
        if (ts.isIfStatement(node) || ts.isConditionalExpression(node)) {
            decisionCount++;
        }
        // Switch Cases (except default)
        else if (ts.isCaseClause(node)) {
            decisionCount++;
        }
        // Loops
        else if (ts.isWhileStatement(node) || 
                 ts.isDoStatement(node) || 
                 ts.isForStatement(node) || 
                 ts.isForInStatement(node) || 
                 ts.isForOfStatement(node)) {
            decisionCount++;
        }
        // Catch blocks
        else if (ts.isCatchClause(node)) {
            decisionCount++;
        }
        // Logical Operators in conditions (&&, ||, ??)
        else if (ts.isBinaryExpression(node)) {
            const opKind = node.operatorToken.kind;
            if (opKind === ts.SyntaxKind.AmpersandAmpersandToken || 
                opKind === ts.SyntaxKind.BarBarToken || 
                opKind === ts.SyntaxKind.QuestionQuestionToken) {
                decisionCount++;
            }
        }

        ts.forEachChild(node, countDecisions);
    }

    // Traverse function body
    if (funcNode.body) {
        ts.forEachChild(funcNode.body, countDecisions);
    }

    return 1 + decisionCount;
}

/**
 * Scans the entire repository excluding node_modules, dist, .git
 */
function runGlobalBaselineScan(targetDirs) {
    const tsFiles = [];

    function findTsFiles(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git' && entry.name !== '.scannerwork') {
                    findTsFiles(fullPath);
                }
            } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
                tsFiles.push(fullPath);
            }
        }
    }

    targetDirs.forEach(d => {
        if (fs.existsSync(d)) findTsFiles(d);
    });

    console.log('================================================================');
    console.log('     GLOBAL BASELINE SCAN: MAURICE HALSTEAD & THOMAS MCCABE    ');
    console.log('================================================================');
    console.log(`Repository: System-loyalty-customers-backend`);
    console.log(`Discovered Source Files: ${tsFiles.length} TypeScript compilation units\n`);

    const results = tsFiles.map(analyzeFile);

    // Totals
    let totalSloc = 0;
    let totalN1 = 0;
    let totalN2 = 0;
    const globalOperators = new Set();
    const globalOperands = new Set();

    results.forEach(r => {
        totalSloc += r.sloc;
        totalN1 += r.halstead.N1;
        totalN2 += r.halstead.N2;
    });

    const globalN = totalN1 + totalN2;
    // Approximated system-wide vocabulary sum
    const avgVocab = Math.round(results.reduce((a, b) => a + b.halstead.vocabulary, 0) / results.length);
    const globalVolume = Math.round(globalN * Math.log2(avgVocab));
    const maxCCFile = results.reduce((prev, curr) => (curr.cyclomatic.maxCC > prev.cyclomatic.maxCC) ? curr : prev, results[0]);

    console.log('| Global Telemetry Metric         | Value                          | Stevens Scale | Description |');
    console.log('| :------------------------------ | :----------------------------- | :------------ | :---------- |');
    console.log(`| Total Analyzed Files            | ${String(results.length).padEnd(30)} | Ratio Scale   | Active microservice sources |`);
    console.log(`| Total Source Lines of Code      | ${String(totalSloc).padEnd(30)} | Ratio Scale   | Executable statements (SLOC)|`);
    console.log(`| Total Operator Occurrences (N1) | ${String(totalN1).padEnd(30)} | Ratio Scale   | Total syntactic operators   |`);
    console.log(`| Total Operand Occurrences (N2)  | ${String(totalN2).padEnd(30)} | Ratio Scale   | Total variables & literals  |`);
    console.log(`| Total Program Length (N)        | ${String(globalN).padEnd(30)} | Ratio Scale   | N = N1 + N2                 |`);
    console.log(`| Global Information Volume (V)   | ${String(globalVolume + ' bits').padEnd(30)} | Ratio Scale   | V = N * log2(η)             |`);
    console.log(`| Peak Function Cyclomatic (CC)   | ${String(maxCCFile.cyclomatic.maxCC + ' (' + maxCCFile.fileName + ')').padEnd(30)} | Ratio Scale   | McCabe Complexity Peak      |`);

    return results;
}

// CLI Execution handler
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--baseline')) {
        const targetDirs = [
            path.join(process.cwd(), 'customer-service/src'),
            path.join(process.cwd(), 'point-service/src'),
            path.join(process.cwd(), 'api-gateway/src')
        ];
        runGlobalBaselineScan(targetDirs);
    } else if (args.includes('--compare-layers')) {
        // Run comparison for the 3 architectural layers defined in the prompt:
        const fileDomain = path.join(process.cwd(), 'customer-service/src/modules/customers/application/CustomerService.ts');
        const fileIntegration = path.join(process.cwd(), 'customer-service/src/modules/customers/Api/CustomersController.ts');
        const fileUtility = path.join(process.cwd(), 'customer-service/src/common/logging/PiiSanitizer.ts');

        const targets = [
            { layer: 'Core Domain (Business Logic)', path: fileDomain },
            { layer: 'Integration (Infrastructure/API)', path: fileIntegration },
            { layer: 'Utility (Helper / Masking Engine)', path: fileUtility }
        ];

        console.log('================================================================');
        console.log('     ARCHITECTURAL 3-LAYER HALSTEAD & MCCABE AUDIT MATRIX      ');
        console.log('================================================================\n');

        const layerResults = targets.map(t => ({
            layer: t.layer,
            ...analyzeFile(t.path)
        }));

        console.log('| Architectural Layer | Target File | SLOC | η1 | η2 | N1 | N2 | Vocabulary (η) | Volume (V) | Difficulty (D) | Mental Effort (E) | Peak CC |');
        console.log('| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');
        layerResults.forEach(r => {
            const h = r.halstead;
            console.log(`| ${r.layer.padEnd(20)} | ${r.fileName.padEnd(22)} | ${String(r.sloc).padEnd(4)} | ${String(h.n1).padEnd(2)} | ${String(h.n2).padEnd(2)} | ${String(h.N1).padEnd(3)} | ${String(h.N2).padEnd(3)} | ${String(h.vocabulary).padEnd(14)} | ${String(h.volume).padEnd(10)} | ${String(h.difficulty).padEnd(14)} | ${String(h.effort).padEnd(17)} | ${String(r.cyclomatic.maxCC).padEnd(7)} |`);
        });

        // Hotspot ranking
        console.log('\n--- Hotspots Selection & Cognitive Load Ranking ---');
        const sorted = [...layerResults].sort((a, b) => b.halstead.effort - a.halstead.effort);
        sorted.forEach((item, idx) => {
            console.log(`${idx + 1}. [HOTSPOT ${idx + 1}] ${item.fileName} (${item.layer}): Effort E = ${item.halstead.effort.toLocaleString()} (V=${item.halstead.volume}, D=${item.halstead.difficulty})`);
        });

    } else if (args.includes('--file')) {
        const fileIdx = args.indexOf('--file') + 1;
        const filePath = path.resolve(process.cwd(), args[fileIdx]);
        const res = analyzeFile(filePath);
        console.log(JSON.stringify(res, null, 2));
    } else {
        console.log('Usage:');
        console.log('  node scripts/complexity-analyzer.js --baseline');
        console.log('  node scripts/complexity-analyzer.js --compare-layers');
        console.log('  node scripts/complexity-analyzer.js --file <path>');
    }
}

module.exports = { analyzeFile, runGlobalBaselineScan };
