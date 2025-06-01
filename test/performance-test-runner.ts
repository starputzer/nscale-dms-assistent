/**
 * Performance-Test-Runner für Vue 3 Optimierungen
 *
 * Dieses Skript führt alle Performance-Tests aus und generiert einen
 * zusammenfassenden Bericht über die gemessenen Optimierungen.
 */

import { fork } from "child_process";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";

// Konfiguration
const TEST_FILES = [
  "./test/watcher-performance.spec.ts",
  "./test/dynamic-import-performance.spec.ts",
  "./test/api-batching-performance.spec.ts",
  "./test/stores/performance/sessions.perf.spec.ts",
];

// Generiert ein eindeutiges ID für den Testlauf
const runId = `perf-${Date.now()}`;
const resultsDir = join(process.cwd(), "performance-results");

// Stellt sicher, dass das Ergebnisverzeichnis existiert
if (!existsSync(resultsDir)) {
  mkdirSync(resultsDir, { recursive: true });
}

// Performance-Ergebnisse
interface TestResult {
  name: string;
  metrics: Record<string, number>;
  comparisons: Record<
    string,
    {
      original: number;
      optimized: number;
      improvement: number;
      percentImprovement: number;
    }
  >;
  timestamp: string;
  duration: number;
}

const testResults: TestResult[] = [];

// Führt einen einzelnen Test aus
function runTest(testFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    // Vitest im Unterprozess ausführen
    const vitestProcess = fork(
      join(process.cwd(), "node_modules/vitest/vitest.mjs"),
      ["run", testFile, "--silent", "-c", "vitest.perf.config.ts"],
      { stdio: "pipe" },
    );

    let output = "";

    // Stdout sammeln
    vitestProcess.stdout?.on("data", (data) => {
      output += data.toString();
      process.stdout.write(data); // An Hauptprozess weitergeben
    });

    // Stderr sammeln und anzeigen
    vitestProcess.stderr?.on("data", (data) => {
      process.stderr.write(data);
    });

    // Warten auf Testabschluss
    vitestProcess.on("close", (code) => {
      const duration = Date.now() - startTime;

      // Metriken aus der Testausgabe extrahieren
      const metrics: Record<string, number> = {};
      const comparisons: Record<
        string,
        {
          original: number;
          optimized: number;
          improvement: number;
          percentImprovement: number;
        }
      > = {};

      const metricRegex = /([^:]+):\s+([\d.]+)ms/g;
      let match;

      while ((match = metricRegex.exec(output)) !== null) {
        metrics[match[1].trim()] = parseFloat(match[2]);
      }

      // Vergleichsdaten extrahieren (Original vs. Optimiert)
      const comparisonRegex =
        /([^:]+):\s+Original:\s+([\d.]+)ms,\s+Optimiert:\s+([\d.]+)ms/g;

      while ((match = comparisonRegex.exec(output)) !== null) {
        const name = match[1].trim();
        const original = parseFloat(match[2]);
        const optimized = parseFloat(match[3]);
        const improvement = original - optimized;
        const percentImprovement = (improvement / original) * 100;

        comparisons[name] = {
          original,
          optimized,
          improvement,
          percentImprovement,
        };
      }

      // Testergebnis speichern
      testResults.push({
        name: testFile.replace("./test/", "").replace(".spec.ts", ""),
        metrics,
        comparisons,
        timestamp: new Date().toISOString(),
        duration,
      });

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test ${testFile} failed with code ${code}`));
      }
    });
  });
}

// Führt alle Tests sequentiell aus
async function runAllTests() {
  console.log("Vue 3 Performance-Optimierungs-Tests\n");
  console.log(`Start: ${new Date().toLocaleString()}`);
  console.log("-------------------------------------");

  const startTime = Date.now();

  for (const testFile of TEST_FILES) {
    console.log(`\nRunning ${testFile}...`);
    try {
      await runTest(testFile);
      console.log(`✓ ${testFile} completed`);
    } catch (error) {
      console.error(`✗ ${testFile} failed:`, error);
    }
  }

  const totalDuration = Date.now() - startTime;
  console.log("\n-------------------------------------");
  console.log(`Total duration: ${(totalDuration / 1000).toFixed(2)}s`);

  // Bericht generieren
  generateReport(testResults, totalDuration);
}

// Generiert einen Bericht aus den Testergebnissen
function generateReport(results: TestResult[], totalDuration: number) {
  const reportPath = join(resultsDir, `performance-report-${runId}.json`);
  const summaryPath = join(resultsDir, `performance-summary-${runId}.txt`);

  // Vollständige Ergebnisse als JSON speichern
  writeFileSync(reportPath, JSON.stringify(results, null, 2));

  // Textbasierte Zusammenfassung erstellen
  let summary = "Vue 3 Performance-Optimierungs-Bericht\n";
  summary += "=====================================\n\n";
  summary += `Datum: ${new Date().toLocaleString()}\n`;
  summary += `Gesamtdauer: ${(totalDuration / 1000).toFixed(2)}s\n\n`;

  // Ermitteln der gesamten durchschnittlichen Verbesserung
  let totalImprovements = 0;
  let improvementCount = 0;

  results.forEach((result) => {
    summary += `Test: ${result.name}\n`;
    summary += "-----------------------------------\n";

    // Vergleichsdaten ausgeben
    if (Object.keys(result.comparisons).length > 0) {
      summary += "Leistungsvergleiche:\n\n";

      Object.entries(result.comparisons).forEach(([name, data]) => {
        summary += `${name}:\n`;
        summary += `  Original: ${data.original.toFixed(2)}ms\n`;
        summary += `  Optimiert: ${data.optimized.toFixed(2)}ms\n`;
        summary += `  Verbesserung: ${data.improvement.toFixed(2)}ms (${data.percentImprovement.toFixed(2)}%)\n\n`;

        totalImprovements += data.percentImprovement;
        improvementCount++;
      });
    }

    // Andere Metriken ausgeben
    if (Object.keys(result.metrics).length > 0) {
      summary += "Weitere Metriken:\n\n";

      Object.entries(result.metrics).forEach(([name, value]) => {
        summary += `  ${name}: ${value.toFixed(2)}ms\n`;
      });

      summary += "\n";
    }

    summary += "-----------------------------------\n\n";
  });

  // Gesamtzusammenfassung
  const averageImprovement =
    improvementCount > 0 ? totalImprovements / improvementCount : 0;

  summary += "Gesamtzusammenfassung:\n";
  summary += "-----------------------------------\n";
  summary += `Durchschnittliche Verbesserung: ${averageImprovement.toFixed(2)}%\n`;
  summary += `Anzahl der Vergleichsmetriken: ${improvementCount}\n`;
  summary += `Anzahl der Testdateien: ${results.length}\n`;

  // Zusammenfassung speichern
  writeFileSync(summaryPath, summary);

  console.log(`\nBericht gespeichert nach: ${reportPath}`);
  console.log(`Zusammenfassung gespeichert nach: ${summaryPath}`);

  // Zusammenfassung auch in der Konsole ausgeben
  console.log("\n" + summary);
}

// Hauptfunktion ausführen
runAllTests().catch((error) => {
  console.error("Error running tests:", error);
  process.exit(1);
});
