/**
 * E2E Tests für Admin RAG Settings Tab
 */
import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/login-page";
import { AdminPage } from "../../pages/admin-page";
import { testUsers } from "../../fixtures/test-users";

test.describe("Admin RAG Settings", () => {
  let loginPage: LoginPage;
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    adminPage = new AdminPage(page);

    // Als Admin einloggen
    await loginPage.goto();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    
    // Zum Admin-Panel navigieren
    await page.goto('/admin');
    await adminPage.selectTab('ragSettings');
  });

  test("RAG-Einstellungen Dashboard", async ({ page }) => {
    // Titel prüfen
    await expect(page.locator('h2')).toContainText('RAG-Einstellungen');
    
    // Haupt-Konfigurationsbereiche
    await expect(page.locator('.rag-config-section:has-text("Embedding-Konfiguration")')).toBeVisible();
    await expect(page.locator('.rag-config-section:has-text("Retrieval-Einstellungen")')).toBeVisible();
    await expect(page.locator('.rag-config-section:has-text("Generation-Parameter")')).toBeVisible();
    await expect(page.locator('.rag-config-section:has-text("Performance-Optimierung")')).toBeVisible();
  });

  test("Embedding-Modell konfigurieren", async ({ page }) => {
    // Embedding-Bereich
    const embeddingSection = page.locator('.rag-config-section:has-text("Embedding-Konfiguration")');
    
    // Modell-Auswahl
    await embeddingSection.locator('select[name="embeddingModel"]').selectOption('sentence-transformers/all-mpnet-base-v2');
    
    // Embedding-Dimensionen
    const dimensionInfo = embeddingSection.locator('.dimension-info');
    await expect(dimensionInfo).toContainText('768 Dimensionen');
    
    // Batch-Größe anpassen
    await embeddingSection.locator('input[name="embeddingBatchSize"]').fill('32');
    
    // Cache-Einstellungen
    await embeddingSection.locator('input[name="enableEmbeddingCache"]').check();
    await embeddingSection.locator('input[name="cacheSize"]').fill('10000');
    
    // Speichern
    await page.click('button:has-text("Embedding-Einstellungen speichern")');
    await expect(page.locator('.toast-success')).toContainText('Embedding-Konfiguration gespeichert');
  });

  test("Chunking-Strategie konfigurieren", async ({ page }) => {
    // Retrieval-Einstellungen öffnen
    const retrievalSection = page.locator('.rag-config-section:has-text("Retrieval-Einstellungen")');
    
    // Chunking-Tab
    await retrievalSection.locator('.config-tabs button:has-text("Chunking")').click();
    
    // Chunk-Größe
    const chunkSizeSlider = retrievalSection.locator('input[type="range"][name="chunkSize"]');
    await chunkSizeSlider.fill('512');
    
    // Überlappung
    const overlapSlider = retrievalSection.locator('input[type="range"][name="chunkOverlap"]');
    await overlapSlider.fill('128');
    
    // Chunking-Strategie
    await retrievalSection.locator('select[name="chunkingStrategy"]').selectOption('semantic');
    
    // Vorschau der Chunking-Einstellungen
    await retrievalSection.locator('button:has-text("Vorschau anzeigen")').click();
    const preview = page.locator('.chunking-preview');
    await expect(preview).toBeVisible();
    await expect(preview.locator('.chunk-example')).toHaveCount(3);
  });

  test("Retrieval-Parameter optimieren", async ({ page }) => {
    const retrievalSection = page.locator('.rag-config-section:has-text("Retrieval-Einstellungen")');
    
    // Retrieval-Tab
    await retrievalSection.locator('.config-tabs button:has-text("Retrieval")').click();
    
    // Top-K Einstellung
    await retrievalSection.locator('input[name="topK"]').fill('10');
    
    // Similarity Threshold
    await retrievalSection.locator('input[name="similarityThreshold"]').fill('0.7');
    
    // Reranking aktivieren
    await retrievalSection.locator('input[name="enableReranking"]').check();
    
    // Reranking-Modell auswählen
    await retrievalSection.locator('select[name="rerankingModel"]').selectOption('cross-encoder/ms-marco-MiniLM-L-12-v2');
    
    // Hybrid-Search aktivieren
    await retrievalSection.locator('input[name="enableHybridSearch"]').check();
    await retrievalSection.locator('input[name="bm25Weight"]').fill('0.3');
    
    // Test-Query ausführen
    await retrievalSection.locator('input[name="testQuery"]').fill('Wie lege ich eine neue Akte an?');
    await retrievalSection.locator('button:has-text("Query testen")').click();
    
    // Test-Ergebnisse prüfen
    const testResults = page.locator('.test-results');
    await expect(testResults).toBeVisible({ timeout: 10000 });
    await expect(testResults.locator('.result-item')).toHaveCount(10);
  });

  test("Generation-Parameter anpassen", async ({ page }) => {
    const generationSection = page.locator('.rag-config-section:has-text("Generation-Parameter")');
    
    // LLM-Modell auswählen
    await generationSection.locator('select[name="llmModel"]').selectOption('llama3:8b-instruct-q4_1');
    
    // Temperature
    const tempSlider = generationSection.locator('input[type="range"][name="temperature"]');
    await tempSlider.fill('0.7');
    await expect(generationSection.locator('.temperature-value')).toContainText('0.7');
    
    // Max Tokens
    await generationSection.locator('input[name="maxTokens"]').fill('2048');
    
    // System-Prompt anpassen
    const systemPrompt = generationSection.locator('textarea[name="systemPrompt"]');
    await systemPrompt.fill('Du bist ein Experte für nscale Dokumentenmanagement. Antworte präzise und hilfreich basierend auf den bereitgestellten Kontextinformationen.');
    
    // Prompt-Template
    await generationSection.locator('select[name="promptTemplate"]').selectOption('custom');
    const customTemplate = generationSection.locator('textarea[name="customPromptTemplate"]');
    await expect(customTemplate).toBeVisible();
    
    // Response-Format
    await generationSection.locator('input[name="streamResponses"]').check();
    await generationSection.locator('input[name="includeSourceReferences"]').check();
  });

  test("Performance-Monitoring und Optimierung", async ({ page }) => {
    const performanceSection = page.locator('.rag-config-section:has-text("Performance-Optimierung")');
    
    // Aktuelle Performance-Metriken
    await expect(performanceSection.locator('.metric-card:has-text("Ø Antwortzeit")')).toBeVisible();
    await expect(performanceSection.locator('.metric-card:has-text("Queries/Sekunde")')).toBeVisible();
    await expect(performanceSection.locator('.metric-card:has-text("Cache Hit Rate")')).toBeVisible();
    await expect(performanceSection.locator('.metric-card:has-text("Speichernutzung")')).toBeVisible();
    
    // Performance-Graph
    await expect(performanceSection.locator('canvas#rag-performance-chart')).toBeVisible();
    
    // Cache-Optimierung
    await performanceSection.locator('.optimization-card:has-text("Cache")').click();
    await performanceSection.locator('button:has-text("Cache vorwärmen")').click();
    await expect(page.locator('.progress-indicator')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText('Cache erfolgreich vorgewärmt');
    
    // Index-Optimierung
    await performanceSection.locator('.optimization-card:has-text("Index")').click();
    await performanceSection.locator('button:has-text("Index optimieren")').click();
    await expect(page.locator('.toast-info')).toContainText('Index-Optimierung gestartet');
  });

  test("RAG-Pipeline testen", async ({ page }) => {
    // Test-Tab öffnen
    await page.click('.rag-tabs button:has-text("Pipeline-Test")');
    
    // Test-Interface
    const testInterface = page.locator('.pipeline-test-interface');
    await expect(testInterface).toBeVisible();
    
    // Test-Dokument hochladen
    const fileInput = testInterface.locator('input[type="file"]');
    await fileInput.setInputFiles('./fixtures/test-rag-document.txt');
    
    // Test-Query eingeben
    await testInterface.locator('textarea[name="testQuestion"]').fill('Was steht in diesem Dokument über Berechtigungen?');
    
    // Pipeline-Test starten
    await testInterface.locator('button:has-text("Pipeline testen")').click();
    
    // Pipeline-Schritte verfolgen
    const pipelineSteps = testInterface.locator('.pipeline-steps');
    await expect(pipelineSteps).toBeVisible();
    
    // Schritte prüfen
    await expect(pipelineSteps.locator('.step.completed:has-text("Dokument-Verarbeitung")')).toBeVisible({ timeout: 10000 });
    await expect(pipelineSteps.locator('.step.completed:has-text("Chunking")')).toBeVisible({ timeout: 10000 });
    await expect(pipelineSteps.locator('.step.completed:has-text("Embedding")')).toBeVisible({ timeout: 10000 });
    await expect(pipelineSteps.locator('.step.completed:has-text("Retrieval")')).toBeVisible({ timeout: 10000 });
    await expect(pipelineSteps.locator('.step.completed:has-text("Generation")')).toBeVisible({ timeout: 15000 });
    
    // Ergebnis prüfen
    const result = testInterface.locator('.test-result');
    await expect(result).toBeVisible();
    await expect(result.locator('.generated-answer')).toBeVisible();
    await expect(result.locator('.retrieved-chunks')).toBeVisible();
    await expect(result.locator('.performance-stats')).toBeVisible();
  });

  test("RAG-Konfiguration exportieren/importieren", async ({ page }) => {
    // Export-Button
    const exportButton = page.locator('button:has-text("Konfiguration exportieren")');
    await expect(exportButton).toBeVisible();
    
    // Export durchführen
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/rag-config.*\.json/);
    
    // Import-Button
    const importButton = page.locator('button:has-text("Konfiguration importieren")');
    await importButton.click();
    
    // Import-Dialog
    const importDialog = page.locator('.import-config-dialog');
    await expect(importDialog).toBeVisible();
    
    // Datei auswählen
    const importInput = importDialog.locator('input[type="file"]');
    await importInput.setInputFiles('./fixtures/rag-config-backup.json');
    
    // Vorschau der Änderungen
    await expect(importDialog.locator('.config-diff')).toBeVisible();
    await expect(importDialog.locator('.diff-item')).toHaveCount(5);
    
    // Import bestätigen
    await importDialog.locator('button:has-text("Importieren")').click();
    await expect(page.locator('.toast-success')).toContainText('Konfiguration erfolgreich importiert');
  });
});