/**
 * errorReportingDummy.ts
 * 
 * Dies ist eine Ersatzimplementierung für Situationen, in denen der normale
 * errorReportingService nicht verfügbar ist oder Fehler wirft.
 */

// Einfache minimale Implementation für das Error-Reporting
export const dummyErrorReporting = {
  captureError: (error: Error | string) => {
    console.error('[Error Reporting Dummy]', error);
    return 'dummy-error-id-' + Date.now();
  },
  
  captureApiError: (endpoint: string, error: Error | string) => {
    console.error(`[Error Reporting Dummy] API Error (${endpoint}):`, error);
    return 'dummy-api-error-id-' + Date.now();
  },
  
  captureComponentError: (component: string, error: Error | string) => {
    console.error(`[Error Reporting Dummy] Component Error (${component}):`, error);
    return 'dummy-component-error-id-' + Date.now();
  },
  
  captureStoreError: (store: string, error: Error | string) => {
    console.error(`[Error Reporting Dummy] Store Error (${store}):`, error);
    return 'dummy-store-error-id-' + Date.now();
  },
  
  getErrorById: () => undefined,
  getErrors: () => [],
  dismissError: () => true,
  clearAllErrors: () => {},
};

// Factory-Funktion, die immer die Dummy-Implementation zurückgibt
export function getDummyErrorReporting() {
  return dummyErrorReporting;
}

export default dummyErrorReporting;