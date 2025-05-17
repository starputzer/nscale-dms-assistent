# Streaming-Probleme Debugging

## Aktuelle Situation

Die `src/stores/sessions.ts` hat strukturelle Probleme:

1. Die `sendMessage` Funktion hat eine komplexe verschachtelte Struktur
2. Es gibt doppelte Code-Blöcke 
3. Try/Catch-Blöcke sind nicht ordnungsgemäß geschlossen

## Empfohlene Lösung

1. **Kurzfristig**: Die sendMessage-Funktion manuell überprüfen und neu strukturieren
2. **Langfristig**: Die Funktion in kleinere, überschaubare Teile aufteilen

## Nächste Schritte

1. Sicherungskopie der aktuellen Datei erstellen
2. Die sendMessage-Funktion extrahieren und isoliert debuggen
3. Strukturelle Probleme beheben
4. Funktion wieder integrieren

## Bekannte Probleme

- Zeile 1218: 'catch' or 'finally' expected
- Mehrere verschachtelte else-Blöcke
- Inkonsistente Einrückung
- Doppelter Code

## Status
⚠️ WIP - Strukturelle Probleme müssen behoben werden