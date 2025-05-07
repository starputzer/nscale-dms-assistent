# Einrichtungsanleitung für nscale DMS Assistent

Diese Anleitung führt Sie durch die Einrichtung der Entwicklungsumgebung für den nscale DMS Assistenten und erklärt alle notwendigen Schritte vom Klonen des Repositories bis zum Start der Entwicklungsserver.

**Letzte Aktualisierung:** 07.05.2025

> **Verwandte Dokumente:**
> - [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) - Pinia State Management Dokumentation
> - [API_INTEGRATION.md](API_INTEGRATION.md) - API Integration Dokumentation
> - [COMPONENT_GUIDE.md](COMPONENT_GUIDE.md) - Leitfaden zur Vue 3 Komponenten-Entwicklung

## Systemvoraussetzungen

Bevor Sie beginnen, stellen Sie sicher, dass Ihr System die folgenden Anforderungen erfüllt:

### Allgemeine Voraussetzungen

- **Git**: Neueste Version
- **Texteditor/IDE**: Visual Studio Code empfohlen (mit Volar-Extension für Vue 3)

### Frontend-Voraussetzungen

- **Node.js**: Version 18.x oder höher
- **npm**: Version 8.x oder höher

### Backend-Voraussetzungen

- **Python**: Version 3.9 oder höher
- **pip**: Aktuelle Version
- **venv**: Python-Modul für virtuelle Umgebungen

## Repository klonen

1. Öffnen Sie ein Terminal und navigieren Sie zu dem Verzeichnis, in dem Sie das Projekt ablegen möchten.

2. Klonen Sie das Repository:

```bash
git clone <repository-url>
cd /opt/nscale-assist/app
```

## Frontend-Einrichtung

### Abhängigkeiten installieren

1. Navigieren Sie zum Projektverzeichnis und installieren Sie die NPM-Abhängigkeiten:

```bash
cd /opt/nscale-assist/app
npm install
```

Dieser Befehl installiert alle im `package.json` definierten Abhängigkeiten, darunter:

- Vue 3: Frontend-Framework
- Pinia: State-Management-Bibliothek
- Vite: Build-Tool und Entwicklungsserver
- TypeScript: Typsystem für JavaScript
- Axios: HTTP-Client
- Vitest: Test-Framework

### Konfiguration anpassen

1. Erstellen Sie eine `.env.local` Datei für lokale Umgebungsvariablen:

```bash
cp .env.example .env.local
```

2. Passen Sie die Umgebungsvariablen in `.env.local` nach Bedarf an:

```
# API-Konfiguration
VITE_API_BASE_URL=http://localhost:5000/api
VITE_API_VERSION=v1

# Feature-Flags
VITE_ENABLE_FEATURES=true
```

### IDE-Konfiguration (VS Code empfohlen)

1. Installieren Sie die empfohlenen VS Code-Extensions:

- Volar (Vue Language Features): Vue 3-Unterstützung
- TypeScript Vue Plugin: TypeScript-Integration für Vue
- ESLint: Linting
- Prettier: Code-Formatierung

2. Empfohlene VS Code-Einstellungen (`settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "volar.takeOverMode.enabled": true,
  "volar.vueserver.fullCompletions": true,
  "[vue]": {
    "editor.defaultFormatter": "Vue.volar"
  }
}
```

## Backend-Einrichtung

### Python-Umgebung erstellen

1. Erstellen Sie eine Python-virtuelle Umgebung:

```bash
cd /opt/nscale-assist/app
python -m venv venv
```

2. Aktivieren Sie die virtuelle Umgebung:

- Unter Linux/Mac:
  ```bash
  source venv/bin/activate
  ```
- Unter Windows:
  ```bash
  venv\Scripts\activate
  ```

3. Installieren Sie die Python-Abhängigkeiten:

```bash
pip install -r requirements.txt
```

### Datenbank einrichten

1. Initialisieren Sie die SQLite-Datenbank:

```bash
# Stellen Sie sicher, dass das Datenbankverzeichnis existiert
mkdir -p data/db

# Initialisieren Sie die Datenbank (falls erforderlich)
python -c "from api.server import init_db; init_db()"
```

### LLM-Integration (Optional)

Wenn Sie lokale LLM-Integration nutzen möchten:

1. Stellen Sie sicher, dass Ollama installiert ist (siehe [Ollama-Dokumentation](https://ollama.ai/)).

2. Laden Sie das benötigte Modell:

```bash
ollama pull llama3:8b
```

## Starten der Entwicklungsumgebung

### Frontend-Entwicklungsserver starten

```bash
# Im Verzeichnis /opt/nscale-assist/app
npm run dev
```

Der Vite-Entwicklungsserver wird unter http://localhost:3000 gestartet und bietet:

- Hot Module Replacement (HMR): Änderungen werden sofort im Browser sichtbar
- Schnelle Build-Zeiten durch ESM-basierte Entwicklung
- Echtzeit-TypeScript-Prüfung
- Automatische Import-Vervollständigung

### Backend-Entwicklungsserver starten

In einem neuen Terminal:

```bash
# Stellen Sie sicher, dass die virtuelle Umgebung aktiviert ist
source venv/bin/activate  # Unter Windows: venv\Scripts\activate

# Starten Sie den Backend-Server
python api/server.py
```

Der Flask-Server wird unter http://localhost:5000 gestartet.

## Entwicklungswerkzeuge und Befehle

### NPM-Skripte

Die folgenden NPM-Skripte stehen zur Verfügung:

- `npm run dev`: Startet den Entwicklungsserver
- `npm run build`: Erstellt eine optimierte Produktionsversion
- `npm run preview`: Startet einen lokalen Server mit der Produktionsversion
- `npm run lint`: Führt ESLint aus und prüft den Code auf Fehler
- `npm run lint:fix`: Behebt automatisch behebbare ESLint-Fehler
- `npm run type-check`: Führt die TypeScript-Typenprüfung aus
- `npm run test`: Führt die Test-Suite aus
- `npm run test:unit`: Führt nur Unit-Tests aus
- `npm run test:e2e`: Führt End-to-End-Tests aus

### Debug-Tools

#### Vue DevTools

1. Installieren Sie die [Vue DevTools Browser-Extension](https://devtools.vuejs.org/guide/installation.html).

2. Öffnen Sie die Entwicklertools im Browser und wechseln Sie zum "Vue"-Tab.

#### Pinia DevTools

Die Pinia DevTools sind in den Vue DevTools integriert. Sie können:

- Den aktuellen Zustand aller Stores anzeigen
- Aktionen und Mutationen verfolgen
- Zeitreisen (durch Zustandsänderungen navigieren)
- Store-Zustand manuell bearbeiten

#### API-Debug-Modus aktivieren

Für detaillierte API-Logs:

```typescript
// In der Entwicklerkonsole
import { apiService } from '@/services/api/ApiService';
apiService.enableDebugMode();

// Oder in der Code-Basis
if (process.env.NODE_ENV === 'development') {
  apiService.enableDebugMode();
}
```

## Häufige Probleme und Lösungen

### CORS-Fehler im Entwicklungsmodus

**Problem**: API-Anfragen schlagen mit CORS-Fehlern fehl.

**Lösung**: Stellen Sie sicher, dass der Backend-Server CORS für die Frontend-Entwicklungsserver-URL erlaubt:

```python
# In api/server.py
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})
```

### Node-Module-Cache-Probleme

**Problem**: Seltsame Fehler nach Abhängigkeitsaktualisierungen.

**Lösung**: Node-Module-Cache löschen und neu installieren:

```bash
rm -rf node_modules
npm cache clean --force
npm install
```

### Vite-HMR funktioniert nicht

**Problem**: Änderungen werden nicht automatisch im Browser angezeigt.

**Lösung**:

1. Stellen Sie sicher, dass keine Fehler in der Konsole angezeigt werden.
2. Überprüfen Sie, ob die WebSocket-Verbindung aktiv ist.
3. Versuchen Sie einen Hard-Refresh (Strg+F5 oder Cmd+Shift+R).
4. Starten Sie den Entwicklungsserver neu.

### TypeScript-Fehlermeldungen trotz funktionierendem Code

**Problem**: VS Code zeigt TypeScript-Fehler an, obwohl der Code funktioniert.

**Lösung**:

1. Stellen Sie sicher, dass VS Code die richtige TypeScript-Version verwendet:
   ```json
   // settings.json
   "typescript.tsdk": "node_modules/typescript/lib"
   ```

2. Starten Sie den TypeScript-Server neu:
   - Drücken Sie `F1` in VS Code
   - Wählen Sie "TypeScript: Restart TS Server"

## Weitere Ressourcen

### Offizielle Dokumentation

- [Vue 3 Dokumentation](https://vuejs.org/)
- [Pinia Dokumentation](https://pinia.vuejs.org/)
- [Vite Dokumentation](https://vitejs.dev/)
- [TypeScript Dokumentation](https://www.typescriptlang.org/)

### Interne Dokumentation

- [Systemarchitektur](/opt/nscale-assist/app/04_SYSTEM_ARCHITEKTUR.md)
- [Entwicklungsanleitung](/opt/nscale-assist/app/09_ENTWICKLUNGSANLEITUNG.md)
- [Komponenten-Leitfaden](/opt/nscale-assist/app/docs/COMPONENT_GUIDE.md)
- [State-Management-Dokumentation](/opt/nscale-assist/app/docs/STATE_MANAGEMENT.md)
- [API-Integration-Dokumentation](/opt/nscale-assist/app/docs/API_INTEGRATION.md)

---

Zuletzt aktualisiert: 07.05.2025