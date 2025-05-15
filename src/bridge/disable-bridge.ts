/**
 * Temporäre Datei um Bridge zu deaktivieren
 */

// Setze globale Flags um Bridge zu deaktivieren
if (typeof window !== 'undefined') {
  (window as any).__DISABLE_BRIDGE__ = true;
  (window as any).__USE_SIMPLE_UI_STORE__ = true;
  
  console.log('Bridge ist temporär deaktiviert. Verwende einfachen UI Store.');
}

export const bridgeDisabled = true;