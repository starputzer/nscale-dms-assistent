# Strikte TypeScript-Konfiguration

Dieses Dokument beschreibt die optimierte TypeScript-Konfiguration mit strikteren Typchecks und erläutert, wie mit häufigen Problemen umgegangen werden kann.

## Überblick

Die optimierte `tsconfig.optimized.json` Konfiguration aktiviert zusätzliche strikte TypeScript-Prüfungen, die die Codequalität verbessern und potenzielle Fehler frühzeitig erkennen helfen. Diese Konfiguration ergänzt die bestehenden TypeScript-Verbesserungen im Projekt und hilft, die Typsicherheit weiter zu erhöhen.

## Neue strikte Typprüfungen

Die optimierte Konfiguration aktiviert folgende zusätzliche Prüfungen:

### Grundlegende strikte Prüfungen

| Option | Beschreibung | Vorteile |
|--------|--------------|----------|
| `strictFunctionTypes` | Aktiviert kontravariente Parametertypen für Funktionen | Verhindert unsichere Funktionsaufrufe mit inkompatiblen Parametertypen |
| `strictBindCallApply` | Typprüfung für `bind`, `call` und `apply` | Verhindert Fehler beim Aufrufen von Funktionen mit falschen Argumenten |
| `strictPropertyInitialization` | Stellt sicher, dass Eigenschaften in Klassen initialisiert werden | Verhindert undefinierte Eigenschaften in Klassen |
| `noImplicitThis` | Fehler bei unklarem `this`-Kontext | Verhindert Verwirrung und Fehler durch unklaren `this`-Kontext |
| `useUnknownInCatchVariables` | Catch-Variablen als `unknown` statt `any` typisieren | Erhöht die Sicherheit bei der Fehlerbehandlung |
| `alwaysStrict` | JavaScript-Dateien im strikten Modus emittieren | Verhindert viele JavaScript-Fallstricke |

### Zusätzliche Prüfungen

| Option | Beschreibung | Vorteile |
|--------|--------------|----------|
| `noImplicitReturns` | Fehler, wenn Funktion nicht in allen Pfaden zurückgibt | Verhindert unbeabsichtigte `undefined`-Rückgabewerte |
| `noUncheckedIndexedAccess` | Fügt `undefined` zu Index-Zugriffen hinzu | Macht Array- und Objektzugriffe sicherer |
| `noImplicitOverride` | Erfordert das `override`-Schlüsselwort bei Methodenüberschreibungen | Verhindert versehentliche Änderungen an geerbten Methoden |
| `noPropertyAccessFromIndexSignature` | Verbietet Dot-Notation für dynamische Properties | Verdeutlicht, wenn auf dynamische Eigenschaften zugegriffen wird |
| `exactOptionalPropertyTypes` | Unterscheidet zwischen `undefined` und weggelassen | Präzisere Typprüfung für optionale Eigenschaften |
| `allowUnreachableCode` | Fehler bei unerreichbarem Code | Hilft, toten Code zu identifizieren und zu entfernen |
| `allowUnusedLabels` | Fehler bei ungenutzten Labels | Hilft, ungenutzte Labels zu identifizieren und zu entfernen |
| `forceConsistentCasingInFileNames` | Erfordert konsistente Dateinamen-Schreibweise | Verhindert Probleme auf Betriebssystemen, die bei Dateinamen Groß-/Kleinschreibung beachten |

## Migration zur strikteren Konfiguration

### Schrittweise Umstellung

Die Umstellung auf die strikte Konfiguration sollte schrittweise erfolgen, um die Entwicklung nicht zu behindern:

1. **TypeScript-Bericht erstellen**: Mit dem Befehl `npm run typecheck:strict` einen Bericht über aktuelle Verstöße gegen die strengere Konfiguration erstellen
2. **Häufige Probleme priorisieren**: Die häufigsten Probleme identifizieren und zuerst beheben
3. **Inkrementelle Adoption**: Einzelne Dateien oder Module unter die strikte Konfiguration stellen
4. **Vollständige Migration**: Nach Behebung aller kritischen Probleme die strikte Konfiguration als Standard festlegen

### Inkrementelle Adoption mit Kommentaren

In Dateien, die noch nicht vollständig unter strenger Typprüfung stehen, können temporäre Ausnahmen mit TypeScript-Direktiven gemacht werden:

```typescript
// @ts-expect-error: Wird im Ticket #123 behoben
const untypisierteVariable: any = fetchData();

// @ts-ignore: Legacy-Code, wird mit JIRA-123 aktualisiert
function alteFunktion() {
  // ...
}
```

**Wichtig**: Alle diese Ausnahmen sollten dokumentiert und mit einem Ticket oder einer Aufgabe zur späteren Behebung verknüpft werden.

## Umgang mit häufigen Problemen

### 1. `strictPropertyInitialization`

Probleme mit nicht initialisierten Eigenschaften in Klassen können auf verschiedene Weise gelöst werden:

```typescript
class Beispiel {
  // Option 1: Initialisierung bei Deklaration
  eigenschaft1: string = "Standardwert";

  // Option 2: Initialisierung im Konstruktor
  eigenschaft2: number;
  constructor() {
    this.eigenschaft2 = 42;
  }

  // Option 3: Definitive Assignment Assertion
  eigenschaft3!: boolean; // Das ! teilt TypeScript mit, dass die Eigenschaft anderweitig initialisiert wird

  // Option 4: Optional machen (wenn sinnvoll)
  eigenschaft4?: string;
}
```

### 2. `noUncheckedIndexedAccess`

Bei Array- und Objektzugriffen muss nun auf `undefined` geprüft werden:

```typescript
// Vorher
const ersterWert = array[0]; // TypeScript nimmt an, dass dies sicher ist

// Nachher (mit noUncheckedIndexedAccess)
const ersterWert = array[0]; // Typ ist jetzt T | undefined
// Sicherere Varianten:
if (array.length > 0) {
  const sichererWert = array[0]; // Immer noch T | undefined, aber logisch sicher
}
// Oder mit Nullish Coalescing Operator
const fallbackWert = array[0] ?? defaultWert;
```

### 3. `noImplicitReturns`

Stellen Sie sicher, dass alle Codepfade einen Wert zurückgeben:

```typescript
// Fehler mit noImplicitReturns
function beispiel(wert: number): string {
  if (wert > 0) {
    return "Positiv";
  }
  // Fehler: Nicht alle Codepfade geben einen Wert zurück
}

// Korrigiert
function beispiel(wert: number): string {
  if (wert > 0) {
    return "Positiv";
  }
  return "Nicht positiv";
}
```

### 4. `useUnknownInCatchVariables`

Verbesserter Umgang mit Fehlern:

```typescript
// Mit unknown Catch-Variablen
try {
  // Code, der Fehler werfen könnte
} catch (error) {
  // error ist jetzt vom Typ unknown
  if (error instanceof Error) {
    console.error(error.message); // Sicher, da wir den Typ überprüft haben
  } else {
    console.error("Unbekannter Fehler:", error);
  }
}
```

### 5. `noPropertyAccessFromIndexSignature`

Zugriff auf dynamische Eigenschaften muss explizit sein:

```typescript
interface Dictionary {
  [key: string]: string;
}

const dict: Dictionary = { key1: "value1" };

// Fehler mit noPropertyAccessFromIndexSignature
const wert = dict.key1; 

// Korrigiert - Bracket-Notation verdeutlicht den dynamischen Zugriff
const wert = dict["key1"];
```

## Nützliche npm-Skripte

Die folgenden Skripte wurden zur `package.json` hinzugefügt, um die Migration zu erleichtern:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "typecheck:strict": "tsc --noEmit --project tsconfig.optimized.json",
    "typecheck:report": "tsc --noEmit --project tsconfig.optimized.json > typecheck-report.txt",
    "typecheck:incremental": "node scripts/incremental-typecheck.js"
  }
}
```

## Finale Migration

Sobald der Code die optimierte Konfiguration erfüllt, kann die `tsconfig.optimized.json` zur Standardkonfiguration werden, indem der Inhalt in die `tsconfig.json` übernommen wird.

## Weiterführende Ressourcen

- [TypeScript Handbook: Compiler Options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- [TypeScript Handbook: Strict Mode](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html#strict-option)
- [Effektive TypeScript: 62 Specific Ways to Improve Your TypeScript](https://effectivetypescript.com/)