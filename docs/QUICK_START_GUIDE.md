# Quick Start Guide - nscale DMS Assistant

## 🚀 In 5 Minuten startklar!

Dieser Guide bringt dich schnell zum Laufen mit dem nscale DMS Assistant.

## 📋 Voraussetzungen

```bash
# Check Versionen
node --version    # v18.0.0+
npm --version     # v9.0.0+
python --version  # Python 3.9+
```

## 🛠️ Installation

### 1. Repository klonen

```bash
git clone https://github.com/your-org/nscale-assist.git
cd nscale-assist/app
```

### 2. Frontend Setup

```bash
# Dependencies installieren
npm install

# Development Server starten
npm run dev
```

Frontend läuft auf: http://localhost:5173

### 3. Backend Setup

```bash
# Virtual Environment erstellen
python -m venv venv

# Aktivieren
source venv/bin/activate  # Linux/Mac
# oder
venv\Scripts\activate     # Windows

# Dependencies installieren
pip install -r requirements.txt

# Server starten
cd api
python server.py
```

Backend läuft auf: http://localhost:8000

### 4. Ollama Setup (für AI Features)

```bash
# Ollama installieren (Mac)
brew install ollama

# Oder Download von https://ollama.ai

# Modell herunterladen
ollama pull mistral

# Ollama starten
ollama serve
```

## 🎯 Erste Schritte

### 1. Login

Öffne http://localhost:5173 und logge dich ein:
- Email: `demo@example.com`
- Password: `demo123`

### 2. Neue Chat-Session

1. Klicke auf "Neue Session" (+)
2. Gib einen Titel ein
3. Stelle deine erste Frage!

### 3. Features erkunden

- **Markdown Support**: Formatiere mit Markdown
- **Code Highlighting**: ` ```javascript ` für Code
- **Source References**: Klicke auf Quellen-Links
- **Dark Mode**: Toggle in Settings

## 💻 Entwicklung

### VS Code Setup

1. Installiere empfohlene Extensions:
   - Vue - Official
   - TypeScript Vue Plugin
   - ESLint
   - Prettier

2. Öffne Projekt:
```bash
code .
```

### Erste Komponente

Erstelle `src/components/HelloWorld.vue`:

```vue
<template>
  <div class="hello">
    <h1>{{ greeting }}</h1>
    <button @click="updateGreeting">Click me!</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const greeting = ref('Hello nscale!');

function updateGreeting() {
  greeting.value = 'Welcome to nscale DMS Assistant!';
}
</script>

<style scoped>
.hello {
  text-align: center;
  padding: 2rem;
}
</style>
```

### Store verwenden

```typescript
// In einer Komponente
import { useSessionsStore } from '@/stores/sessions';

const sessionsStore = useSessionsStore();

// Session erstellen
await sessionsStore.createSession('Meine Session');

// Messages abrufen
const messages = sessionsStore.currentMessages;
```

## 🧪 Tests ausführen

```bash
# Unit Tests
npm run test:unit

# E2E Tests
npm run test:e2e

# Mit Coverage
npm run test:coverage
```

## 🚀 Build für Production

```bash
# Frontend build
npm run build

# Preview production build
npm run preview
```

## 🔧 Häufige Befehle

```bash
# Linting
npm run lint          # Check
npm run lint:fix      # Auto-fix

# Type Checking
npm run typecheck

# Bundle Analyse
npm run build:analyze

# Alle Tests
npm test
```

## 🐛 Troubleshooting

### Port bereits belegt?

```bash
# Frontend auf anderem Port
npm run dev -- --port 3000

# Backend auf anderem Port
python server.py --port 8001
```

### TypeScript Fehler?

```bash
# Cache löschen
rm -rf node_modules/.vite
npm run typecheck
```

### Ollama Connection Error?

```bash
# Check ob Ollama läuft
curl http://localhost:11434/api/tags

# Neustart
ollama serve
```

## 📚 Nächste Schritte

1. 📖 Lies die [Team Onboarding Guide](./TEAM_ONBOARDING_GUIDE.md)
2. 🏗️ Verstehe die [Architektur](./ARCHITECTURE.md)
3. 💡 Lerne die [Best Practices](./DEVELOPMENT_BEST_PRACTICES.md)
4. 🤝 Trete dem Team-Slack bei: `#nscale-assist-dev`

## 🆘 Hilfe

- **Dokumentation**: `/docs` Verzeichnis
- **Issues**: GitHub Issues
- **Team-Chat**: Slack `#nscale-assist-dev`
- **Wiki**: Confluence Space "nscale DMS Assistant"

---

**Happy Coding!** 🎉

Bei Fragen: Zögere nicht, das Team zu fragen!