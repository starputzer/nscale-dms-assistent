/**
 * E2E Tests für Admin Dashboard Enhanced Tab
 */
import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/login-page";
import { AdminPage } from "../../pages/admin-page";
import { testUsers } from "../../fixtures/test-users";

test.describe("Admin Dashboard Enhanced", () => {
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
    await adminPage.selectTab('dashboardEnhanced');
  });

  test("Enhanced Dashboard mit erweiterten Widgets", async ({ page }) => {
    // Titel prüfen
    await expect(page.locator('h2')).toContainText('Dashboard Enhanced');
    
    // Erweiterte Widget-Bereiche
    await expect(page.locator('.real-time-analytics')).toBeVisible();
    await expect(page.locator('.predictive-insights')).toBeVisible();
    await expect(page.locator('.interactive-kpis')).toBeVisible();
    await expect(page.locator('.custom-dashboards')).toBeVisible();
  });

  test("Real-Time Analytics mit Live-Updates", async ({ page }) => {
    const analytics = page.locator('.real-time-analytics');
    
    // Live-Metriken
    await expect(analytics.locator('.live-metrics-grid')).toBeVisible();
    
    // Verschiedene Live-Widgets
    const liveWidgets = [
      'Aktive Benutzer',
      'Requests/Sekunde',
      'CPU-Auslastung',
      'Memory-Usage',
      'API-Latenz',
      'Error-Rate'
    ];
    
    for (const widget of liveWidgets) {
      const widgetElement = analytics.locator(`.metric-widget:has-text("${widget}")`);
      await expect(widgetElement).toBeVisible();
      await expect(widgetElement.locator('.metric-value')).toBeVisible();
      await expect(widgetElement.locator('.metric-sparkline')).toBeVisible();
    }
    
    // WebSocket-Connection Status
    await expect(analytics.locator('.websocket-status')).toBeVisible();
    await expect(analytics.locator('.websocket-status')).toHaveClass(/connected/);
    
    // Warten auf Live-Update
    const initialValue = await analytics.locator('.metric-widget:has-text("Requests/Sekunde") .metric-value').textContent();
    await page.waitForTimeout(2000);
    const updatedValue = await analytics.locator('.metric-widget:has-text("Requests/Sekunde") .metric-value').textContent();
    expect(initialValue).not.toBe(updatedValue);
  });

  test("Predictive Insights und ML-basierte Vorhersagen", async ({ page }) => {
    const insights = page.locator('.predictive-insights');
    
    // Vorhersage-Dashboard
    await expect(insights.locator('.prediction-overview')).toBeVisible();
    
    // Verschiedene Vorhersage-Modelle
    await expect(insights.locator('.prediction-card:has-text("Traffic-Vorhersage")')).toBeVisible();
    await expect(insights.locator('.prediction-card:has-text("Ressourcen-Bedarf")')).toBeVisible();
    await expect(insights.locator('.prediction-card:has-text("Error-Wahrscheinlichkeit")')).toBeVisible();
    await expect(insights.locator('.prediction-card:has-text("User-Wachstum")')).toBeVisible();
    
    // Traffic-Vorhersage Details
    const trafficPrediction = insights.locator('.prediction-card:has-text("Traffic-Vorhersage")');
    await trafficPrediction.click();
    
    const predictionDetail = page.locator('.prediction-detail-modal');
    await expect(predictionDetail).toBeVisible();
    
    // Vorhersage-Chart
    await expect(predictionDetail.locator('canvas#traffic-forecast-chart')).toBeVisible();
    
    // Confidence-Intervalle
    await expect(predictionDetail.locator('.confidence-bands')).toBeVisible();
    await predictionDetail.locator('input[name="showConfidenceBands"]').check();
    
    // Zeitraum anpassen
    await predictionDetail.locator('select[name="forecastPeriod"]').selectOption('7d');
    await expect(predictionDetail.locator('.forecast-updating')).toBeVisible();
    
    // Anomalie-Erkennung
    await predictionDetail.locator('.tab-button:has-text("Anomalien")').click();
    await expect(predictionDetail.locator('.anomaly-detection')).toBeVisible();
    await expect(predictionDetail.locator('.anomaly-timeline')).toBeVisible();
  });

  test("Interactive KPIs mit Drill-Down", async ({ page }) => {
    const kpis = page.locator('.interactive-kpis');
    
    // KPI-Grid
    await expect(kpis.locator('.kpi-grid')).toBeVisible();
    
    // Haupt-KPIs
    const mainKPIs = await kpis.locator('.kpi-tile').all();
    expect(mainKPIs.length).toBeGreaterThanOrEqual(6);
    
    // KPI Drill-Down
    const conversionKPI = kpis.locator('.kpi-tile:has-text("Conversion Rate")');
    await conversionKPI.click();
    
    // Drill-Down Panel
    const drillDown = page.locator('.kpi-drilldown-panel');
    await expect(drillDown).toBeVisible();
    
    // Breakdown nach verschiedenen Dimensionen
    await expect(drillDown.locator('.breakdown-dimension:has-text("Nach Quelle")')).toBeVisible();
    await expect(drillDown.locator('.breakdown-dimension:has-text("Nach Zeit")')).toBeVisible();
    await expect(drillDown.locator('.breakdown-dimension:has-text("Nach Benutzertyp")')).toBeVisible();
    
    // Interaktiver Filter
    await drillDown.locator('.dimension-filter select').selectOption('source');
    await expect(drillDown.locator('canvas#breakdown-chart')).toBeVisible();
    
    // Weitere Drill-Down Ebene
    await drillDown.locator('.chart-segment').first().click();
    await expect(drillDown.locator('.sub-breakdown')).toBeVisible();
  });

  test("Custom Dashboard Builder", async ({ page }) => {
    const customDashboards = page.locator('.custom-dashboards');
    
    // Dashboard-Liste
    await expect(customDashboards.locator('.dashboard-list')).toBeVisible();
    
    // Neues Dashboard erstellen
    await customDashboards.locator('button:has-text("Neues Dashboard")').click();
    
    const dashboardBuilder = page.locator('.dashboard-builder');
    await expect(dashboardBuilder).toBeVisible();
    
    // Dashboard-Name
    await dashboardBuilder.locator('input[name="dashboardName"]').fill('Sales Performance Q2');
    
    // Widget-Palette
    await expect(dashboardBuilder.locator('.widget-palette')).toBeVisible();
    
    // Widgets per Drag & Drop hinzufügen (simuliert)
    const chartWidget = dashboardBuilder.locator('.widget-item:has-text("Line Chart")');
    await chartWidget.dragTo(dashboardBuilder.locator('.dashboard-canvas'));
    
    const gaugeWidget = dashboardBuilder.locator('.widget-item:has-text("Gauge")');
    await gaugeWidget.dragTo(dashboardBuilder.locator('.dashboard-canvas'));
    
    const tableWidget = dashboardBuilder.locator('.widget-item:has-text("Data Table")');
    await tableWidget.dragTo(dashboardBuilder.locator('.dashboard-canvas'));
    
    // Widget konfigurieren
    const addedChart = dashboardBuilder.locator('.dashboard-widget:has-text("Line Chart")');
    await addedChart.locator('.widget-settings').click();
    
    const widgetConfig = page.locator('.widget-configuration-modal');
    await expect(widgetConfig).toBeVisible();
    
    // Datenquelle konfigurieren
    await widgetConfig.locator('select[name="dataSource"]').selectOption('api-metrics');
    await widgetConfig.locator('input[name="metric"]').fill('sales.revenue');
    await widgetConfig.locator('select[name="aggregation"]').selectOption('sum');
    await widgetConfig.locator('select[name="timeRange"]').selectOption('last-30-days');
    
    await widgetConfig.locator('button:has-text("Anwenden")').click();
    
    // Dashboard speichern
    await dashboardBuilder.locator('button:has-text("Dashboard speichern")').click();
    await expect(page.locator('.toast-success')).toContainText('Dashboard erfolgreich erstellt');
  });

  test("Advanced Data Visualization", async ({ page }) => {
    // Visualization-Tab
    await page.click('.dashboard-tabs button:has-text("Visualisierungen")');
    
    const vizPanel = page.locator('.advanced-visualizations');
    await expect(vizPanel).toBeVisible();
    
    // 3D-Visualisierungen
    await vizPanel.locator('.viz-type-selector button:has-text("3D")').click();
    const viz3D = vizPanel.locator('.visualization-3d');
    await expect(viz3D).toBeVisible();
    await expect(viz3D.locator('canvas#3d-scatter-plot')).toBeVisible();
    
    // Interaktive Kontrollen
    await viz3D.locator('button:has-text("Rotate")').click();
    await viz3D.locator('input[name="zoomLevel"]').fill('1.5');
    
    // Heatmap mit Clustering
    await vizPanel.locator('.viz-type-selector button:has-text("Heatmap")').click();
    const heatmap = vizPanel.locator('.heatmap-visualization');
    await expect(heatmap).toBeVisible();
    
    await heatmap.locator('button:has-text("Clustering aktivieren")').click();
    await expect(heatmap.locator('.cluster-dendogram')).toBeVisible();
    
    // Sankey-Diagramm für Flow-Analyse
    await vizPanel.locator('.viz-type-selector button:has-text("Sankey")').click();
    const sankey = vizPanel.locator('.sankey-diagram');
    await expect(sankey).toBeVisible();
    await expect(sankey.locator('svg.sankey-chart')).toBeVisible();
  });

  test("Executive Summary und Reports", async ({ page }) => {
    // Reports-Tab
    await page.click('.dashboard-tabs button:has-text("Reports")');
    
    const reportsPanel = page.locator('.executive-reports');
    await expect(reportsPanel).toBeVisible();
    
    // Report-Generator
    await reportsPanel.locator('button:has-text("Neuer Report")').click();
    const reportWizard = page.locator('.report-wizard');
    await expect(reportWizard).toBeVisible();
    
    // Report-Typ wählen
    await reportWizard.locator('input[name="reportType"][value="executive-summary"]').click();
    await reportWizard.locator('button:has-text("Weiter")').click();
    
    // Zeitraum und Metriken
    await reportWizard.locator('input[name="reportPeriod"][value="monthly"]').click();
    await reportWizard.locator('input[name="includeKPIs"]').check();
    await reportWizard.locator('input[name="includeCharts"]').check();
    await reportWizard.locator('input[name="includeRecommendations"]').check();
    await reportWizard.locator('button:has-text("Weiter")').click();
    
    // Empfänger
    await reportWizard.locator('input[name="recipients"]').fill('ceo@company.com, cto@company.com');
    await reportWizard.locator('select[name="format"]').selectOption('pdf');
    
    // Report generieren
    await reportWizard.locator('button:has-text("Report generieren")').click();
    
    // Generation-Progress
    await expect(page.locator('.report-generation-progress')).toBeVisible();
    
    // Report-Vorschau
    await expect(page.locator('.report-preview')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.report-preview iframe')).toBeVisible();
    
    // Report senden
    await page.click('button:has-text("Report senden")');
    await expect(page.locator('.toast-success')).toContainText('Report erfolgreich versendet');
  });

  test("Performance Benchmarking", async ({ page }) => {
    // Benchmarking-Tab
    await page.click('.dashboard-tabs button:has-text("Benchmarking")');
    
    const benchmarkPanel = page.locator('.performance-benchmarking');
    await expect(benchmarkPanel).toBeVisible();
    
    // Benchmark-Kategorien
    await expect(benchmarkPanel.locator('.benchmark-category:has-text("System Performance")')).toBeVisible();
    await expect(benchmarkPanel.locator('.benchmark-category:has-text("User Experience")')).toBeVisible();
    await expect(benchmarkPanel.locator('.benchmark-category:has-text("Business Metrics")')).toBeVisible();
    
    // Benchmark ausführen
    await benchmarkPanel.locator('button:has-text("Vollständiges Benchmarking")').click();
    
    const benchmarkProgress = page.locator('.benchmark-progress');
    await expect(benchmarkProgress).toBeVisible();
    
    // Benchmark-Tests
    const tests = [
      'API Response Time',
      'Database Query Performance',
      'Document Processing Speed',
      'Search Latency',
      'Cache Efficiency'
    ];
    
    for (const test of tests) {
      await expect(benchmarkProgress.locator(`.test-item:has-text("${test}")`)).toBeVisible();
    }
    
    // Benchmark-Ergebnisse
    await expect(page.locator('.benchmark-results')).toBeVisible({ timeout: 45000 });
    const results = page.locator('.benchmark-results');
    
    // Vergleich mit Baseline
    await expect(results.locator('.comparison-chart')).toBeVisible();
    await expect(results.locator('.performance-score')).toBeVisible();
    await expect(results.locator('.improvement-suggestions')).toBeVisible();
    
    // Historischer Trend
    await results.locator('button:has-text("Trend anzeigen")').click();
    await expect(results.locator('.trend-analysis')).toBeVisible();
    await expect(results.locator('canvas#benchmark-trend-chart')).toBeVisible();
  });

  test("Alert Center und Incident Management", async ({ page }) => {
    // Alert-Tab
    await page.click('.dashboard-tabs button:has-text("Alerts")');
    
    const alertCenter = page.locator('.alert-incident-center');
    await expect(alertCenter).toBeVisible();
    
    // Alert-Dashboard
    await expect(alertCenter.locator('.alert-summary')).toBeVisible();
    await expect(alertCenter.locator('.active-incidents')).toBeVisible();
    await expect(alertCenter.locator('.alert-timeline')).toBeVisible();
    
    // Incident erstellen (simuliert durch kritischen Alert)
    const criticalAlert = alertCenter.locator('.alert-item.critical').first();
    if (await criticalAlert.isVisible()) {
      await criticalAlert.locator('button:has-text("Incident erstellen")').click();
      
      const incidentDialog = page.locator('.create-incident-dialog');
      await expect(incidentDialog).toBeVisible();
      
      await incidentDialog.locator('input[name="incidentTitle"]').fill('Database Performance Degradation');
      await incidentDialog.locator('select[name="severity"]').selectOption('high');
      await incidentDialog.locator('select[name="assignee"]').selectOption('ops-team');
      await incidentDialog.locator('textarea[name="description"]').fill('Significant slowdown in query response times detected');
      
      await incidentDialog.locator('button:has-text("Incident erstellen")').click();
      await expect(page.locator('.toast-success')).toContainText('Incident erstellt');
    }
    
    // Incident-Board
    await alertCenter.locator('.tab-button:has-text("Incidents")').click();
    const incidentBoard = alertCenter.locator('.incident-board');
    await expect(incidentBoard).toBeVisible();
    
    // Kanban-Board für Incident-Status
    await expect(incidentBoard.locator('.status-column:has-text("Neu")')).toBeVisible();
    await expect(incidentBoard.locator('.status-column:has-text("In Bearbeitung")')).toBeVisible();
    await expect(incidentBoard.locator('.status-column:has-text("Gelöst")')).toBeVisible();
  });
});