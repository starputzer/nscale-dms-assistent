# Fehleranalyse nscale DMS Assistent

## Beobachtete Fehler

1. "Failed to load resource: the server responded with a status of 404 (Not Found)" für main.js
2. "Uncaught ReferenceError: Vue is not defined" in app.js
3. UI lädt teilweise, aber Template-Variablen werden nicht ersetzt

## Zu überprüfende Dateien

1. `/opt/nscale-assist/app/frontend/index.html` - Überprüfe Einbindung der Skripte
2. `/opt/nscale-assist/app/frontend/js/main.js` - Fehlt diese Datei?
3. `/opt/nscale-assist/app/frontend/js/app.js` - Vue-Abhängigkeit prüfen
4. `/opt/nscale-assist/app/api/frontend/` - Prüfe, ob kompilierte Assets existieren
5. `/opt/nscale-assist/app/vite.config.js` - Build-Konfiguration überprüfen

## Diagnosekommandos

```bash
# 1. Prüfen, ob main.js existiert und wo
find /opt/nscale-assist -name "main.js" -type f

# 2. Webserver-Logs überprüfen
python -m uvicorn app.api.server:app --log-level debug

# 3. Vite-Build-Prozess überprüfen
cd /opt/nscale-assist/app && npm run build:no-check -- --debug

# 4. Netzwerkanfragen im Browser beobachten
# Öffne den Browser, drücke F12 und navigiere zum Network-Tab
```

## Strukturiertes Vorgehen

1. **Ressourcenpfade überprüfen**: 
   - Prüfe in `frontend/index.html`, wie main.js eingebunden wird
   - Überprüfe, ob die Pfade relativ oder absolut sind

2. **Build-Prozess kontrollieren**: 
   - Prüfe, ob der Build-Prozess korrekt Dateien nach `api/frontend` kopiert
   - Verifiziere die Ausgabepfade im vite.config.js

3. **Vue-Einbindung untersuchen**:
   - Stelle sicher, dass Vue vor app.js geladen wird
   - Prüfe die Reihenfolge der Skript-Tags in index.html

4. **Template-Rendering debuggen**:
   - Analysiere, welcher Teil des Vue-Lebenszyklus fehlschlägt
   - Prüfe die Konsole auf detailliertere Vue-Fehlermeldungen