# Digitale Akte Assistent

Ein KI-gestützter Assistent für digitales Dokumentenmanagement, basierend auf Vue 3 Single File Components und RAG-Technologie.

## Übersicht

Der Digitale Akte Assistent ist eine moderne Webanwendung, die Benutzern bei der effizienten Verwaltung und Verarbeitung digitaler Dokumente hilft. Das System verwendet einen Retrieval-Augmented Generation (RAG) Ansatz für intelligente Antworten und bietet eine intuitive Benutzeroberfläche auf Basis von Vue 3.

## Hauptmerkmale

- 🤖 **KI-gestützte Dokumentenverarbeitung** - RAG-basierte intelligente Antworten
- 📄 **Dokumentenkonverter** - Unterstützung für PDF, DOCX und weitere Formate
- 💬 **Chat-Interface** - Natürliche Konversation mit Streaming-Antworten
- 🎨 **Modernes UI** - Vue 3 SFC mit TypeScript und Pinia State Management
- 🔒 **Sicherheit** - Rollenbasierte Zugriffskontrolle und sichere Authentifizierung
- ♿ **Barrierefreiheit** - WCAG 2.1 AA konform

## Technologie-Stack

### Frontend
- Vue 3 mit Composition API
- TypeScript
- Vite als Build-Tool
- Pinia für State Management
- SCSS mit CSS Custom Properties

### Backend
- Python mit FastAPI
- Ollama für KI-Modelle
- BAAI/bge-m3 für Embeddings

## Installation

### Voraussetzungen
- Node.js 22+ 
- Python 3.9+
- Ollama

### Setup

1. **Repository klonen**
   ```bash
   git clone https://github.com/starputzer/nscale-dms-assistent.git
   cd nscale-dms-assistent
   ```

2. **Backend einrichten**
   ```bash
   pip install -r requirements.txt
   ollama pull llama3:8b-instruct-q4_1
   ```

3. **Frontend einrichten**
   ```bash
   npm install
   ```

## Entwicklung

### Backend starten
```bash
python api/server.py
```

### Frontend-Entwicklungsserver
```bash
npm run dev
```

### Produktion-Build
```bash
npm run build
```

### Tests ausführen
```bash
npm run test        # Unit Tests
npm run test:e2e    # E2E Tests
```

### Code-Qualität
```bash
npm run lint        # Linting
npm run typecheck   # TypeScript-Prüfung
npm run format      # Code formatieren
```

### Security & Performance
```bash
npm run security:audit      # Security-Audit durchführen
npm run security:audit:fix  # Vulnerabilities automatisch beheben
npm run build:analyze       # Bundle-Analyse
```

### Neue Features (Mai 2025)

#### Performance Monitoring
- **Development Widget**: Automatisch sichtbar im Development-Modus (unten rechts)
- **Metriken**: Response Times, Error Rate, Web Vitals, Memory Usage
- **API**: `performanceMonitor` Service für custom Tracking

#### CI/CD Integration
- **GitHub Actions**: Automatische TypeScript- und Lint-Checks
- **Pre-Commit Hooks**: Lokale Validierung vor Commits
- **Performance Baseline**: Definierte Schwellwerte für Build und Runtime

## Projektstruktur

```
src/
├── components/     # Vue 3 SFC Komponenten
├── composables/    # Wiederverwendbare Composition Functions
├── stores/         # Pinia State Management
├── services/       # API und Business Logic
├── types/          # TypeScript Definitionen
├── views/          # Seiten-Komponenten
├── router/         # Vue Router Konfiguration
├── assets/         # Statische Ressourcen
└── utils/          # Hilfsfunktionen
```

## Dokumentation

Ausführliche Dokumentation finden Sie im `/docs` Verzeichnis:

- [Projektübersicht](./docs/00_KONSOLIDIERTE_DOKUMENTATION/00_PROJEKT/01_projektueberblick.md)
- [Roadmap](./docs/00_KONSOLIDIERTE_DOKUMENTATION/00_PROJEKT/02_roadmap.md)
- [Architektur](./docs/00_KONSOLIDIERTE_DOKUMENTATION/03_ARCHITEKTUR/07_systemarchitektur.md)
- [Entwicklungsrichtlinien](./docs/00_KONSOLIDIERTE_DOKUMENTATION/04_ENTWICKLUNG/)

## Mitwirken

Wir freuen uns über Beiträge! Bitte lesen Sie unsere [Contribution Guidelines](./CONTRIBUTING.md) für Details zum Entwicklungsprozess.

## Lizenz

[Lizenzinformationen hier einfügen]

## Support

Bei Fragen oder Problemen:
- Erstellen Sie ein Issue im Repository
- Kontaktieren Sie das Entwicklungsteam
- Konsultieren Sie die [Dokumentation](./docs/)

---

**Version:** 1.0.0 | **Letzte Aktualisierung:** 30.05.2025