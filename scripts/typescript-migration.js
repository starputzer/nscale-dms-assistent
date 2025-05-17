#!/usr/bin/env node

/**
 * TypeScript Migration Helper
 * 
 * Dieses Skript unterstützt bei der Migration zu strikteren TypeScript-Einstellungen.
 * Es automatisiert einige häufige Korrekturen und erstellt einen Migrationsplan.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join, basename } from 'path';
import { createInterface } from 'readline';

// Konfiguration
const rootDir = resolve(process.cwd());
const srcDir = join(rootDir, 'src');
const reportsDir = join(rootDir, 'typecheck-reports');
const tsConfigPath = join(rootDir, 'tsconfig.json');
const tsConfigOptimizedPath = join(rootDir, 'tsconfig.optimized.json');

// Sicherstellen, dass das Reports-Verzeichnis existiert
if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir, { recursive: true });
}

// Befehlszeilenargumente verarbeiten
const args = process.argv.slice(2);
const command = args[0] || 'help';
const target = args[1] || '';

// Readline-Interface für die Benutzerinteraktion
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Hilfefunktion
function showHelp() {
  console.log(`
TypeScript Migration Helper

Verwendung:
  node typescript-migration.js <command> [target]

Befehle:
  analyze             Führt eine Analyse der TypeScript-Fehler durch
  fix-unused          Entfernt nicht verwendete Variablen und Importe
  enable <option>     Aktiviert eine TypeScript-Option in tsconfig.json
  create-plan         Erstellt einen Migrationsplan mit Prioritäten
  apply-fixes <dir>   Wendet automatische Korrekturen auf ein Verzeichnis an
  help                Zeigt diese Hilfe an

Beispiele:
  node typescript-migration.js analyze
  node typescript-migration.js fix-unused
  node typescript-migration.js enable strictNullChecks
  node typescript-migration.js create-plan
  node typescript-migration.js apply-fixes src/utils
  `);
  process.exit(0);
}

// TypeScript-Fehler analysieren
async function analyzeTypeScriptErrors() {
  console.log('Analysiere TypeScript-Fehler...');
  
  try {
    // Führe den inkrementellen TypeScript-Check aus
    execSync('npm run typecheck:incremental', { stdio: 'inherit' });
    
    // Lese den Bericht ein
    const reportPath = join(reportsDir, 'typecheck-report.json');
    if (!existsSync(reportPath)) {
      console.error('Bericht nicht gefunden. Bitte führe zuerst "npm run typecheck:incremental" aus.');
      process.exit(1);
    }
    
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    
    // Fehlertypen kategorisieren
    const errorCategories = {
      unusedVariables: 0,
      nullChecks: 0,
      indexSignatures: 0,
      typeAssertions: 0,
      other: 0
    };
    
    // Für jedes Verzeichnis mit Fehlern
    Object.keys(report.directories).forEach(dir => {
      const errorFile = join(reportsDir, `${dir}-errors.txt`);
      if (existsSync(errorFile)) {
        const errorContent = readFileSync(errorFile, 'utf8');
        
        // Zähle die verschiedenen Fehlertypen
        if (errorContent.includes('TS6133:')) errorCategories.unusedVariables++;
        if (errorContent.includes('TS2532:') || errorContent.includes('TS2533:')) errorCategories.nullChecks++;
        if (errorContent.includes('TS4111:')) errorCategories.indexSignatures++;
        if (errorContent.includes('TS2352:') || errorContent.includes('TS2339:')) errorCategories.typeAssertions++;
        errorCategories.other++;
      }
    });
    
    // Fehlerübersicht ausgeben
    console.log('\nFehlerübersicht nach Kategorie:');
    console.log('------------------------------');
    console.log(`Nicht verwendete Variablen: ${errorCategories.unusedVariables}`);
    console.log(`Null-Checks-Probleme: ${errorCategories.nullChecks}`);
    console.log(`Index-Signatur-Probleme: ${errorCategories.indexSignatures}`);
    console.log(`Type-Assertion-Probleme: ${errorCategories.typeAssertions}`);
    console.log(`Andere Probleme: ${errorCategories.other}`);
    
    // Empfehlungen für Korrekturen ausgeben
    console.log('\nEmpfehlungen:');
    console.log('-------------');
    if (errorCategories.unusedVariables > 0) {
      console.log('- Verwende "node typescript-migration.js fix-unused" um nicht verwendete Variablen zu entfernen');
    }
    if (errorCategories.nullChecks > 0) {
      console.log('- Führe Null-Checks ein oder verwende den optionalen Ketten-Operator (?.)');
    }
    if (errorCategories.indexSignatures > 0) {
      console.log('- Verwende Bracket-Notation für Index-Signaturen: obj["property"] statt obj.property');
    }
    if (errorCategories.typeAssertions > 0) {
      console.log('- Ersetze "as" type assertions durch Typ-Guards');
    }
    
    // Migrationsplan vorschlagen
    console.log('\nNächste Schritte:');
    console.log('--------------');
    console.log('1. Verwende "node typescript-migration.js create-plan" um einen detaillierten Migrationsplan zu erstellen');
    console.log('2. Beginne mit der Behebung von "Quick Wins" (Dateien mit wenigen Fehlern)');
    console.log('3. Aktiviere striktere TypeScript-Optionen schrittweise');
    
  } catch (error) {
    console.error('Fehler bei der Analyse:', error.message);
    process.exit(1);
  }
}

// Nicht verwendete Variablen und Importe entfernen
async function fixUnusedVariables() {
  console.log('Entferne nicht verwendete Variablen und Importe...');
  
  try {
    // ESLint mit der Regel no-unused-vars ausführen
    console.log('Führe ESLint aus, um nicht verwendete Variablen zu finden...');
    execSync('npx eslint --fix "src/**/*.{ts,tsx}" --rule "no-unused-vars: error" --rule "no-unused-imports: error"', 
      { stdio: 'inherit' });
    
    console.log('\nNicht verwendete Variablen wurden entfernt!');
    console.log('\nFühre nun TypeScript-Check aus, um den Fortschritt zu sehen...');
    execSync('npm run typecheck:strict', { stdio: 'inherit' });
    
  } catch (error) {
    if (error.status !== 0) {
      console.error('Fehler beim Entfernen nicht verwendeter Variablen:', error.message);
      process.exit(1);
    }
    
    // ESLint gibt Fehler aus, aber das ist in Ordnung, da wir nur nach Mustern suchen
    console.log('\nEinige nicht verwendete Variablen wurden entfernt!');
    console.log('\nFühre nun TypeScript-Check aus, um den Fortschritt zu sehen...');
    try {
      execSync('npm run typecheck:strict', { stdio: 'inherit' });
    } catch (e) {
      // TypeScript-Fehler sind zu erwarten
    }
  }
}

// Eine TypeScript-Option aktivieren
async function enableTypeScriptOption(option) {
  if (!option) {
    console.error('Bitte gib eine TypeScript-Option an, die aktiviert werden soll.');
    process.exit(1);
  }
  
  console.log(`Aktiviere TypeScript-Option: ${option}...`);
  
  try {
    // tsconfig.json einlesen
    const tsConfig = JSON.parse(readFileSync(tsConfigPath, 'utf8'));
    
    // Option aktivieren
    if (!tsConfig.compilerOptions) {
      tsConfig.compilerOptions = {};
    }
    
    tsConfig.compilerOptions[option] = true;
    
    // Änderungen bestätigen lassen
    rl.question(`Möchtest du die Option "${option}" in tsconfig.json aktivieren? (j/N) `, answer => {
      if (answer.toLowerCase() === 'j') {
        // tsconfig.json schreiben
        writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2), 'utf8');
        console.log(`\nOption "${option}" wurde in tsconfig.json aktiviert!`);
        
        // TypeScript-Check ausführen
        console.log('\nFühre TypeScript-Check aus, um die Auswirkungen zu sehen...');
        try {
          execSync('npm run typecheck', { stdio: 'inherit' });
        } catch (e) {
          console.log('\nEs gibt TypeScript-Fehler, die durch die neue Option verursacht werden.');
          console.log('Verwende "node typescript-migration.js analyze" um die Fehler zu analysieren.');
        }
      } else {
        console.log('\nVorgang abgebrochen. Keine Änderungen wurden vorgenommen.');
      }
      
      rl.close();
    });
    
  } catch (error) {
    console.error('Fehler beim Aktivieren der TypeScript-Option:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Einen Migrationsplan erstellen
async function createMigrationPlan() {
  console.log('Erstelle Migrationsplan...');
  
  try {
    // Führe den inkrementellen TypeScript-Check aus
    execSync('npm run typecheck:incremental', { stdio: 'inherit' });
    
    // Lese den Bericht ein
    const reportPath = join(reportsDir, 'typecheck-report.json');
    if (!existsSync(reportPath)) {
      console.error('Bericht nicht gefunden. Bitte führe zuerst "npm run typecheck:incremental" aus.');
      process.exit(1);
    }
    
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    
    // Dateien nach Fehleranzahl sortieren
    const directoriesByErrorCount = Object.keys(report.directories)
      .filter(dir => report.directories[dir].errorCount > 0)
      .sort((a, b) => report.directories[a].errorCount - report.directories[b].errorCount);
    
    // Plan erstellen
    const plan = {
      timestamp: new Date().toISOString(),
      totalErrors: report.totalErrors,
      phases: [
        {
          name: "Phase 1: Quick Wins",
          description: "Dateien mit wenigen Fehlern beheben",
          directories: directoriesByErrorCount.slice(0, 5),
          estimatedTime: "1-2 Tage"
        },
        {
          name: "Phase 2: Häufige Fehler beheben",
          description: "Häufige Fehlermuster in allen Dateien beheben",
          tasks: [
            "Nicht verwendete Variablen entfernen",
            "Null-Checks einführen",
            "Index-Signatur-Probleme beheben",
            "Type-Assertions ersetzen"
          ],
          estimatedTime: "3-5 Tage"
        },
        {
          name: "Phase 3: Komplexere Komponenten",
          description: "Komplexere Komponenten mit vielen Fehlern beheben",
          directories: directoriesByErrorCount.slice(5, 10),
          estimatedTime: "5-7 Tage"
        },
        {
          name: "Phase 4: Restliche Fehler",
          description: "Alle verbleibenden Fehler beheben",
          directories: directoriesByErrorCount.slice(10),
          estimatedTime: "7-14 Tage"
        },
        {
          name: "Phase 5: tsconfig.json optimieren",
          description: "Optimierte TypeScript-Konfiguration als Standard festlegen",
          tasks: [
            "tsconfig.optimized.json nach tsconfig.json übernehmen",
            "Finale Tests durchführen",
            "Dokumentation aktualisieren"
          ],
          estimatedTime: "1 Tag"
        }
      ]
    };
    
    // Plan speichern
    const planPath = join(reportsDir, 'migration-plan.json');
    writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');
    
    // Menschenlesbaren Plan erstellen
    const humanReadablePlan = `# TypeScript-Migrationsplan

Erstellt am: ${new Date().toLocaleString()}
Gesamtfehler: ${plan.totalErrors}

${plan.phases.map(phase => `
## ${phase.name}
${phase.description}

${phase.directories 
  ? `Verzeichnisse:
${phase.directories.map(dir => `- ${dir} (${report.directories[dir].errorCount} Fehler)`).join('\n')}`
  : ''}

${phase.tasks 
  ? `Aufgaben:
${phase.tasks.map(task => `- ${task}`).join('\n')}`
  : ''}

Geschätzte Zeit: ${phase.estimatedTime}
`).join('\n')}

## Nächste Schritte

1. Beginne mit Phase 1 und folge dem Plan
2. Führe regelmäßig "npm run typecheck:incremental" aus, um den Fortschritt zu verfolgen
3. Aktualisiere den Plan bei Bedarf

## Automatisierte Fixes

Verwende die folgenden Befehle für automatisierte Korrekturen:

\`\`\`
# Nicht verwendete Variablen entfernen
node scripts/typescript-migration.js fix-unused

# Automatische Korrekturen auf ein Verzeichnis anwenden
node scripts/typescript-migration.js apply-fixes src/utils
\`\`\`

## Dokumentation

Weitere Informationen zur Typüberprüfung findest du in:
- docs/TYPESCRIPT_STRICTER_TYPES.md
- docs/TYPESCRIPT_GUIDELINES.md
`;
    
    // Menschenlesbaren Plan speichern
    const humanReadablePlanPath = join(reportsDir, 'migration-plan.md');
    writeFileSync(humanReadablePlanPath, humanReadablePlan, 'utf8');
    
    console.log(`\nMigrationsplan wurde erstellt und gespeichert unter:`);
    console.log(`- ${planPath} (JSON-Format)`);
    console.log(`- ${humanReadablePlanPath} (Markdown-Format)`);
    
  } catch (error) {
    console.error('Fehler beim Erstellen des Migrationsplans:', error.message);
    process.exit(1);
  }
}

// Automatische Korrekturen auf ein Verzeichnis anwenden
async function applyFixes(directory) {
  if (!directory) {
    console.error('Bitte gib ein Verzeichnis an, auf das die Korrekturen angewendet werden sollen.');
    process.exit(1);
  }
  
  const targetDir = join(srcDir, directory.replace('src/', ''));
  
  if (!existsSync(targetDir)) {
    console.error(`Verzeichnis nicht gefunden: ${targetDir}`);
    process.exit(1);
  }
  
  console.log(`Wende automatische Korrekturen auf ${targetDir} an...`);
  
  try {
    // Nicht verwendete Variablen entfernen
    console.log('1. Entferne nicht verwendete Variablen...');
    try {
      execSync(`npx eslint --fix "${targetDir}/**/*.{ts,tsx}" --rule "no-unused-vars: error"`, 
        { stdio: 'inherit' });
    } catch (e) {
      // ESLint kann Fehler ausgeben, aber wir wollen weitermachen
    }
    
    // Weitere automatische Korrekturen könnten hier hinzugefügt werden
    
    console.log('\nAutomatische Korrekturen wurden angewendet!');
    console.log('\nFühre TypeScript-Check aus, um den Fortschritt zu sehen...');
    
    try {
      execSync(`npx tsc --noEmit --project ${tsConfigOptimizedPath} --files ${targetDir}/**/*.ts ${targetDir}/**/*.tsx`, 
        { stdio: 'inherit' });
      console.log('\nKeine TypeScript-Fehler gefunden!');
    } catch (e) {
      console.log('\nEs gibt noch TypeScript-Fehler, die manuell behoben werden müssen.');
    }
    
  } catch (error) {
    console.error('Fehler beim Anwenden der Korrekturen:', error.message);
    process.exit(1);
  }
}

// Hauptfunktion
async function main() {
  switch (command) {
    case 'analyze':
      await analyzeTypeScriptErrors();
      break;
    case 'fix-unused':
      await fixUnusedVariables();
      break;
    case 'enable':
      await enableTypeScriptOption(target);
      break;
    case 'create-plan':
      await createMigrationPlan();
      break;
    case 'apply-fixes':
      await applyFixes(target);
      break;
    case 'help':
    default:
      showHelp();
      break;
  }
}

// Ausführen
main().catch(error => {
  console.error('Fehler:', error.message);
  process.exit(1);
}).finally(() => {
  if (command !== 'enable') {
    rl.close();
  }
});