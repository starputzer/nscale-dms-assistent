# Issue #5: Ungenutzte TypeScript-Typdefinitionen - Analyse

## Status: TEILWEISE ENTFERNBAR

## Definitiv ungenutzte Dateien (können entfernt werden)

### 1. ✅ `src/stores/types/enhancedChatMessage.ts`
- **Status**: NICHT VERWENDET
- **Inhalt**: Legacy-Message-Konvertierungsfunktionen
- **Referenzen**: Keine Imports im Source Code
- **Empfehlung**: ENTFERNEN

### 2. ✅ Potenzielle Duplikate
- `src/types/app.ts` (Duplikat von app.d.ts)
- **Empfehlung**: Prüfen und ggf. konsolidieren

## Declaration Files (.d.ts) - VORSICHT

### ⚠️ Ambient Type Declarations (NICHT ENTFERNEN)
Diese Dateien werden von TypeScript automatisch eingebunden:

1. **src/shims-vue.d.ts** - ESSENTIELL für Vue-Imports
2. **src/types/env.d.ts** - Umgebungsvariablen-Typen
3. **src/types/globals.d.ts** - Globale Typen
4. **src/types/modules.d.ts** - Modul-Deklarationen

### 🔍 Zu prüfende Declaration Files
Folgende könnten redundant sein:
- `src/types/global.d.ts` (vs globals.d.ts)
- `src/types/module-declarations.d.ts` (vs modules.d.ts)
- `src/types/global-extensions.d.ts`

## Ungenutzte TypeScript-Dateien (.ts)

### Möglicherweise entfernbar (weitere Prüfung erforderlich):
```
src/types/api-types.ts
src/types/component-types.ts
src/types/composable-types.ts
src/types/models.ts
src/types/props-validation.ts
src/types/store-types.ts
src/types/components.ts
src/types/adapters.ts
```

## Empfohlenes Vorgehen

### Phase 1: Sichere Entfernung
1. ✅ Entfernen: `src/stores/types/enhancedChatMessage.ts`
2. ✅ TypeScript-Kompilierung testen
3. ✅ Build-Prozess verifizieren

### Phase 2: Declaration Files konsolidieren
1. Duplikate identifizieren (global.d.ts vs globals.d.ts)
2. Inhalte vergleichen und zusammenführen
3. Redundante Dateien entfernen

### Phase 3: Ungenutzte .ts-Dateien
1. Jede Datei einzeln prüfen
2. Build ohne Datei testen
3. Bei Erfolg entfernen

## Test-Strategie

```bash
# Nach jeder Entfernung:
npm run typecheck
npm run build
npm run test
```

## Risikobewertung

### enhancedChatMessage.ts
- **Risiko**: KEINE
- **Impact**: KEINE
- **Abhängigkeiten**: KEINE

### Declaration Files
- **Risiko**: HOCH (können Build brechen)
- **Impact**: TypeScript-Kompilierung
- **Test**: Sorgfältige Prüfung erforderlich

### Andere .ts-Dateien
- **Risiko**: MITTEL
- **Impact**: Möglicherweise zukünftige Features
- **Test**: Einzelprüfung empfohlen

## Metriken

- **Definitiv ungenutzt**: 1 Datei
- **Möglicherweise ungenutzt**: ~15 Dateien
- **Declaration Files**: 14 (Vorsicht!)
- **Geschätztes Cleanup-Potenzial**: 5-10 Dateien

---

**Nächster Schritt**: enhancedChatMessage.ts entfernen und testen