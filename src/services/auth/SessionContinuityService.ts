/**
 * Session Continuity Service
 * 
 * Sorgt für nahtlose Wiederherstellung des Auth-Status und der Route
 * nach einem Seitenrefresh
 */

import { authTokenManager, StoredTokenData } from './AuthTokenManager';
import { Router, RouteLocationNormalized } from 'vue-router';

export interface SessionState {
  isAuthenticated: boolean;
  isRestoring: boolean;
  lastRoute?: string;
  restorationAttempts: number;
}

export interface RestorationResult {
  success: boolean;
  authData?: StoredTokenData;
  error?: Error;
}

export class SessionContinuityService {
  private static instance: SessionContinuityService;
  private state: SessionState = {
    isAuthenticated: false,
    isRestoring: false,
    restorationAttempts: 0
  };
  
  private readonly MAX_RESTORATION_ATTEMPTS = 3;
  private readonly ROUTE_STORAGE_KEY = 'nscale_last_authenticated_route';
  private restorationPromise: Promise<RestorationResult> | null = null;

  private constructor() {
    this.initializeEventListeners();
  }

  public static getInstance(): SessionContinuityService {
    if (!SessionContinuityService.instance) {
      SessionContinuityService.instance = new SessionContinuityService();
    }
    return SessionContinuityService.instance;
  }

  /**
   * Initialisiere Session-Wiederherstellung
   */
  public async initializeSession(): Promise<RestorationResult> {
    console.log('[SessionContinuity] Initialisiere Session-Wiederherstellung');
    
    // Verhindere parallele Wiederherstellungsversuche
    if (this.restorationPromise) {
      console.log('[SessionContinuity] Wiederherstellung läuft bereits');
      return this.restorationPromise;
    }
    
    this.state.isRestoring = true;
    
    this.restorationPromise = this.performRestoration()
      .finally(() => {
        this.state.isRestoring = false;
        this.restorationPromise = null;
      });
    
    return this.restorationPromise;
  }

  /**
   * Speichere aktuelle Route für authentifizierte Benutzer
   */
  public saveCurrentRoute(route: RouteLocationNormalized): void {
    // Nur speichern wenn authentifiziert und nicht auf Spezial-Routen
    if (this.state.isAuthenticated && !this.isSpecialRoute(route.path)) {
      localStorage.setItem(this.ROUTE_STORAGE_KEY, route.fullPath);
      console.log('[SessionContinuity] Route gespeichert:', route.fullPath);
    }
  }

  /**
   * Lade gespeicherte Route
   */
  public getLastAuthenticatedRoute(): string | null {
    const route = localStorage.getItem(this.ROUTE_STORAGE_KEY);
    console.log('[SessionContinuity] Letzte gespeicherte Route:', route);
    return route;
  }

  /**
   * Überprüfe ob Session-Wiederherstellung nötig ist
   */
  public needsSessionRestoration(): boolean {
    // Check if we have stored tokens but app thinks we're not authenticated
    const storedTokens = authTokenManager.loadTokens();
    return !!storedTokens && !this.state.isAuthenticated;
  }

  /**
   * Warte auf Session-Wiederherstellung
   */
  public async waitForSessionReady(): Promise<boolean> {
    if (this.restorationPromise) {
      const result = await this.restorationPromise;
      return result.success;
    }
    
    if (this.state.isAuthenticated) {
      return true;
    }
    
    // Versuche erneute Wiederherstellung
    const result = await this.initializeSession();
    return result.success;
  }

  /**
   * Setze Auth-Status
   */
  public setAuthenticatedState(isAuthenticated: boolean): void {
    this.state.isAuthenticated = isAuthenticated;
    
    if (!isAuthenticated) {
      // Lösche gespeicherte Route bei Logout
      localStorage.removeItem(this.ROUTE_STORAGE_KEY);
    }
  }

  /**
   * Hole aktuellen Session-Status
   */
  public getState(): Readonly<SessionState> {
    return { ...this.state };
  }

  // Private Methoden

  private async performRestoration(): Promise<RestorationResult> {
    try {
      this.state.restorationAttempts++;
      
      console.log('[SessionContinuity] Starte Wiederherstellungsversuch', 
        this.state.restorationAttempts);
      
      // Lade Token aus verschiedenen Quellen
      const tokenData = authTokenManager.loadTokens();
      
      if (!tokenData) {
        console.log('[SessionContinuity] Keine gespeicherten Token gefunden');
        return { success: false };
      }
      
      // Validiere Token
      if (!authTokenManager.validateToken(tokenData.token)) {
        console.warn('[SessionContinuity] Gespeicherter Token ist ungültig');
        return { success: false };
      }
      
      console.log('[SessionContinuity] Gültige Token gefunden, Wiederherstellung erfolgreich');
      
      return {
        success: true,
        authData: tokenData
      };
      
    } catch (error) {
      console.error('[SessionContinuity] Fehler bei der Wiederherstellung:', error);
      
      // Versuche erneut, wenn unter Maximum
      if (this.state.restorationAttempts < this.MAX_RESTORATION_ATTEMPTS) {
        console.log('[SessionContinuity] Versuche erneut...');
        await new Promise(resolve => setTimeout(resolve, 500));
        return this.performRestoration();
      }
      
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unbekannter Fehler')
      };
    }
  }

  private initializeEventListeners(): void {
    // Speichere Auth-Status vor Page Unload
    window.addEventListener('beforeunload', () => {
      if (this.state.isAuthenticated) {
        // Force-Save aktuelle Token-Daten
        console.log('[SessionContinuity] Speichere Session vor Unload');
      }
    });
    
    // Lausche auf Visibility-Changes für bessere Mobile-Unterstützung
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.needsSessionRestoration()) {
        console.log('[SessionContinuity] Tab wieder aktiv, prüfe Session');
        this.initializeSession();
      }
    });
  }

  private isSpecialRoute(path: string): boolean {
    const specialRoutes = ['/login', '/register', '/error', '/404'];
    return specialRoutes.some(route => path.startsWith(route));
  }

  /**
   * Debug-Informationen
   */
  public getDebugInfo(): Record<string, any> {
    return {
      state: this.state,
      hasStoredTokens: !!authTokenManager.loadTokens(),
      lastRoute: this.getLastAuthenticatedRoute(),
      isRestorationActive: !!this.restorationPromise
    };
  }
}

// Export Singleton-Instanz
export const sessionContinuityService = SessionContinuityService.getInstance();