---
title: "Beitragen zum nscale DMS Assistenten"
version: "1.0.0"
date: "12.05.2025"
lastUpdate: "13.05.2025"
author: "Martin Heinrich"
status: "Aktiv" 
priority: "Mittel"
category: "Entwicklung"
tags: ["Contribution", "Guidelines", "Entwicklung", "Pull Request", "Code Review"]
---

# Beitragen zum nscale DMS Assistenten

> **Letzte Aktualisierung:** 13.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## Inhaltsübersicht

- [1. Einführung](#1-einführung)
- [2. Entwicklungsumgebung](#2-entwicklungsumgebung)
- [3. Entwicklungsprozess](#3-entwicklungsprozess)
- [4. Code-Standards](#4-code-standards)
- [5. Pull Requests](#5-pull-requests)
- [6. Code Reviews](#6-code-reviews)
- [7. Tests](#7-tests)
- [8. Dokumentation](#8-dokumentation)
- [9. Sicherheitsrichtlinien](#9-sicherheitsrichtlinien)
- [10. Referenzen](#10-referenzen)

## 1. Einführung

Diese Anleitung beschreibt den Prozess und die Standards für das Beitragen zum nscale DMS Assistenten. Das Projekt begrüßt Beiträge von verschiedenen Entwicklern und dieser Leitfaden soll sicherstellen, dass alle Beiträge konsistent sind und den Projektstandards entsprechen.

### 1.1 Arten von Beiträgen

Das Projekt begrüßt verschiedene Arten von Beiträgen:

- **Feature-Entwicklung**: Implementierung neuer Funktionen
- **Bugfixes**: Behebung von Fehlern im bestehenden Code
- **Performance-Optimierungen**: Verbesserung der Anwendungsleistung
- **Dokumentation**: Verbesserung oder Ergänzung der Dokumentation
- **Tests**: Hinzufügen oder Verbessern von Tests
- **Refactoring**: Verbesserung der Codequalität ohne Änderung des Verhaltens

### 1.2 Code of Conduct

Alle Mitwirkenden verpflichten sich, einen respektvollen und inklusiven Umgang miteinander zu pflegen. Dazu gehören:

- Respektvolle Kommunikation in Issues, Pull Requests und Diskussionen
- Konstruktives Feedback und Kritik
- Offenheit für verschiedene Perspektiven und Ideen
- Fokus auf technische Sachverhalte statt auf Personen

## 2. Entwicklungsumgebung

### 2.1 Anforderungen

Für die Entwicklung am nscale DMS Assistenten benötigen Sie:

- **Node.js**: Version 18 oder höher
- **npm**: Version 8 oder höher
- **Git**: Version 2.30 oder höher
- **Visual Studio Code**: Empfohlener Editor mit den im Projekt konfigurierten Extensions
- **Python**: Version 3.10 oder höher (für Backend-Entwicklung)

### 2.2 Repository klonen

```bash
# Repository klonen
git clone https://github.com/yourorg/nscale-assist.git
cd nscale-assist

# Abhängigkeiten installieren
npm install
```

### 2.3 Empfohlene VS Code Extensions

Das Projekt enthält eine `.vscode/extensions.json` Datei, die empfohlene Extensions definiert. Die wichtigsten sind:

- **Volar**: Vue Language Features (Volar)
- **ESLint**: ESLint Integration
- **Prettier**: Code-Formatierung
- **TypeScript Vue Plugin**: TypeScript Support für Vue-Dateien
- **i18n Ally**: Unterstützung für Internationalisierung

Sie können alle empfohlenen Extensions direkt in VS Code installieren:

1. Öffnen Sie die Extensions-Ansicht (Ctrl+Shift+X / Cmd+Shift+X)
2. Filtern Sie nach "@recommended"
3. Installieren Sie alle angezeigten Extensions

### 2.4 Entwicklungsserver starten

```bash
# Standard-Entwicklungsserver mit Hot Module Replacement
npm run dev

# Entwicklungsserver mit strikter TypeScript-Prüfung
npm run dev:strict

# Entwicklungsserver mit Pure Vue-Modus (ohne Legacy-Code)
npm run dev:pure
```

## 3. Entwicklungsprozess

### 3.1 Branching-Strategie

Das Projekt folgt einem Feature-Branch-Workflow:

1. **main**: Hauptzweig, enthält stabilen, produktionsbereiten Code
2. **feature/\***: Feature-Branches für neue Funktionen
3. **bugfix/\***: Branches für Fehlerbehebungen
4. **hotfix/\***: Dringende Fixes für Produktionsprobleme
5. **release/\***: Release-Kandidaten für Versions-Releases

```bash
# Beispiel für einen neuen Feature-Branch
git checkout main
git pull
git checkout -b feature/new-document-viewer

# Beispiel für einen Bugfix-Branch
git checkout main
git pull
git checkout -b bugfix/chat-display-issue
```

### 3.2 Commit-Richtlinien

Commit-Nachrichten sollten folgendem Format folgen:

```
type(scope): kurze Beschreibung

Längere Beschreibung, falls nötig.

Referenzen auf Issues, falls vorhanden.
```

**Typen**:
- **feat**: Neue Funktionen
- **fix**: Fehlerbehebungen
- **docs**: Nur Dokumentationsänderungen
- **style**: Änderungen, die keinen Code betreffen (Formatierung, fehlende Semikolons, etc.)
- **refactor**: Code-Änderungen, die weder Fehler beheben noch Funktionen hinzufügen
- **perf**: Verbesserungen der Performance
- **test**: Hinzufügen oder Korrigieren von Tests
- **chore**: Änderungen am Build-Prozess oder an Hilfswerkzeugen

**Beispiele**:

```
feat(document-converter): neuen PDF-Parser hinzugefügt

fix(chat): Textüberlauf bei langen Nachrichten behoben

docs(api): Dokumentation der Session-API aktualisiert

refactor(store): Sessions-Store für bessere Typsicherheit überarbeitet

test(components): Tests für MessageList-Komponente hinzugefügt
```

### 3.3 Issue-Tracking

Für jede signifikante Änderung sollte ein Issue erstellt werden:

1. Beschreiben Sie das Problem oder Feature klar und präzise
2. Fügen Sie relevante Labels hinzu (z.B. bug, enhancement, documentation)
3. Weisen Sie das Issue einem Milestone zu, falls zutreffend
4. Verlinken Sie verwandte Issues oder Pull Requests

Bei der Arbeit an einem Issue:

1. Weisen Sie sich das Issue zu
2. Erstellen Sie einen Branch, der auf das Issue verweist
3. Beziehen Sie sich in Commits und Pull Requests auf das Issue

## 4. Code-Standards

### 4.1 TypeScript-Richtlinien

Das Projekt verwendet TypeScript mit strikten Typprüfungen:

- **Explizite Typen** für Funktionsparameter und -rückgabewerte
- **Keine impliziten any-Typen**
- **Strikte Nullchecks** für Werte, die null oder undefined sein könnten
- **Vermeidung von Type Assertions (as)** wo möglich
- **Vermeidung von non-null assertions (!)** - stattdessen Nullchecks verwenden

```typescript
// EMPFOHLEN:
function getUserName(user: User | null): string {
  if (!user) {
    return 'Gast';
  }
  return user.name;
}

// VERMEIDEN:
function getUserName(user): string {
  return user!.name; // Non-null assertion vermeiden
}
```

### 4.2 Vue-Komponenten

Vue-Komponenten sollten folgende Richtlinien einhalten:

- **Single File Components (SFC)** mit `.vue`-Erweiterung verwenden
- **Composition API** mit `<script setup>` für neue Komponenten
- **TypeScript** für alle Skript-Bereiche
- **Props-Validierung** mit vollständigen Typdefinitionen
- **Emits-Deklaration** für alle ausgehenden Events
- **Konsistente Komponenten-Namen** in PascalCase

```vue
<!-- Beispiel für eine konforme Vue-Komponente -->
<template>
  <div class="document-viewer">
    <document-header :title="document.title" />
    <document-content :content="document.content" />
    <document-footer 
      :modified-at="document.modifiedAt"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import DocumentHeader from './DocumentHeader.vue';
import DocumentContent from './DocumentContent.vue';
import DocumentFooter from './DocumentFooter.vue';
import type { Document } from '@/types/documents';

const props = defineProps<{
  document: Document;
  readOnly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'save', document: Document): void;
  (e: 'close'): void;
}>();

const isModified = ref(false);

const canSave = computed(() => {
  return isModified.value && !props.readOnly;
});

function handleSave() {
  if (canSave.value) {
    emit('save', props.document);
    isModified.value = false;
  }
}
</script>

<style scoped>
.document-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
```

### 4.3 CSS- und Styling-Richtlinien

Für CSS und Styling gelten folgende Richtlinien:

- **Scoped Styles** in Komponenten verwenden
- **CSS-Variablen** für Farben, Schriftarten und andere wiederkehrende Werte
- **BEM-Methodik** für CSS-Klassennamen
- **Flexbox oder Grid** für Layouts anstelle von float oder veralteten Techniken
- **Medienabfragen** für responsive Designs

```vue
<template>
  <div class="chat-message">
    <div class="chat-message__header">
      <span class="chat-message__author">{{ message.author }}</span>
      <time class="chat-message__timestamp">{{ formattedTime }}</time>
    </div>
    <div class="chat-message__content">
      {{ message.content }}
    </div>
  </div>
</template>

<style scoped>
.chat-message {
  padding: var(--spacing-medium);
  border-radius: var(--border-radius-small);
  background-color: var(--color-background-light);
  margin-bottom: var(--spacing-small);
}

.chat-message__header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-small);
}

.chat-message__author {
  font-weight: bold;
  color: var(--color-text-primary);
}

.chat-message__timestamp {
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
}

.chat-message__content {
  color: var(--color-text-primary);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .chat-message {
    padding: var(--spacing-small);
  }
}
</style>
```

### 4.4 API und Services

Für API-Interaktionen und Services gelten folgende Richtlinien:

- **Zentrale API-Services** für alle Backend-Kommunikation
- **Typisierte Anfragen und Antworten**
- **Fehlerbehandlung** mit konsistenten Error-Objekten
- **Caching** für häufig abgefragte Daten
- **Retry-Logik** für instabile Verbindungen
- **Abbruch**-Unterstützung für lange Anfragen

```typescript
// api/documentService.ts
import { api } from './apiClient';
import type { Document, DocumentMetadata } from '@/types/documents';
import type { Result, ApiError } from '@/types/api';

export async function getDocuments(): Promise<Result<DocumentMetadata[], ApiError>> {
  try {
    const response = await api.get<DocumentMetadata[]>('/documents');
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: mapApiError(error)
    };
  }
}

export async function getDocumentById(id: string): Promise<Result<Document, ApiError>> {
  try {
    const response = await api.get<Document>(`/documents/${id}`);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: mapApiError(error)
    };
  }
}

// Weitere Methoden...
```

## 5. Pull Requests

### 5.1 PR-Erstellung

Pull Requests sollten folgende Richtlinien einhalten:

1. **Fokussiert und zweckgebunden**: Ein PR sollte sich auf ein einzelnes Feature oder einen einzelnen Bugfix konzentrieren
2. **Angemessene Größe**: PRs sollten nicht zu groß sein (Richtwert: max. 500 geänderte Zeilen)
3. **Selbstbeschreibend**: Der PR-Titel und die Beschreibung sollten klar erklären, was geändert wurde
4. **Verknüpft mit Issues**: PRs sollten mit relevanten Issues verknüpft sein

```markdown
## Beschreibung
Implementiert die Dokumenten-Vorschau-Funktion für PDF-, DOCX- und XLSX-Dateien.

## Änderungen
- Neue `DocumentPreview`-Komponente mit typsicherer Schnittstelle
- Format-spezifische Renderer für verschiedene Dokumenttypen
- Caching-Mechanismus für bereits gerenderte Vorschauen
- Responsive Ansicht für verschiedene Bildschirmgrößen

## Verknüpfte Issues
Fixes #123

## Typ der Änderung
- [x] Neue Funktion
- [ ] Bugfix
- [ ] Performance-Verbesserung
- [ ] Refactoring (keine funktionalen Änderungen)
- [ ] Dokumentation
- [ ] Andere: ______

## Wie wurde getestet?
- Unit-Tests für Renderer-Komponenten
- Manuelle Tests mit verschiedenen Dokumenttypen
- Kompatibilitätstests in Chrome, Firefox und Safari

## Screenshots (falls zutreffend)
[Screenshot hier]
```

### 5.2 PR-Checkliste

Vor dem Einreichen eines Pull Requests sollten Sie sicherstellen, dass:

- [ ] Der Code den Projektstandards entspricht
- [ ] Die TypeScript-Prüfung ohne Fehler durchläuft
- [ ] ESLint keine Fehler oder Warnungen meldet
- [ ] Alle Tests erfolgreich durchlaufen
- [ ] Die Dokumentation aktualisiert wurde (falls erforderlich)
- [ ] Der Code für neue Funktionen vollständig getestet wurde
- [ ] Der Branch auf dem neuesten Stand von `main` ist

## 6. Code Reviews

### 6.1 Reviewer-Richtlinien

Als Reviewer sollten Sie:

1. **Zeitnah antworten**: Reviews innerhalb von 1-2 Arbeitstagen durchführen
2. **Konstruktives Feedback** geben: Probleme identifizieren und Lösungsvorschläge machen
3. **Auf Standards achten**: Sicherstellen, dass der Code den Projektstandards entspricht
4. **Vollständig prüfen**: Code, Tests und Dokumentation überprüfen
5. **Die Aufgabenstellung verstehen**: Das zugrunde liegende Issue oder Feature kennen

### 6.2 Feedback-Richtlinien

Feedback sollte:

- **Spezifisch** sein: Genau angeben, was geändert werden soll
- **Begründet** sein: Erklären, warum eine Änderung empfohlen wird
- **Höflich** formuliert sein: Sich auf den Code, nicht auf die Person konzentrieren
- **Priorisiert** sein: Wichtige Probleme von stilistischen Vorschlägen trennen

**Beispiele für gutes Feedback:**

```
Die Fehlerbehandlung in `handleSubmit()` könnte robuster sein. 
Wenn der Server mit einem 500er-Fehler antwortet, wird keine 
benutzerfreundliche Meldung angezeigt. Bitte einen try-catch-Block 
hinzufügen und den Fehler an den ErrorHandler delegieren.

Außerdem solltest du in Betracht ziehen, type-narrowing zu verwenden,
anstatt Typ-Assertions:

```typescript
// Statt:
const data = event.target as FormData;

// Besser:
if (event.target instanceof FormData) {
  const data = event.target;
}
```

### 6.3 PR-Genehmigung

Ein PR kann genehmigt werden, wenn:

1. Alle erforderlichen Reviews abgeschlossen sind
2. Alle Kommentare und Feedback-Punkte behandelt wurden
3. Alle automatisierten Checks (Tests, Linting, TypeScript) erfolgreich sind
4. Die Änderungen den Anforderungen des ursprünglichen Issues entsprechen

## 7. Tests

### 7.1 Teststrategie

Das Projekt fordert angemessene Tests für alle Änderungen:

- **Unit-Tests** für isolierte Funktionalität
- **Komponententests** für Vue-Komponenten
- **Integrationstests** für Interaktionen zwischen Komponenten
- **E2E-Tests** für kritische Benutzerflüsse

### 7.2 Testkonventionen

Tests sollten folgende Konventionen einhalten:

- **Aussagekräftige Namen**: Tests sollten beschreiben, was sie testen
- **Einheitliche Struktur**: Arrange-Act-Assert oder Given-When-Then
- **Isolation**: Tests sollten unabhängig voneinander sein
- **Determinismus**: Tests sollten jedes Mal das gleiche Ergebnis liefern
- **Schnelligkeit**: Tests sollten schnell ausgeführt werden

```typescript
// Example unit test for a utility function
import { formatDate } from '@/utils/dateUtils';

describe('formatDate', () => {
  it('formats a date in the default format', () => {
    // Arrange
    const date = new Date('2025-05-10T14:30:00Z');
    
    // Act
    const result = formatDate(date);
    
    // Assert
    expect(result).toBe('10.05.2025 14:30');
  });
  
  it('formats a date with a custom format', () => {
    // Arrange
    const date = new Date('2025-05-10T14:30:00Z');
    const format = 'YYYY/MM/DD';
    
    // Act
    const result = formatDate(date, format);
    
    // Assert
    expect(result).toBe('2025/05/10');
  });
  
  it('returns "Invalid Date" for invalid input', () => {
    // Arrange
    const invalidDate = new Date('invalid');
    
    // Act
    const result = formatDate(invalidDate);
    
    // Assert
    expect(result).toBe('Invalid Date');
  });
});
```

### 7.3 Ausführen von Tests

```bash
# Alle Unit-Tests ausführen
npm run test:unit

# Tests im Watch-Modus ausführen
npm run test:unit:watch

# Bestimmte Tests ausführen
npm run test:unit -- -t "formatDate"

# E2E-Tests ausführen
npm run test:e2e

# E2E-Tests mit UI ausführen
npm run test:e2e:ui
```

## 8. Dokumentation

### 8.1 Code-Dokumentation

Code sollte angemessen dokumentiert werden:

- **Funktionen und Methoden**: Beschreibung, Parameter, Rückgabewerte
- **Klassen und Interfaces**: Zweck und Verwendung
- **Komplexe Logik**: Erklärung für nicht-triviale Implementierungen
- **Bekannte Einschränkungen**: Dokumentation bekannter Probleme oder Randfälle

```typescript
/**
 * Formatiert einen Datumswert gemäß dem angegebenen Format.
 * 
 * @param date - Das zu formatierende Datum
 * @param format - Das gewünschte Ausgabeformat (Standard: 'DD.MM.YYYY HH:mm')
 * @returns Formatierter Datums-String oder 'Invalid Date' bei ungültiger Eingabe
 * 
 * @example
 * // Gibt "10.05.2025 14:30" zurück
 * formatDate(new Date('2025-05-10T14:30:00Z'))
 * 
 * @example
 * // Gibt "2025/05/10" zurück
 * formatDate(new Date('2025-05-10T14:30:00Z'), 'YYYY/MM/DD')
 */
export function formatDate(
  date: Date,
  format: string = 'DD.MM.YYYY HH:mm'
): string {
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  // Implementierung...
}
```

### 8.2 Readme und Dokumentationsdateien

Für größere Features oder Komponenten sollten entsprechende Readme-Dateien erstellt oder aktualisiert werden:

- **Komponentendokumentation**: Beschreibung, Props, Events, Beispiele
- **Feature-Dokumentation**: Architektur, Datenfluss, Implementierungsdetails
- **API-Dokumentation**: Endpunkte, Parameter, Antwortformate

### 8.3 Änderungsdokumentation

Bei signifikanten Änderungen sollte die Änderungsdokumentation aktualisiert werden:

- **CHANGELOG.md**: Eintrag für neue Features oder Bugfixes
- **Migrationsleitfäden**: Bei Breaking Changes oder Änderungen, die Migration erfordern
- **Release Notes**: Zusammenfassung der Änderungen für Releases

## 9. Sicherheitsrichtlinien

### 9.1 Allgemeine Sicherheitsrichtlinien

- **Keine Geheimnisse im Code**: Keine API-Schlüssel, Passwörter oder andere sensible Informationen im Code
- **Eingabevalidierung**: Alle Benutzereingaben validieren
- **XSS-Prävention**: Benutzergenerierte Inhalte immer escaped anzeigen
- **CSRF-Schutz**: CSRF-Token für alle zustandsändernden Anfragen
- **Content Security Policy**: Strikte CSP-Richtlinien einhalten

### 9.2 Melden von Sicherheitsproblemen

Sicherheitsprobleme sollten **nicht** als öffentliche Issues gemeldet werden. Stattdessen:

1. Senden Sie eine E-Mail an security@example.com
2. Beschreiben Sie das Problem detailliert
3. Wenn möglich, fügen Sie Reproduktionsschritte oder POC-Code bei
4. Geben Sie Ihre Kontaktinformationen für Rückfragen an

### 9.3 Sicherheitsrelevante Pull Requests

Bei sicherheitsrelevanten PRs:

1. Markieren Sie den PR mit dem `security`-Label
2. Weisen Sie ihn an das Sicherheitsteam zu
3. Stellen Sie sicher, dass alle sicherheitsrelevanten Änderungen angemessen getestet wurden
4. Dokumentieren Sie die Sicherheitsauswirkungen in der PR-Beschreibung

## 10. Referenzen

### 10.1 Interne Referenzen

- [Code-Standards](./02_typescript_guide.md): Detaillierte Coding-Richtlinien
- [Entwicklungsumgebung](./40_codebase_overview.md): Setup und Konfiguration
- [Teststrategie](./03_test_strategie.md): Umfassende Testrichtlinien
- [TypeScript-Typsystem](./02_typescript_guide.md): TypeScript-spezifische Richtlinien

### 10.2 Externe Referenzen

- [Vue Style Guide](https://vuejs.org/style-guide/): Offizielle Vue.js Stilrichtlinien
- [TypeScript Guidelines](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html): TypeScript Best Practices
- [Conventional Commits](https://www.conventionalcommits.org/): Spezifikation für Commit-Nachrichten

### 10.3 Ursprüngliche Dokumente

Dieses Dokument wurde aus folgenden Quellen konsolidiert:

1. `/opt/nscale-assist/app/CONTRIBUTING.md`: Grundlegende Beitragsrichtlinien
2. `/opt/nscale-assist/app/SECURITY.md`: Sicherheitsrichtlinien und -prozesse

---

*Zuletzt aktualisiert: 13.05.2025*