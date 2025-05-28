#!/usr/bin/env node

/**
 * Test Notification System
 *
 * This script processes test reports and sends notifications based on configurable
 * rules. It supports sending alerts to Slack, email, and creating GitHub issues.
 *
 * Usage:
 *   node scripts/send-test-notifications.js [options]
 *
 * Options:
 *   --report <path>         Path to test report JSON file (default: "test-report/report.json")
 *   --config <path>         Path to notification config file (default: ".github/notification-config.json")
 *   --slack-webhook <url>   Slack webhook URL (overrides env variable)
 *   --dry-run               Print messages without sending notifications
 */

const fs = require("fs");
const path = require("path");
const { program } = require("commander");
const axios = require("axios");
const nodemailer = require("nodemailer");
const { Octokit } = require("@octokit/rest");

// Define CLI options
program
  .option(
    "--report <path>",
    "Path to test report JSON file",
    "test-report/report.json",
  )
  .option(
    "--config <path>",
    "Path to notification config file",
    ".github/notification-config.json",
  )
  .option("--slack-webhook <url>", "Slack webhook URL (overrides env variable)")
  .option("--dry-run", "Print messages without sending notifications")
  .parse(process.argv);

const options = program.opts();

// Get environment variables and settings
const slackWebhookUrl = options.slackWebhook || process.env.SLACK_WEBHOOK_URL;
const githubToken = process.env.GITHUB_TOKEN;
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;
const emailServer = process.env.EMAIL_SERVER;
const emailPort = process.env.EMAIL_PORT || 587;

// Read configuration
let config;
try {
  const configPath = path.resolve(options.config);
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  console.log(`Loaded notification config from: ${configPath}`);
} catch (error) {
  console.error(`Error loading config file: ${error.message}`);
  process.exit(1);
}

// Read test report
let testReport;
try {
  const reportPath = path.resolve(options.report);
  testReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  console.log(`Loaded test report from: ${reportPath}`);
} catch (error) {
  console.error(`Error loading test report: ${error.message}`);
  process.exit(1);
}

// Initialize notification clients
let slackClient = null;
let emailClient = null;
let githubClient = null;

// Setup Slack client if enabled
if (config.notifications.slack.enabled && slackWebhookUrl && !options.dryRun) {
  slackClient = {
    sendMessage: async (message, channel) => {
      try {
        await axios.post(slackWebhookUrl, {
          channel: channel || config.notifications.slack.channels.general,
          text: message,
        });
        return true;
      } catch (error) {
        console.error(`Error sending Slack message: ${error.message}`);
        return false;
      }
    },
  };
}

// Setup email client if enabled
if (
  config.notifications.email.enabled &&
  emailUser &&
  emailPassword &&
  !options.dryRun
) {
  emailClient = nodemailer.createTransport({
    host: emailServer,
    port: emailPort,
    secure: emailPort === 465,
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
}

// Setup GitHub client if enabled
if (config.notifications.github.enabled && githubToken && !options.dryRun) {
  githubClient = new Octokit({
    auth: githubToken,
  });
}

// Get repository info from environment
const repo = process.env.GITHUB_REPOSITORY || "owner/repo";
const [owner, repoName] = repo.split("/");
const branch = process.env.GITHUB_REF_NAME || "unknown";
const commitSha = process.env.GITHUB_SHA || "unknown";
const buildUrl =
  process.env.GITHUB_SERVER_URL &&
  process.env.GITHUB_REPOSITORY &&
  process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : "unknown";

// Prepare test report data for rule evaluation
const evaluationContext = {
  // Test statistics
  totalTests: testReport.stats.total,
  passedTests: testReport.stats.passed,
  failedTests: testReport.stats.failed,
  skippedTests: testReport.stats.skipped,

  // Categories
  categories: testReport.categories,

  // Repository info
  repo,
  owner,
  repoName,
  branch,
  commitSha,
  buildUrl,

  // Performance data (if available)
  performanceDegradation: testReport.performanceDegradation || 0,
  memoryIncrease: testReport.memoryIncrease || 0,

  // Flaky tests (if available)
  flakyTests: testReport.flakyTests || [],

  // Alert thresholds from config
  alertThresholds: config.alertThresholds,
};

// Format and send notifications based on rules
async function processNotificationRules() {
  const { notificationRules } = config;
  let notificationsSent = 0;

  for (const rule of notificationRules) {
    try {
      // Evaluate rule condition
      const conditionMet = evaluateCondition(rule.condition, evaluationContext);

      if (conditionMet) {
        console.log(`Rule matched: ${rule.name}`);

        // Process message template
        const message = formatMessage(rule.message, evaluationContext);

        // Send notifications based on rule configuration
        if (rule.channel) {
          await sendNotifications(rule, message);
          notificationsSent++;
        }

        // Create GitHub issue if specified
        if (rule.createIssue && githubClient) {
          await createGitHubIssue(rule, evaluationContext);
        }
      }
    } catch (error) {
      console.error(`Error processing rule "${rule.name}": ${error.message}`);
    }
  }

  console.log(
    `Processed ${notificationRules.length} rules, sent ${notificationsSent} notifications.`,
  );
}

// Evaluate a condition expression
function evaluateCondition(condition, context) {
  try {
    // Create a function that evaluates the condition with the provided context
    const fn = new Function(...Object.keys(context), `return ${condition};`);
    return fn(...Object.values(context));
  } catch (error) {
    console.error(
      `Error evaluating condition "${condition}": ${error.message}`,
    );
    return false;
  }
}

// Format a message template
function formatMessage(messageTemplate, context) {
  // Replace {{variableName}} with values from context
  return messageTemplate.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
    try {
      // Split the variable path (e.g., "flakyTests.length")
      const path = variable.split(".");
      let value = context;

      // Navigate through the path
      for (const key of path) {
        value = value[key];
        if (value === undefined) break;
      }

      return value !== undefined ? value : match;
    } catch (error) {
      console.error(
        `Error formatting variable "${variable}": ${error.message}`,
      );
      return match;
    }
  });
}

// Send notifications to configured channels
async function sendNotifications(rule, message) {
  const targetChannel = rule.channel;
  const priority = rule.priority || "medium";

  // Slack notification
  if (config.notifications.slack.enabled) {
    const channel =
      config.notifications.slack.channels[targetChannel] ||
      config.notifications.slack.channels.general;

    // Add mentions for high priority notifications
    let slackMessage = message;
    if (priority === "high") {
      const mentions = [
        ...(config.notifications.slack.mentionUsers || []),
        ...(config.notifications.slack.mentionGroups || []),
      ].join(" ");

      if (mentions) {
        slackMessage = `${mentions} ${slackMessage}`;
      }
    }

    if (options.dryRun) {
      console.log(
        `[DRY RUN] Would send Slack message to ${channel}: ${slackMessage}`,
      );
    } else if (slackClient) {
      console.log(`Sending Slack message to ${channel}`);
      await slackClient.sendMessage(slackMessage, channel);
    }
  }

  // Email notification
  if (
    config.notifications.email.enabled &&
    config.reportingFrequency.email === "immediate"
  ) {
    const recipients =
      config.notifications.email.recipients[targetChannel] ||
      config.notifications.email.recipients.general;

    if (options.dryRun) {
      console.log(
        `[DRY RUN] Would send email to ${recipients.join(", ")}: ${message}`,
      );
    } else if (emailClient) {
      console.log(`Sending email to ${recipients.join(", ")}`);

      const mailOptions = {
        from: emailUser,
        to: recipients.join(", "),
        cc: config.notifications.email.cc
          ? config.notifications.email.cc.join(", ")
          : undefined,
        subject: `[${priority.toUpperCase()}] Test Report Alert: ${rule.name}`,
        text: message,
        html: `<p>${message.replace(/\n/g, "<br>")}</p>`,
      };

      try {
        await emailClient.sendMail(mailOptions);
      } catch (error) {
        console.error(`Error sending email: ${error.message}`);
      }
    }
  }
}

// Create a GitHub issue based on test results
async function createGitHubIssue(rule, context) {
  if (!githubClient) return;

  // Determine which issue template to use
  let issueTemplate;

  if (rule.name.includes("failure") || context.failedTests > 0) {
    issueTemplate = config.issueTemplates.testFailure;
  } else if (rule.name.includes("performance")) {
    issueTemplate = config.issueTemplates.performanceRegression;
  } else if (rule.name.includes("flaky")) {
    issueTemplate = config.issueTemplates.flakyTests;
  }

  if (!issueTemplate) return;

  // Format issue title and body
  const title = formatMessage(issueTemplate.title, context);
  let body = formatMessage(issueTemplate.body, context);

  // Add additional details to the body based on issue type
  if (rule.name.includes("failure") || context.failedTests > 0) {
    // Add failed tests list
    const failedTestsList = testReport.failedTests
      .map(
        (test) =>
          `- **${test.suite}: ${test.name}**\n  ${test.errorMessage || "No error message"}`,
      )
      .join("\n\n");

    body = body.replace("{{failedTestsList}}", failedTestsList);
    body = body.replace(
      "{{failureDetails}}",
      `${context.failedTests} out of ${context.totalTests} tests failed.`,
    );
  } else if (rule.name.includes("performance")) {
    // Add performance details
    body = body.replace(
      "{{performanceDetails}}",
      `Performance has degraded by ${context.performanceDegradation}% compared to the baseline.`,
    );

    // Add affected areas (simplified example)
    body = body.replace(
      "{{affectedAreas}}",
      "Please review the complete performance report for details on affected areas.",
    );

    // Add recommendations (simplified example)
    body = body.replace(
      "{{recommendations}}",
      "- Review recent code changes that might affect performance\n- Check for increased bundle size\n- Look for inefficient rendering or excessive re-renders",
    );
  } else if (rule.name.includes("flaky")) {
    // Add flaky tests list
    const flakyTestsList = context.flakyTests
      .map(
        (test) =>
          `- **${test.suite}: ${test.name}**\n  Flakiness: ${test.flakiness}%`,
      )
      .join("\n\n");

    body = body.replace("{{flakyTestsList}}", flakyTestsList);
    body = body.replace(
      "{{flakyDetails}}",
      `${context.flakyTests.length} tests have been identified as flaky (sometimes passing, sometimes failing).`,
    );

    // Add recommendations (simplified example)
    body = body.replace(
      "{{recommendations}}",
      "- Review asynchronous code and timing issues\n- Check for race conditions\n- Consider adding better test isolation",
    );
  }

  // Create the issue
  if (options.dryRun) {
    console.log(`[DRY RUN] Would create GitHub issue: ${title}`);
    console.log(body);
  } else {
    try {
      const response = await githubClient.issues.create({
        owner,
        repo: repoName,
        title,
        body,
        labels: config.notifications.github.issueLabels,
        assignees: config.notifications.github.assignees,
      });

      console.log(
        `Created GitHub issue #${response.data.number}: ${response.data.html_url}`,
      );
    } catch (error) {
      console.error(`Error creating GitHub issue: ${error.message}`);
    }
  }
}

// Main function
async function main() {
  console.log("Processing test notifications...");

  await processNotificationRules();

  console.log("Notification processing complete!");
}

// Run the main function
main().catch((error) => {
  console.error("Error during notification processing:", error);
  process.exit(1);
});
