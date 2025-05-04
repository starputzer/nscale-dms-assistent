# Build-Anleitung für das Projekt

Dieses Dokument beschreibt, wie das Frontend-Projekt neu gebaut und die Dateien korrekt in die Server-Struktur integriert werden können.

## Vue.js-Frontend bauen

Nach Änderungen im Vue.js-Frontend muss ein neuer Build erstellt werden. Dieser Prozess kompiliert alle Vue-Komponenten, optimiert den Code und erzeugt statische Dateien.

```bash
# In das Vue.js-Projektverzeichnis wechseln
cd /opt/nscale-assist/app/nscale-vue

# Build-Prozess ausführen
npm run build
```

## Build-Ergebnisse in die Server-Struktur kopieren

Nach dem Build-Prozess müssen die generierten Dateien in die richtige Server-Struktur kopiert werden, damit der Server sie korrekt ausliefern kann.

```bash
# JavaScript-Dateien kopieren
mkdir -p /opt/nscale-assist/app/api/static/js/vue
cp -r /opt/nscale-assist/app/nscale-vue/dist/assets/js/* /opt/nscale-assist/app/api/static/js/vue/

# CSS-Dateien kopieren
mkdir -p /opt/nscale-assist/app/api/static/css/vue
cp -r /opt/nscale-assist/app/nscale-vue/dist/assets/*.css /opt/nscale-assist/app/api/static/css/vue/
```

## Wichtige Pfadkonventionen

Bei der Entwicklung und Einbindung von JavaScript- und CSS-Dateien sind folgende Pfadkonventionen zu beachten:

1. **In HTML-Dateien**: Alle Ressourcen müssen mit dem Präfix `/static/` referenziert werden:
   ```html
   <script src="/static/js/vue-fix.js"></script>
   <link href="/static/css/admin.css" rel="stylesheet">
   ```

2. **Im Server-Dateisystem**: Die Dateien müssen im Verzeichnis `/opt/nscale-assist/app/api/static/` liegen:
   ```
   /opt/nscale-assist/app/api/static/js/vue-fix.js
   /opt/nscale-assist/app/api/static/css/admin.css
   ```

3. **Beim Entwickeln**: Dateien werden normalerweise zuerst in `/opt/nscale-assist/app/frontend/` erstellt und dann nach `/opt/nscale-assist/app/api/static/` kopiert.

## Quellcode-Verwaltung

Nach dem Build und dem Kopieren der Dateien können geänderte Dateien mit Git versioniert werden:

```bash
# Status überprüfen
git status

# Änderungen hinzufügen
git add /opt/nscale-assist/app/api/static/js/vue/
git add /opt/nscale-assist/app/api/static/css/vue/

# Änderungen committen
git commit -m "Update Vue.js built files"
```