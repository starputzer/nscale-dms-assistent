/**
 * Self-Healing Service für automatische Fehlerkorrektur
 *
 * Dieser Service erkennt und behebt automatisch UI-Rendering-Probleme,
 * speziell das Problem mit dem "Schwerwiegender Fehler"-Bildschirm.
 */

import { ref } from "vue";
import { useRouter } from "vue-router";
import { useLogger } from "@/composables/useLogger";
import {
  domErrorDetector,
  type DomErrorDiagnostics,
} from "@/utils/domErrorDiagnostics";
import { useFeatureTogglesStore } from "@/stores/featureToggles";

export interface HealingStrategy {
  name: string;
  condition: (diagnostics: DomErrorDiagnostics) => boolean;
  execute: () => Promise<boolean>;
  priority: number;
}

export interface HealingResult {
  success: boolean;
  strategy: string;
  timestamp: number;
  diagnosticsBefore: DomErrorDiagnostics;
  diagnosticsAfter?: DomErrorDiagnostics;
  error?: Error;
}

export class SelfHealingService {
  private logger = useLogger();
  private router = useRouter();
  private isHealing = ref(false);
  private healingHistory = ref<HealingResult[]>([]);
  private strategies: HealingStrategy[] = [];
  private monitoringInterval: number | null = null;
  private failureCount = 0;
  private readonly maxFailures = 5;

  constructor() {
    this.initializeStrategies();
  }

  /**
   * Initialisiert die Heilungsstrategien
   */
  private initializeStrategies() {
    this.strategies = [
      // Strategie 1: DOM-Bereinigung für Fehlerbildschirm
      {
        name: "DOM_CLEANUP",
        priority: 1,
        condition: (diagnostics) =>
          diagnostics.hasErrorScreen && diagnostics.has404Page,
        execute: async () => {
          try {
            // Finde und entferne den Fehlerbildschirm
            const errorElements = document.querySelectorAll(
              '.critical-error, .error-view, .schwerwiegender-fehler, [data-error="critical"]',
            );

            errorElements.forEach((element: any) => {
              this.logger.info(
                "Entferne Fehlerbildschirm-Element:",
                element.className,
              );
              element.remove();
            });

            // Stelle sicher, dass die Vue-App sichtbar ist
            const vueApp = document.querySelector("#app");
            if (vueApp) {
              (vueApp as HTMLElement).style.display = "block";
              (vueApp as HTMLElement).style.visibility = "visible";
              (vueApp as HTMLElement).style.zIndex = "1";
            }

            return errorElements.length > 0;
          } catch (error) {
            this.logger.error("DOM-Bereinigung fehlgeschlagen:", error);
            return false;
          }
        },
      },

      // Strategie 2: Route-Neuladung
      {
        name: "ROUTE_RELOAD",
        priority: 2,
        condition: (diagnostics) => diagnostics.errorType === "notFound",
        execute: async () => {
          try {
            const currentRoute = this.router.currentRoute.value;

            // Versuche die Route neu zu laden
            await this.router.replace({
              path: currentRoute.path,
              force: true,
            } as any);

            return true;
          } catch (error) {
            this.logger.error("Route-Neuladung fehlgeschlagen:", error);
            return false;
          }
        },
      },

      // Strategie 3: Fallback zur Startseite
      {
        name: "HOME_FALLBACK",
        priority: 3,
        condition: (diagnostics) => diagnostics.has404Page,
        execute: async () => {
          try {
            await this.router.push("/");
            return true;
          } catch (error) {
            this.logger.error("Home-Fallback fehlgeschlagen:", error);
            return false;
          }
        },
      },

      // Strategie 4: Cache-Bereinigung und Neustart
      {
        name: "CACHE_CLEAR_RESTART",
        priority: 4,
        condition: () => true, // Immer als letzte Option
        execute: async () => {
          try {
            // Service Worker deregistrieren
            if ("serviceWorker" in navigator) {
              const registrations =
                await navigator.serviceWorker.getRegistrations();
              await Promise.all(
                registrations.map((reg: any) => reg.unregister()),
              );
            }

            // Cache leeren
            if ("caches" in window) {
              const cacheNames = await caches.keys();
              await Promise.all(
                cacheNames.map((name: any) => caches.delete(name)),
              );
            }

            // Lokalen Speicher teilweise leeren (wichtige Daten behalten)
            const keysToKeep = [
              "token",
              "userId",
              "userRole",
              "lastWorkingRoute",
            ];
            const savedData: Record<string, string> = {};

            keysToKeep.forEach((key: any) => {
              const value = localStorage.getItem(key);
              if (value) savedData[key] = value;
            });

            localStorage.clear();

            Object.entries(savedData).forEach(([key, value]: any) => {
              localStorage.setItem(key, value);
            });

            // Seite neu laden
            setTimeout(() => {
              window.location.href = "/";
            }, 500);

            return true;
          } catch (error) {
            this.logger.error("Cache-Bereinigung fehlgeschlagen:", error);
            return false;
          }
        },
      },

      // Strategie 5: Feature-Toggle-Fallback
      {
        name: "FEATURE_TOGGLE_FALLBACK",
        priority: 5,
        condition: (diagnostics) =>
          diagnostics.errorType === "render" ||
          diagnostics.errorType === "critical",
        execute: async () => {
          try {
            const featureToggles = useFeatureTogglesStore();

            // Aktiviere Fallback-Modus für problematische Features
            const problematicFeatures = [
              "useSfcChat",
              "useSfcDocConverter",
              "useSfcAdmin",
            ];

            problematicFeatures.forEach((feature: any) => {
              if (featureToggles.isEnabled(feature)) {
                featureToggles.setFallbackMode(feature, true);
                this.logger.info(`Fallback aktiviert für Feature: ${feature}`);
              }
            });

            // Route neu laden
            await this.router.go(0);
            return true;
          } catch (error) {
            this.logger.error("Feature-Toggle-Fallback fehlgeschlagen:", error);
            return false;
          }
        },
      },
    ];

    // Sortiere Strategien nach Priorität
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Startet die Selbstheilungs-Überwachung
   */
  public startMonitoring(interval: number = 5000) {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.logger.info("Starte Selbstheilungs-Überwachung");

    this.monitoringInterval = window.setInterval(() => {
      this.checkAndHeal();
    }, interval);

    // Initiale Prüfung
    this.checkAndHeal();
  }

  /**
   * Stoppt die Überwachung
   */
  public stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.info("Selbstheilungs-Überwachung gestoppt");
    }
  }

  /**
   * Führt die Prüfung und Heilung durch
   */
  private async checkAndHeal() {
    if (this.isHealing.value) return;

    const diagnostics = domErrorDetector.detectErrorState();

    // Kein Fehler gefunden
    if (!diagnostics.hasErrorScreen) {
      this.failureCount = 0;
      return;
    }

    // Prüfe auf maximale Fehleranzahl
    if (this.failureCount >= this.maxFailures) {
      this.logger.error("Maximale Selbstheilungsversuche erreicht");
      this.stopMonitoring();
      return;
    }

    this.isHealing.value = true;
    this.failureCount++;

    const result = await this.attemptHealing(diagnostics);

    this.healingHistory.value.push(result);

    // Behalte nur die letzten 10 Ergebnisse
    if (this.healingHistory.value.length > 10) {
      this.healingHistory.value.shift();
    }

    this.isHealing.value = false;

    if (result.success) {
      this.failureCount = 0;
      this.logger.info("Selbstheilung erfolgreich:", result);
    } else {
      this.logger.warn("Selbstheilung fehlgeschlagen:", result);
    }
  }

  /**
   * Versucht die Heilung mit verschiedenen Strategien
   */
  private async attemptHealing(
    diagnostics: DomErrorDiagnostics,
  ): Promise<HealingResult> {
    this.logger.info("Starte Selbstheilungsversuch", diagnostics);

    for (const strategy of this.strategies) {
      if (strategy.condition(diagnostics)) {
        this.logger.info(`Versuche Strategie: ${strategy.name}`);

        try {
          const success = await strategy.execute();

          if (success) {
            // Prüfe Zustand nach Heilung
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const diagnosticsAfter = domErrorDetector.detectErrorState();

            return {
              success: !diagnosticsAfter.hasErrorScreen,
              strategy: strategy.name,
              timestamp: Date.now(),
              diagnosticsBefore: diagnostics,
              diagnosticsAfter,
            };
          }
        } catch (error) {
          this.logger.error(
            `Strategie ${strategy.name} fehlgeschlagen:`,
            error,
          );

          return {
            success: false,
            strategy: strategy.name,
            timestamp: Date.now(),
            diagnosticsBefore: diagnostics,
            error: error as Error,
          };
        }
      }
    }

    // Keine passende Strategie gefunden
    return {
      success: false,
      strategy: "NONE",
      timestamp: Date.now(),
      diagnosticsBefore: diagnostics,
      error: new Error("Keine passende Heilungsstrategie gefunden"),
    };
  }

  /**
   * Manueller Heilungsversuch
   */
  public async heal(): Promise<HealingResult> {
    const diagnostics = domErrorDetector.detectErrorState();
    return this.attemptHealing(diagnostics);
  }

  /**
   * Gibt die Heilungshistorie zurück
   */
  public getHistory(): HealingResult[] {
    return this.healingHistory.value;
  }

  /**
   * Setzt den Service zurück
   */
  public reset() {
    this.stopMonitoring();
    this.isHealing.value = false;
    this.healingHistory.value = [];
    this.failureCount = 0;
  }

  /**
   * Fügt eine benutzerdefinierte Strategie hinzu
   */
  public addStrategy(strategy: HealingStrategy) {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => a.priority - b.priority);
  }
}

// Singleton-Instanz
export const selfHealingService = new SelfHealingService();
