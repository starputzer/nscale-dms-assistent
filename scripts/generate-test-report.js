#!/usr/bin/env node

/**
 * Test Report Generator
 *
 * This script generates a comprehensive test report by combining results
 * from various test runners and formats. It can process Vitest, Playwright,
 * and custom test result formats, and generates HTML, JSON, and Markdown reports.
 *
 * Usage:
 *   node scripts/generate-test-report.js [options]
 *
 * Options:
 *   --input <dir>      Input directory containing test results (default: "all-artifacts")
 *   --output <dir>     Output directory for reports (default: "test-report")
 *   --format <format>  Additional output formats (html,json,md) (default: "html,json")
 *   --title <title>    Report title (default: "Test Report")
 */

const fs = require("fs");
const path = require("path");
const { program } = require("commander");

// Define CLI options
program
  .option(
    "--input <dir>",
    "Input directory containing test results",
    "all-artifacts",
  )
  .option("--output <dir>", "Output directory for reports", "test-report")
  .option("--format <format>", "Output formats (html,json,md)", "html,json")
  .option("--title <title>", "Report title", "Test Report")
  .parse(process.argv);

const options = program.opts();
const outputFormats = options.format.split(",");

// Ensure output directory exists
if (!fs.existsSync(options.output)) {
  fs.mkdirSync(options.output, { recursive: true });
}

console.log(`Generating test report from: ${options.input}`);
console.log(`Output directory: ${options.output}`);
console.log(`Output formats: ${outputFormats.join(", ")}`);

// Define test categories
const TEST_CATEGORIES = [
  "unit",
  "functional",
  "ui",
  "a11y",
  "performance",
  "e2e",
];

// Initialize combined data structure
const combinedData = {
  title: options.title,
  timestamp: new Date().toISOString(),
  categories: {},
  stats: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
  },
  failedTests: [],
};

// Initialize category data
TEST_CATEGORIES.forEach((category) => {
  combinedData.categories[category] = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
  };
});

// Find all test result files recursively
function findTestResults(dir, filePattern) {
  const results = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively search in subdirectories
      results.push(...findTestResults(fullPath, filePattern));
    } else if (filePattern.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

// Process Vitest JSON report
function processVitestReport(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const category = getCategoryFromPath(filePath);

    if (!combinedData.categories[category]) {
      combinedData.categories[category] = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      };
    }

    // Update category stats
    combinedData.categories[category].total += data.numTotalTests || 0;
    combinedData.categories[category].passed += data.numPassedTests || 0;
    combinedData.categories[category].failed += data.numFailedTests || 0;
    combinedData.categories[category].skipped += data.numPendingTests || 0;

    // Update overall stats
    combinedData.stats.total += data.numTotalTests || 0;
    combinedData.stats.passed += data.numPassedTests || 0;
    combinedData.stats.failed += data.numFailedTests || 0;
    combinedData.stats.skipped += data.numPendingTests || 0;

    // Extract failed tests
    if (data.testResults) {
      data.testResults.forEach((suite) => {
        if (suite.assertionResults) {
          suite.assertionResults
            .filter((test) => test.status === "failed")
            .forEach((test) => {
              combinedData.failedTests.push({
                category,
                suite: suite.name,
                name: test.title,
                errorMessage: test.failureMessages
                  ? test.failureMessages[0]
                  : null,
              });
            });
        }
      });
    }

    return true;
  } catch (e) {
    console.error(`Error processing Vitest report ${filePath}:`, e.message);
    return false;
  }
}

// Process Playwright JSON report
function processPlaywrightReport(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const category = "e2e"; // Playwright is always e2e

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let total = 0;

    if (data.suites) {
      data.suites.forEach((suite) => {
        processPlaywrightSuite(suite, category);
      });
    }

    return true;
  } catch (e) {
    console.error(`Error processing Playwright report ${filePath}:`, e.message);
    return false;
  }
}

// Process a Playwright suite recursively
function processPlaywrightSuite(suite, category) {
  if (suite.suites) {
    suite.suites.forEach((childSuite) => {
      processPlaywrightSuite(childSuite, category);
    });
  }

  if (suite.specs) {
    suite.specs.forEach((spec) => {
      combinedData.categories[category].total++;
      combinedData.stats.total++;

      let specStatus = "passed";

      if (spec.tests) {
        spec.tests.forEach((test) => {
          if (test.results) {
            test.results.forEach((result) => {
              if (result.status === "failed") {
                specStatus = "failed";

                combinedData.failedTests.push({
                  category,
                  suite: suite.title,
                  name: spec.title,
                  errorMessage: result.error ? result.error.message : null,
                });
              } else if (
                result.status === "skipped" &&
                specStatus !== "failed"
              ) {
                specStatus = "skipped";
              }
            });
          }
        });
      }

      if (specStatus === "passed") {
        combinedData.categories[category].passed++;
        combinedData.stats.passed++;
      } else if (specStatus === "failed") {
        combinedData.categories[category].failed++;
        combinedData.stats.failed++;
      } else if (specStatus === "skipped") {
        combinedData.categories[category].skipped++;
        combinedData.stats.skipped++;
      }
    });
  }
}

// Process a performance report
function processPerformanceReport(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const category = "performance";

    // Count the number of tests
    let passed = 0;
    let failed = 0;
    let total = 0;

    // Process performance metrics
    if (data.metrics) {
      Object.entries(data.metrics).forEach(([metricName, metricResult]) => {
        total++;

        if (metricResult.passed) {
          passed++;
        } else {
          failed++;

          combinedData.failedTests.push({
            category,
            suite: "Performance Metrics",
            name: metricName,
            errorMessage: `Expected: ${metricResult.expected}, Actual: ${metricResult.actual}`,
          });
        }
      });

      // Update stats
      combinedData.categories[category].total += total;
      combinedData.categories[category].passed += passed;
      combinedData.categories[category].failed += failed;

      combinedData.stats.total += total;
      combinedData.stats.passed += passed;
      combinedData.stats.failed += failed;
    }

    return true;
  } catch (e) {
    console.error(
      `Error processing Performance report ${filePath}:`,
      e.message,
    );
    return false;
  }
}

// Detect category from file path
function getCategoryFromPath(filePath) {
  const lowerPath = filePath.toLowerCase();

  for (const category of TEST_CATEGORIES) {
    if (lowerPath.includes(category)) {
      return category;
    }
  }

  return "unit"; // Default category
}

// Generate HTML report
function generateHtmlReport() {
  const reportPath = path.join(options.output, "report.html");

  const getStatusClass = (category) => {
    return category.failed > 0 ? "failed" : "passed";
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${combinedData.title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { border-bottom: 1px solid #eaecef; padding-bottom: 10px; }
        h2 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
        .summary { display: flex; margin-bottom: 20px; flex-wrap: wrap; }
        .summary-box { flex: 1; min-width: 200px; padding: 15px; border-radius: 5px; margin: 10px; color: white; }
        .passed { background-color: #28a745; }
        .failed { background-color: #dc3545; }
        .skipped { background-color: #ffc107; color: black; }
        .total { background-color: #17a2b8; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #dfe2e5; padding: 8px 12px; text-align: left; }
        th { background-color: #f6f8fa; }
        .failed-test { color: #dc3545; }
        .passed-test { color: #28a745; }
        .skipped-test { color: #ffc107; }
        pre { background-color: #f6f8fa; padding: 10px; border-radius: 5px; overflow-x: auto; }
        code { font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <h1>${combinedData.title}</h1>
      <p class="timestamp">Generated on ${new Date(combinedData.timestamp).toLocaleString()}</p>
      
      <h2>Summary</h2>
      <div class="summary">
        <div class="summary-box ${combinedData.stats.failed > 0 ? "failed" : "passed"}">
          <h3>Overall Status</h3>
          <p>${combinedData.stats.failed > 0 ? "FAILED" : "PASSED"}</p>
        </div>
        <div class="summary-box passed">
          <h3>Passed</h3>
          <p>${combinedData.stats.passed}</p>
        </div>
        <div class="summary-box failed">
          <h3>Failed</h3>
          <p>${combinedData.stats.failed}</p>
        </div>
        <div class="summary-box skipped">
          <h3>Skipped</h3>
          <p>${combinedData.stats.skipped}</p>
        </div>
        <div class="summary-box total">
          <h3>Total</h3>
          <p>${combinedData.stats.total}</p>
        </div>
      </div>
      
      <h2>Results by Category</h2>
      <table>
        <tr>
          <th>Category</th>
          <th>Status</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Skipped</th>
          <th>Total</th>
        </tr>
        ${Object.entries(combinedData.categories)
          .filter(([_, data]) => data.total > 0)
          .map(
            ([category, data]) => `
            <tr>
              <td>${category}</td>
              <td class="${getStatusClass(data)}">${data.failed > 0 ? "FAILED" : "PASSED"}</td>
              <td>${data.passed}</td>
              <td>${data.failed}</td>
              <td>${data.skipped}</td>
              <td>${data.total}</td>
            </tr>
          `,
          )
          .join("")}
      </table>
      
      ${
        combinedData.failedTests.length > 0
          ? `
        <h2>Failed Tests</h2>
        <table>
          <tr>
            <th>Category</th>
            <th>Suite</th>
            <th>Test</th>
            <th>Error</th>
          </tr>
          ${combinedData.failedTests
            .map(
              (test) => `
            <tr>
              <td>${test.category}</td>
              <td>${test.suite}</td>
              <td class="failed-test">${test.name}</td>
              <td>
                ${test.errorMessage ? `<pre><code>${test.errorMessage}</code></pre>` : "Unknown error"}
              </td>
            </tr>
          `,
            )
            .join("")}
        </table>
      `
          : ""
      }
      
      <footer>
        <p>Generated with the Test Report Generator</p>
      </footer>
    </body>
    </html>
  `;

  fs.writeFileSync(reportPath, htmlContent);
  console.log(`✓ HTML report generated: ${reportPath}`);
}

// Generate JSON report
function generateJsonReport() {
  const reportPath = path.join(options.output, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(combinedData, null, 2));

  // Also create a summary file for CI systems
  const summaryPath = path.join(options.output, "summary.json");
  const summary = {
    title: combinedData.title,
    timestamp: combinedData.timestamp,
    stats: combinedData.stats,
    categories: combinedData.categories,
    failedTests: combinedData.failedTests.map((test) => ({
      category: test.category,
      suite: test.suite,
      name: test.name,
    })),
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log(`✓ JSON reports generated: ${reportPath}, ${summaryPath}`);
}

// Generate Markdown report
function generateMarkdownReport() {
  const reportPath = path.join(options.output, "report.md");

  const markdownContent = `# ${combinedData.title}

Generated on ${new Date(combinedData.timestamp).toLocaleString()}

## Summary

Overall Status: **${combinedData.stats.failed > 0 ? "FAILED" : "PASSED"}**

- Total: ${combinedData.stats.total}
- Passed: ${combinedData.stats.passed}
- Failed: ${combinedData.stats.failed}
- Skipped: ${combinedData.stats.skipped}

## Results by Category

| Category | Status | Passed | Failed | Skipped | Total |
|----------|--------|--------|--------|---------|-------|
${Object.entries(combinedData.categories)
  .filter(([_, data]) => data.total > 0)
  .map(
    ([category, data]) =>
      `| ${category} | ${data.failed > 0 ? "FAILED" : "PASSED"} | ${data.passed} | ${data.failed} | ${data.skipped} | ${data.total} |`,
  )
  .join("\n")}

${
  combinedData.failedTests.length > 0
    ? `
## Failed Tests

${combinedData.failedTests
  .map(
    (test) => `
### ${test.category}: ${test.suite} - ${test.name}

\`\`\`
${test.errorMessage || "Unknown error"}
\`\`\`
`,
  )
  .join("\n")}
`
    : ""
}

---

*Generated with the Test Report Generator*
`;

  fs.writeFileSync(reportPath, markdownContent);
  console.log(`✓ Markdown report generated: ${reportPath}`);
}

// Main processing function
function processTestResults() {
  // Process Vitest JSON reports
  const vitestReports = findTestResults(options.input, /\.json$/);
  vitestReports.forEach((filePath) => {
    processVitestReport(filePath);
  });

  // Process Playwright reports
  const playwrightReports = findTestResults(options.input, /report\.json$/);
  playwrightReports.forEach((filePath) => {
    processPlaywrightReport(filePath);
  });

  // Process performance reports
  const performanceReports = findTestResults(
    options.input,
    /performance.*\.json$/,
  );
  performanceReports.forEach((filePath) => {
    processPerformanceReport(filePath);
  });

  // Generate reports in requested formats
  if (outputFormats.includes("html")) {
    generateHtmlReport();
  }

  if (outputFormats.includes("json")) {
    generateJsonReport();
  }

  if (outputFormats.includes("md")) {
    generateMarkdownReport();
  }

  console.log("Report generation complete.");

  // Exit with appropriate code
  process.exit(combinedData.stats.failed > 0 ? 1 : 0);
}

// Run the main function
processTestResults();
