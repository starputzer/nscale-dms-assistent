# Dokumentenkonverter: ConversionProgress-Komponente

Diese Dokumentation beschreibt die `ConversionProgress`-Komponente zur Anzeige des Fortschritts während der Konvertierung von Dokumenten im nscale DMS Assistenten.

## Übersicht

Die `ConversionProgress`-Komponente ist eine Vue 3 Single File Component, die den Fortschritt einer Dokumentenkonvertierung visuell darstellt und interaktive Kontrolle bietet. Die Komponente zeigt:

1. Einen Fortschrittsbalken, der den prozentualen Fortschritt anzeigt
2. Eine textuelle Beschreibung des aktuellen Konvertierungsschritts
3. Die geschätzte verbleibende Zeit in einem benutzerfreundlichen Format
4. Einen "Abbrechen"-Button, um die Konvertierung zu stoppen

Die Komponente ist vollständig barrierefrei und mit ARIA-Attributen versehen, um die Zugänglichkeit sicherzustellen.

## Verwendung

```vue
<template>
  <ConversionProgress
    :progress="75"
    current-step="Extrahiere Text aus PDF..."
    :estimated-time-remaining="45"
    details="Seite 3 von 10 wird verarbeitet"
    @cancel="handleCancelConversion"
  />
</template>

<script setup>
import ConversionProgress from '@/components/admin/document-converter/ConversionProgress.vue';

const handleCancelConversion = () => {
  // Logik zum Abbrechen der Konvertierung
  console.log('Konvertierung abgebrochen');
};
</script>
```

## Props

| Name | Typ | Standard | Beschreibung |
|------|-----|---------|--------------|
| `progress` | `number` | `0` | Fortschritt in Prozent (0-100) |
| `currentStep` | `string` | `'Dokument wird konvertiert...'` | Beschreibung des aktuellen Konvertierungsschritts |
| `estimatedTimeRemaining` | `number` | `0` | Geschätzte verbleibende Zeit in Sekunden |
| `details` | `string` | `''` | Optionale Details zum aktuellen Konvertierungsschritt |

## Events

| Name | Parameter | Beschreibung |
|------|-----------|--------------|
| `cancel` | - | Wird ausgelöst, wenn der Benutzer den Abbrechen-Button klickt |

## Beispiele

### Grundlegende Verwendung

```vue
<ConversionProgress
  :progress="50"
  current-step="Dokument wird konvertiert..."
  :estimated-time-remaining="60"
/>
```

### Mit detaillierten Informationen

```vue
<ConversionProgress
  :progress="75"
  current-step="Extrahiere Text aus PDF..."
  :estimated-time-remaining="45"
  details="Verarbeite Seite 3 von 10\nErkennung von Tabellen aktiviert"
  @cancel="handleCancelConversion"
/>
```

### Abgeschlossene Konvertierung

```vue
<ConversionProgress
  :progress="100"
  current-step="Konvertierung abgeschlossen!"
  :estimated-time-remaining="0"
  details="Alle 10 Seiten erfolgreich konvertiert."
/>
```

## Integration mit dem DocumentConverter-Store

Die Komponente lässt sich ideal mit dem `documentConverter`-Store verwenden:

```vue
<template>
  <div v-if="isConverting">
    <ConversionProgress
      :progress="conversionProgress"
      :current-step="conversionStep"
      :estimated-time-remaining="estimatedTimeRemaining"
      @cancel="cancelConversion(selectedDocumentId)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useDocumentConverterStore } from '@/stores/documentConverter';
import ConversionProgress from '@/components/admin/document-converter/ConversionProgress.vue';

const store = useDocumentConverterStore();

// Computed properties aus dem Store
const isConverting = computed(() => store.isConverting);
const conversionProgress = computed(() => store.conversionProgress);
const conversionStep = computed(() => store.conversionStep);
const estimatedTimeRemaining = computed(() => store.estimatedTimeRemaining);
const selectedDocumentId = computed(() => store.selectedDocumentId);

// Methode zum Abbrechen der Konvertierung
const cancelConversion = (documentId) => {
  if (documentId) {
    store.cancelConversion(documentId);
  }
};
</script>
```

## Barrierefreiheit

Die Komponente implementiert folgende ARIA-Attribute, um die Zugänglichkeit zu gewährleisten:

- `role="region"`: Definiert den Bereich als spezifischen Inhaltsbereich
- `aria-live="polite"`: Updates werden für Screenreader angekündigt, ohne laufende Inhalte zu unterbrechen
- `aria-label`: Beschreibender Text für den gesamten Fortschrittsbereich
- `role="progressbar"`: Markiert den Fortschrittsbalken für Screenreader
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax`: Beschreiben den aktuellen, minimalen und maximalen Wert des Fortschrittsbalkens

## Anpassung und Theming

Die Komponente verwendet definierte Farben und Abstände, die dem Gesamtdesign des nscale DMS Assistenten entsprechen. Die Hauptstilwerte sind:

- Primärfarbe (Fortschrittsbalken): `#4a6cf7`
- Hintergrundfarbe: `#f8f9fa`
- Textfarbe: `#495057`
- Abbrechen-Button (Standard): `#e74c3c`
- Abbrechen-Button (Hover): `#c0392b`

Um die Komponente an ein anderes Design anzupassen, können Sie die CSS-Variablen überschreiben:

```css
:root {
  --conversion-progress-primary: #4a6cf7;
  --conversion-progress-bg: #f8f9fa;
  --conversion-progress-text: #495057;
  --conversion-progress-cancel: #e74c3c;
  --conversion-progress-cancel-hover: #c0392b;
}
```

## Technische Details

### Zeiteformatierung

Die Komponente enthält eine `formatTime`-Funktion, die die geschätzte verbleibende Zeit in ein benutzerfreundliches Format umwandelt:

```typescript
const formatTime = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (minutes > 0) {
    if (remainingSeconds > 0) {
      return `${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'} ${remainingSeconds} ${remainingSeconds === 1 ? 'Sekunde' : 'Sekunden'}`;
    }
    return `${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`;
  } else {
    return `${remainingSeconds} ${remainingSeconds === 1 ? 'Sekunde' : 'Sekunden'}`;
  }
};
```

### i18n-Integration

Die Komponente ist bereit für die Integration mit i18n. Sie enthält eine einfache i18n-Fallback-Implementation, um Texte anzuzeigen, kann aber einfach mit einer vollständigen i18n-Lösung integriert werden. Die Schlüssel sind:

- `converter.estimatedTimeRemaining`: "Geschätzte verbleibende Zeit: {time}"
- `converter.cancelConversion`: "Konvertierung abbrechen"

## Best Practices

1. **Echtzeit-Updates**: Aktualisieren Sie den Fortschritt und die geschätzte Zeit regelmäßig, um den Benutzer über den Status der Konvertierung zu informieren.

2. **Schrittbeschreibungen**: Verwenden Sie spezifische, aussagekräftige Beschreibungen für den `currentStep`, anstatt generische Meldungen.

3. **Kontext für Abbrüche**: Bieten Sie dem Benutzer Feedback, wenn ein Konvertierungsprozess abgebrochen wurde.

4. **Rückmeldung nach Abschluss**: Zeigen Sie eine Meldung oder navigieren Sie automatisch zur Ergebnisansicht, wenn die Konvertierung abgeschlossen ist.

---

*Diese Komponente ist Teil des Dokumentenkonverter-Systems des nscale DMS Assistenten.*