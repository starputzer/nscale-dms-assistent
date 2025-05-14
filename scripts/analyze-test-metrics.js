#!/usr/bin/env node

/**
 * Test Metrics Trend Analysis
 * 
 * This script analyzes test metrics over time to identify trends in test performance,
 * coverage, and stability. It can help identify slow tests, flaky tests, and track
 * progress of test coverage over time.
 * 
 * Usage:
 *   node scripts/analyze-test-metrics.js [options]
 * 
 * Options:
 *   --reportsDir <dir>        Directory containing report archives (default: "test-archives")
 *   --outputDir <dir>         Output directory for analysis reports (default: "test-analysis")
 *   --period <days>           Analysis period in days (default: 30)
 *   --detect-flaky            Enable flaky test detection
 *   --detect-slow             Enable slow test detection
 *   --performance-threshold   Performance degradation threshold percentage (default: 10)
 */

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const { createCanvas } = require('canvas');

// Define CLI options
program
  .option('--reportsDir <dir>', 'Directory containing report archives', 'test-archives')
  .option('--outputDir <dir>', 'Output directory for analysis reports', 'test-analysis')
  .option('--period <days>', 'Analysis period in days', 30)
  .option('--detect-flaky', 'Enable flaky test detection')
  .option('--detect-slow', 'Enable slow test detection')
  .option('--performance-threshold <percent>', 'Performance degradation threshold percentage', 10)
  .parse(process.argv);

const options = program.opts();

// Ensure output directory exists
if (!fs.existsSync(options.outputDir)) {
  fs.mkdirSync(options.outputDir, { recursive: true });
}

console.log(`Analyzing test metrics from: ${options.reportsDir}`);
console.log(`Output directory: ${options.outputDir}`);
console.log(`Analysis period: ${options.period} days`);

// Calculate date range for analysis
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - options.period);

console.log(`Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

// Find report files within date range
function findReportFiles() {
  const reportFiles = [];
  
  if (!fs.existsSync(options.reportsDir)) {
    console.error(`Reports directory not found: ${options.reportsDir}`);
    return reportFiles;
  }
  
  // List all files in the reports directory
  const files = fs.readdirSync(options.reportsDir, { withFileTypes: true });
  
  for (const file of files) {
    // Look for nightly report directories with date stamp
    if (file.isDirectory() && file.name.startsWith('nightly-report-')) {
      const dateStr = file.name.replace('nightly-report-', '');
      const reportDate = new Date(dateStr);
      
      // Check if report is within our date range
      if (reportDate >= startDate && reportDate <= endDate) {
        const reportFilePath = path.join(options.reportsDir, file.name, 'report.json');
        
        if (fs.existsSync(reportFilePath)) {
          try {
            const reportData = JSON.parse(fs.readFileSync(reportFilePath, 'utf8'));
            reportFiles.push({
              date: reportDate,
              path: reportFilePath,
              data: reportData,
            });
          } catch (error) {
            console.error(`Error parsing report file ${reportFilePath}:`, error.message);
          }
        }
      }
    }
  }
  
  // Sort reports by date
  reportFiles.sort((a, b) => a.date - b.date);
  
  console.log(`Found ${reportFiles.length} reports within date range.`);
  return reportFiles;
}

// Process test category metrics over time
function analyzeCategoryTrends(reports) {
  const categories = {};
  
  // Initialize with all categories from the first report
  if (reports.length > 0) {
    const firstReport = reports[0].data;
    Object.keys(firstReport.categories).forEach(category => {
      categories[category] = {
        name: category,
        dates: [],
        totalTests: [],
        passedTests: [],
        failedTests: [],
        skippedTests: [],
        passRate: [],
      };
    });
  }
  
  // Collect data points for each report
  reports.forEach(report => {
    const { date, data } = report;
    const dateStr = date.toISOString().split('T')[0];
    
    Object.entries(data.categories).forEach(([category, metrics]) => {
      // Create category entry if it doesn't exist (for new categories)
      if (!categories[category]) {
        categories[category] = {
          name: category,
          dates: [],
          totalTests: [],
          passedTests: [],
          failedTests: [],
          skippedTests: [],
          passRate: [],
        };
      }
      
      // Add data point
      categories[category].dates.push(dateStr);
      categories[category].totalTests.push(metrics.total);
      categories[category].passedTests.push(metrics.passed);
      categories[category].failedTests.push(metrics.failed);
      categories[category].skippedTests.push(metrics.skipped);
      categories[category].passRate.push(metrics.total > 0 ? (metrics.passed / metrics.total) * 100 : 0);
    });
  });
  
  return categories;
}

// Detect flaky tests (tests that sometimes pass and sometimes fail)
function detectFlakyTests(reports) {
  const testResults = {};
  
  // Collect test results across all reports
  reports.forEach(report => {
    const { date, data } = report;
    const dateStr = date.toISOString().split('T')[0];
    
    // Process failed tests
    if (data.failedTests) {
      data.failedTests.forEach(test => {
        const testId = `${test.category}:${test.suite}:${test.name}`;
        
        if (!testResults[testId]) {
          testResults[testId] = {
            id: testId,
            category: test.category,
            suite: test.suite,
            name: test.name,
            results: {},
          };
        }
        
        testResults[testId].results[dateStr] = 'failed';
      });
    }
    
    // Process all test suites to find passing tests
    if (data.testResults) {
      data.testResults.forEach(suite => {
        if (suite.assertionResults) {
          suite.assertionResults.forEach(test => {
            const testId = `${test.category || 'unknown'}:${suite.name}:${test.title}`;
            
            if (!testResults[testId]) {
              testResults[testId] = {
                id: testId,
                category: test.category || 'unknown',
                suite: suite.name,
                name: test.title,
                results: {},
              };
            }
            
            if (!testResults[testId].results[dateStr]) {
              testResults[testId].results[dateStr] = test.status === 'passed' ? 'passed' : 'failed';
            }
          });
        }
      });
    }
  });
  
  // Identify flaky tests
  const flakyTests = [];
  
  Object.values(testResults).forEach(test => {
    const results = Object.values(test.results);
    
    if (results.length >= 2) {
      // Check if the test has both passes and failures
      const hasPassed = results.includes('passed');
      const hasFailed = results.includes('failed');
      
      if (hasPassed && hasFailed) {
        // Calculate flakiness percentage
        const totalRuns = results.length;
        const failCount = results.filter(r => r === 'failed').length;
        const passCount = results.filter(r => r === 'passed').length;
        const flakiness = Math.min(passCount, failCount) / totalRuns * 100;
        
        flakyTests.push({
          ...test,
          flakiness: flakiness.toFixed(2),
          passCount,
          failCount,
          totalRuns,
        });
      }
    }
  });
  
  // Sort by flakiness (most flaky first)
  flakyTests.sort((a, b) => b.flakiness - a.flakiness);
  
  return flakyTests;
}

// Detect performance trends in test execution
function analyzePerformanceTrends(reports) {
  // Track performance metrics over time
  const performanceTrends = {
    overallDuration: [],
    averageDuration: [],
    dates: [],
    categories: {},
  };
  
  reports.forEach(report => {
    const { date, data } = report;
    const dateStr = date.toISOString().split('T')[0];
    
    // Add date point
    performanceTrends.dates.push(dateStr);
    
    // Add overall duration
    performanceTrends.overallDuration.push(data.stats.duration || 0);
    
    // Calculate average test duration
    const avgDuration = data.stats.duration && data.stats.total 
      ? data.stats.duration / data.stats.total 
      : 0;
    performanceTrends.averageDuration.push(avgDuration);
    
    // Process categories
    Object.entries(data.categories).forEach(([category, metrics]) => {
      if (!performanceTrends.categories[category]) {
        performanceTrends.categories[category] = {
          name: category,
          duration: [],
          averageDuration: [],
        };
      }
      
      performanceTrends.categories[category].duration.push(metrics.duration || 0);
      
      // Calculate average test duration for this category
      const categoryAvgDuration = metrics.duration && metrics.total 
        ? metrics.duration / metrics.total 
        : 0;
      performanceTrends.categories[category].averageDuration.push(categoryAvgDuration);
    });
  });
  
  return performanceTrends;
}

// Detect slow tests
function detectSlowTests(reports) {
  const testTimings = {};
  
  // Collect test timings across all reports
  reports.forEach(report => {
    const { data } = report;
    
    // Process test results to find test durations
    if (data.testResults) {
      data.testResults.forEach(suite => {
        if (suite.assertionResults) {
          suite.assertionResults.forEach(test => {
            const testId = `${test.category || 'unknown'}:${suite.name}:${test.title}`;
            
            if (!testTimings[testId]) {
              testTimings[testId] = {
                id: testId,
                category: test.category || 'unknown',
                suite: suite.name,
                name: test.title,
                durations: [],
              };
            }
            
            if (test.duration) {
              testTimings[testId].durations.push(test.duration);
            }
          });
        }
      });
    }
  });
  
  // Calculate average durations
  const slowTests = Object.values(testTimings)
    .filter(test => test.durations.length > 0)
    .map(test => {
      const totalDuration = test.durations.reduce((sum, duration) => sum + duration, 0);
      const avgDuration = totalDuration / test.durations.length;
      
      return {
        ...test,
        avgDuration,
      };
    });
  
  // Sort by average duration (slowest first)
  slowTests.sort((a, b) => b.avgDuration - a.avgDuration);
  
  return slowTests.slice(0, 20); // Return top 20 slowest tests
}

// Generate a line chart for trend data
function generateChart(data, labels, title, ylabel, filename) {
  const width = 800;
  const height = 400;
  const padding = 50;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  // Draw title
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 20);
  
  // Draw y-axis label
  ctx.save();
  ctx.translate(15, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText(ylabel, 0, 0);
  ctx.restore();
  
  // Calculate scales
  const xScale = (width - padding * 2) / (labels.length - 1);
  const maxValue = Math.max(...data) * 1.1; // 10% padding
  const yScale = (height - padding * 2) / maxValue;
  
  // Draw axes
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  // X-axis
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  // Y-axis
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(padding, padding);
  ctx.stroke();
  
  // Draw x-axis labels (dates)
  ctx.font = '10px Arial';
  ctx.fillStyle = '#666666';
  ctx.textAlign = 'center';
  labels.forEach((label, i) => {
    const x = padding + i * xScale;
    // Only draw every nth label to avoid crowding
    if (i % Math.ceil(labels.length / 10) === 0 || i === labels.length - 1) {
      ctx.fillText(label, x, height - padding + 15);
    }
  });
  
  // Draw y-axis labels
  ctx.textAlign = 'right';
  const numYLabels = 5;
  for (let i = 0; i <= numYLabels; i++) {
    const value = (maxValue / numYLabels) * i;
    const y = height - padding - (value * yScale);
    ctx.fillText(value.toFixed(1), padding - 5, y);
    
    // Draw light horizontal grid line
    ctx.strokeStyle = '#dddddd';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }
  
  // Draw data line
  ctx.strokeStyle = '#4285F4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((value, i) => {
    const x = padding + i * xScale;
    const y = height - padding - (value * yScale);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
  
  // Draw data points
  ctx.fillStyle = '#4285F4';
  data.forEach((value, i) => {
    const x = padding + i * xScale;
    const y = height - padding - (value * yScale);
    
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(options.outputDir, filename), buffer);
  
  console.log(`Chart saved to: ${path.join(options.outputDir, filename)}`);
}

// Generate an HTML report
function generateHtmlReport(categoryTrends, flakyTests, performanceTrends, slowTests) {
  const reportPath = path.join(options.outputDir, 'trend-analysis.html');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Test Metrics Trend Analysis</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { border-bottom: 1px solid #eaecef; padding-bottom: 10px; }
        h2, h3 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
        h2 { border-bottom: 1px solid #eaecef; padding-bottom: 5px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .chart-container { border: 1px solid #ddd; border-radius: 5px; padding: 10px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #dfe2e5; padding: 8px 12px; text-align: left; }
        th { background-color: #f6f8fa; }
        .flaky { background-color: #FFF0F0; }
        .slow { background-color: #FFF8E1; }
        .summary { margin-bottom: 20px; }
        .chart-img { max-width: 100%; height: auto; }
        .issues-container { margin-top: 20px; }
        .issue-count { font-weight: bold; color: #dc3545; }
      </style>
    </head>
    <body>
      <h1>Test Metrics Trend Analysis</h1>
      <p>Analysis period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}</p>
      
      <div class="summary">
        <h2>Summary</h2>
        <p>Analyzed ${reports.length} test reports over the last ${options.period} days.</p>
        <div class="issues-container">
          ${flakyTests.length > 0 ? `<p>Found <span class="issue-count">${flakyTests.length}</span> potentially flaky tests.</p>` : ''}
          ${slowTests.length > 0 ? `<p>Identified <span class="issue-count">${slowTests.length}</span> slow tests for optimization.</p>` : ''}
        </div>
      </div>
      
      <h2>Test Coverage Trends</h2>
      <div class="grid">
        ${Object.values(categoryTrends).map(category => `
          <div class="chart-container">
            <h3>${category.name} Test Counts</h3>
            <img src="${category.name}-test-counts.png" alt="${category.name} Test Counts" class="chart-img">
            <p>Current: ${category.totalTests[category.totalTests.length - 1]} tests, 
              ${category.passRate[category.passRate.length - 1].toFixed(1)}% pass rate</p>
          </div>
        `).join('')}
      </div>
      
      <h2>Performance Trends</h2>
      <div class="grid">
        <div class="chart-container">
          <h3>Overall Test Duration</h3>
          <img src="overall-duration.png" alt="Overall Test Duration" class="chart-img">
          <p>Latest: ${(performanceTrends.overallDuration[performanceTrends.overallDuration.length - 1] / 1000).toFixed(2)} seconds</p>
        </div>
        <div class="chart-container">
          <h3>Average Test Duration</h3>
          <img src="average-duration.png" alt="Average Test Duration" class="chart-img">
          <p>Latest: ${(performanceTrends.averageDuration[performanceTrends.averageDuration.length - 1]).toFixed(2)} ms</p>
        </div>
        ${Object.values(performanceTrends.categories).map(category => `
          <div class="chart-container">
            <h3>${category.name} Duration</h3>
            <img src="${category.name}-duration.png" alt="${category.name} Duration" class="chart-img">
            <p>Latest: ${(category.duration[category.duration.length - 1] / 1000).toFixed(2)} seconds</p>
          </div>
        `).join('')}
      </div>
      
      ${flakyTests.length > 0 ? `
        <h2>Flaky Tests</h2>
        <p>Tests that sometimes pass and sometimes fail may indicate unstable behavior.</p>
        <table>
          <tr>
            <th>Test</th>
            <th>Category</th>
            <th>Flakiness</th>
            <th>Pass / Fail Ratio</th>
            <th>Total Runs</th>
          </tr>
          ${flakyTests.map(test => `
            <tr class="flaky">
              <td>${test.suite}: ${test.name}</td>
              <td>${test.category}</td>
              <td>${test.flakiness}%</td>
              <td>${test.passCount} / ${test.failCount}</td>
              <td>${test.totalRuns}</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}
      
      ${slowTests.length > 0 ? `
        <h2>Slow Tests</h2>
        <p>These tests consistently take the longest time to execute and might benefit from optimization.</p>
        <table>
          <tr>
            <th>Test</th>
            <th>Category</th>
            <th>Average Duration</th>
          </tr>
          ${slowTests.map(test => `
            <tr class="slow">
              <td>${test.suite}: ${test.name}</td>
              <td>${test.category}</td>
              <td>${test.avgDuration.toFixed(2)} ms</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}
      
      <footer>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </footer>
    </body>
    </html>
  `;
  
  fs.writeFileSync(reportPath, htmlContent);
  console.log(`✓ HTML trend analysis report generated: ${reportPath}`);
}

// Main function
async function analyzeTrends() {
  // Find report files
  const reports = findReportFiles();
  
  if (reports.length === 0) {
    console.error('No reports found for analysis.');
    process.exit(1);
  }
  
  // Analyze test category trends
  const categoryTrends = analyzeCategoryTrends(reports);
  
  // Generate charts for each category
  Object.values(categoryTrends).forEach(category => {
    generateChart(
      category.totalTests,
      category.dates,
      `${category.name} Test Count Trend`,
      'Test Count',
      `${category.name}-test-counts.png`
    );
    
    generateChart(
      category.passRate,
      category.dates,
      `${category.name} Pass Rate Trend`,
      'Pass Rate (%)',
      `${category.name}-pass-rate.png`
    );
  });
  
  // Analyze performance trends
  const performanceTrends = analyzePerformanceTrends(reports);
  
  // Generate performance charts
  generateChart(
    performanceTrends.overallDuration,
    performanceTrends.dates,
    'Overall Test Duration Trend',
    'Duration (ms)',
    'overall-duration.png'
  );
  
  generateChart(
    performanceTrends.averageDuration,
    performanceTrends.dates,
    'Average Test Duration Trend',
    'Duration (ms)',
    'average-duration.png'
  );
  
  Object.values(performanceTrends.categories).forEach(category => {
    generateChart(
      category.duration,
      performanceTrends.dates,
      `${category.name} Duration Trend`,
      'Duration (ms)',
      `${category.name}-duration.png`
    );
  });
  
  // Optional analyses
  let flakyTests = [];
  let slowTests = [];
  
  if (options.detectFlaky) {
    flakyTests = detectFlakyTests(reports);
    console.log(`Detected ${flakyTests.length} potentially flaky tests.`);
  }
  
  if (options.detectSlow) {
    slowTests = detectSlowTests(reports);
    console.log(`Identified ${slowTests.length} slow tests.`);
  }
  
  // Generate HTML report
  generateHtmlReport(categoryTrends, flakyTests, performanceTrends, slowTests);
  
  console.log('Analysis complete!');
}

// Run the analysis
analyzeTrends().catch(error => {
  console.error('Error during trend analysis:', error);
  process.exit(1);
});