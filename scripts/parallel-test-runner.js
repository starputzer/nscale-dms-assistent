#!/usr/bin/env node

/**
 * Parallel Test Runner
 * 
 * This script runs tests in parallel to maximize resource utilization
 * and minimize test execution time. It intelligently splits test suites
 * across multiple processes and collects results into a unified report.
 * 
 * Usage:
 *   node scripts/parallel-test-runner.js [options]
 * 
 * Options:
 *   --pattern <glob>         Test file pattern(s) to match (default: "test/**/*.spec.ts")
 *   --workers <number>       Number of worker processes (default: cpu cores - 1)
 *   --reporter <name>        Test reporter to use (default: "default")
 *   --outputDir <path>       Output directory for reports (default: "test-results/parallel")
 *   --timeout <milliseconds> Test timeout (default: 30000)
 *   --category <name>        Run specific test category/tag
 *   --skipBanner             Skip printing the banner
 *   --noColors               Disable colors in output
 */

const { argv } = require('process');
const { cpus } = require('os');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const glob = require('glob');
const chalk = require('chalk');
const { program } = require('commander');

// Define CLI options
program
  .option('--pattern <glob>', 'Test file pattern(s) to match', 'test/**/*.spec.ts')
  .option('--workers <number>', 'Number of worker processes', Math.max(1, cpus().length - 1))
  .option('--reporter <name>', 'Test reporter to use', 'default')
  .option('--outputDir <path>', 'Output directory for reports', 'test-results/parallel')
  .option('--timeout <milliseconds>', 'Test timeout', 30000)
  .option('--category <name>', 'Run specific test category/tag')
  .option('--skipBanner', 'Skip printing the banner')
  .option('--noColors', 'Disable colors in output')
  .parse(argv);

const options = program.opts();

// Disable chalk colors if needed
if (options.noColors) {
  chalk.level = 0;
}

// Create output directory if it doesn't exist
if (!fs.existsSync(options.outputDir)) {
  fs.mkdirSync(options.outputDir, { recursive: true });
}

// Print banner
if (!options.skipBanner) {
  console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║                      Parallel Test Runner                      ║'));
  console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════════╝\n'));
}

console.log(chalk.cyan('✨ Starting test run with the following configuration:'));
console.log(chalk.cyan(`   - Workers: ${options.workers}`));
console.log(chalk.cyan(`   - Pattern: ${options.pattern}`));
if (options.category) {
  console.log(chalk.cyan(`   - Category: ${options.category}`));
}
console.log('');

// Find all test files matching the pattern
const testFiles = glob.sync(options.pattern);

if (testFiles.length === 0) {
  console.log(chalk.yellow('⚠️ No test files found matching the pattern.'));
  process.exit(0);
}

console.log(chalk.green(`Found ${testFiles.length} test files to run.\n`));

// Group test files for optimal parallelization
function groupTestFiles(files, workers) {
  const groups = Array.from({ length: workers }, () => []);
  
  // Sort files by name to ensure deterministic runs
  files.sort();
  
  // Distribute files using a round-robin approach
  files.forEach((file, i) => {
    groups[i % workers].push(file);
  });
  
  return groups;
}

// Split test files across workers
const testGroups = groupTestFiles(testFiles, options.workers);

// Store results of each worker
const workerResults = new Map();
let completedWorkers = 0;
let totalPassed = 0;
let totalFailed = 0;
let totalSkipped = 0;
let totalTotal = 0;
let hasFailures = false;

// Function to run vitest for a group of test files
function runTestGroup(groupId, testFiles) {
  const args = [
    'vitest',
    'run',
    '--config',
    'vitest.config.ts',
    '--reporter',
    options.reporter,
    '--output-file',
    path.join(options.outputDir, `results-worker-${groupId}.json`),
    '--timeout',
    options.timeout,
  ];
  
  if (options.category) {
    args.push('--tags', options.category);
  }
  
  // Add test files at the end
  args.push(...testFiles);
  
  console.log(chalk.blue(`Starting worker ${groupId} with ${testFiles.length} test files...`));
  
  const worker = spawn('npx', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });
  
  let output = '';
  worker.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    // Print real-time test progress
    process.stdout.write(text);
  });
  
  worker.stderr.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stderr.write(text);
  });
  
  worker.on('close', (code) => {
    completedWorkers++;
    
    // Parse test result summary from output
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);
    const totalMatch = output.match(/(\d+) total/);
    
    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
    const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
    const total = totalMatch ? parseInt(totalMatch[1], 10) : (passed + failed + skipped);
    
    workerResults.set(groupId, {
      exitCode: code,
      passed,
      failed,
      skipped,
      total,
      files: testFiles,
    });
    
    totalPassed += passed;
    totalFailed += failed;
    totalSkipped += skipped;
    totalTotal += total;
    hasFailures = hasFailures || failed > 0 || code !== 0;
    
    console.log(chalk.blue(`Worker ${groupId} completed with exit code ${code}.`));
    
    if (completedWorkers === testGroups.length) {
      printSummary();
    }
  });
  
  return worker;
}

// Print test summary
function printSummary() {
  console.log(chalk.cyan('\n╔════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║                         Test Summary                           ║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════╝\n'));
  
  // Per-worker summary
  console.log(chalk.cyan('Worker Results:'));
  
  workerResults.forEach((result, groupId) => {
    const status = result.failed > 0 ? chalk.red('✖ FAILED') : chalk.green('✓ PASSED');
    console.log(`  Worker ${groupId}: ${status} - ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped, ${result.total} total`);
    
    if (result.failed > 0) {
      console.log(chalk.red(`    Failed tests in worker ${groupId}:`));
      try {
        const resultsFile = path.join(options.outputDir, `results-worker-${groupId}.json`);
        if (fs.existsSync(resultsFile)) {
          const resultData = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
          if (resultData.testResults) {
            resultData.testResults.forEach(suite => {
              if (suite.assertionResults) {
                suite.assertionResults
                  .filter(test => test.status === 'failed')
                  .forEach(test => {
                    console.log(chalk.red(`      - ${test.title}`));
                  });
              }
            });
          }
        }
      } catch (e) {
        console.log(chalk.red(`    Error parsing results file: ${e.message}`));
      }
    }
  });
  
  // Overall summary
  console.log(chalk.cyan('\nOverall Results:'));
  const overallStatus = hasFailures ? chalk.red('✖ FAILED') : chalk.green('✓ PASSED');
  console.log(`  ${overallStatus} - ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped, ${totalTotal} total`);
  
  console.log(chalk.cyan('\nReport:'));
  console.log(`  Detailed report available in: ${path.resolve(options.outputDir)}`);
  
  console.log('');
  
  // Generate merged report
  generateMergedReport();
  
  // Exit with appropriate code
  process.exit(hasFailures ? 1 : 0);
}

// Generate merged test report
function generateMergedReport() {
  try {
    const mergedReportPath = path.join(options.outputDir, 'merged-report.json');
    
    const mergedReport = {
      numTotalTestSuites: 0,
      numPassedTestSuites: 0,
      numFailedTestSuites: 0,
      numPendingTestSuites: 0,
      numTotalTests: totalTotal,
      numPassedTests: totalPassed,
      numFailedTests: totalFailed,
      numPendingTests: totalSkipped,
      testResults: [],
      startTime: new Date().getTime(),
      success: !hasFailures,
    };
    
    // Combine all worker results
    for (let groupId = 0; groupId < testGroups.length; groupId++) {
      try {
        const workerReportPath = path.join(options.outputDir, `results-worker-${groupId}.json`);
        if (fs.existsSync(workerReportPath)) {
          const workerReport = JSON.parse(fs.readFileSync(workerReportPath, 'utf8'));
          
          if (workerReport.testResults) {
            mergedReport.testResults.push(...workerReport.testResults);
            
            // Update suite counts
            mergedReport.numTotalTestSuites += workerReport.numTotalTestSuites || 0;
            mergedReport.numPassedTestSuites += workerReport.numPassedTestSuites || 0;
            mergedReport.numFailedTestSuites += workerReport.numFailedTestSuites || 0;
            mergedReport.numPendingTestSuites += workerReport.numPendingTestSuites || 0;
          }
        }
      } catch (e) {
        console.error(`Error parsing worker ${groupId} report:`, e);
      }
    }
    
    // Save merged report
    fs.writeFileSync(mergedReportPath, JSON.stringify(mergedReport, null, 2));
    console.log(chalk.green(`✓ Merged report generated at: ${mergedReportPath}`));
    
    // Create a HTML report
    const htmlReportPath = path.join(options.outputDir, 'report.html');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
          h1 { border-bottom: 1px solid #eaecef; padding-bottom: 10px; }
          h2 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
          .summary { display: flex; margin-bottom: 20px; }
          .summary-box { flex: 1; padding: 15px; border-radius: 5px; margin: 0 10px; color: white; }
          .passed { background-color: #28a745; }
          .failed { background-color: #dc3545; }
          .skipped { background-color: #ffc107; color: black; }
          .total { background-color: #17a2b8; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #dfe2e5; padding: 8px 12px; text-align: left; }
          th { background-color: #f6f8fa; }
          .failed-test { color: #dc3545; }
          .passed-test { color: #28a745; }
          .skipped-test { color: #ffc107; }
          .suite-name { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Test Report</h1>
        <div class="summary">
          <div class="summary-box passed">
            <h2>Passed</h2>
            <p>${mergedReport.numPassedTests}</p>
          </div>
          <div class="summary-box failed">
            <h2>Failed</h2>
            <p>${mergedReport.numFailedTests}</p>
          </div>
          <div class="summary-box skipped">
            <h2>Skipped</h2>
            <p>${mergedReport.numPendingTests}</p>
          </div>
          <div class="summary-box total">
            <h2>Total</h2>
            <p>${mergedReport.numTotalTests}</p>
          </div>
        </div>
        
        <h2>Test Suites</h2>
        <table>
          <tr>
            <th>Suite</th>
            <th>Tests</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
            <th>Time</th>
          </tr>
          ${mergedReport.testResults.map(suite => `
            <tr>
              <td class="suite-name">${suite.name || 'Unknown'}</td>
              <td>${suite.assertionResults ? suite.assertionResults.length : 0}</td>
              <td>${suite.assertionResults ? suite.assertionResults.filter(test => test.status === 'passed').length : 0}</td>
              <td>${suite.assertionResults ? suite.assertionResults.filter(test => test.status === 'failed').length : 0}</td>
              <td>${suite.assertionResults ? suite.assertionResults.filter(test => test.status === 'pending').length : 0}</td>
              <td>${suite.endTime && suite.startTime ? ((suite.endTime - suite.startTime) / 1000).toFixed(2) + 's' : 'N/A'}</td>
            </tr>
          `).join('')}
        </table>
        
        ${mergedReport.numFailedTests > 0 ? `
          <h2>Failed Tests</h2>
          <table>
            <tr>
              <th>Suite</th>
              <th>Test</th>
              <th>Error</th>
            </tr>
            ${mergedReport.testResults.flatMap(suite => 
              (suite.assertionResults || [])
                .filter(test => test.status === 'failed')
                .map(test => `
                  <tr>
                    <td>${suite.name || 'Unknown'}</td>
                    <td class="failed-test">${test.title}</td>
                    <td>${test.failureMessages ? test.failureMessages.join('<br>') : 'Unknown error'}</td>
                  </tr>
                `)
            ).join('')}
          </table>
        ` : ''}
        
        <footer>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </footer>
      </body>
      </html>
    `;
    
    fs.writeFileSync(htmlReportPath, htmlContent);
    console.log(chalk.green(`✓ HTML report generated at: ${htmlReportPath}`));
    
  } catch (e) {
    console.error('Error generating merged report:', e);
  }
}

// Launch worker processes
testGroups.forEach((files, index) => {
  if (files.length > 0) {
    runTestGroup(index, files);
  } else {
    completedWorkers++;
  }
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nTest run aborted by user.'));
  process.exit(130);
});