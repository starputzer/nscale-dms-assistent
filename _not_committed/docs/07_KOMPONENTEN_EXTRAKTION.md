# Komponenten-Extraktion für die Vue-Migration

## Einführung

Die Umstellung von HTML/CSS-Strukturen auf Vue-Komponenten erfordert ein systematisches Vorgehen. Diese Dokumentation beschreibt den Prozess des "Component Mining" - der Extraktion von Komponenten aus bestehendem HTML-Code.

## Prozess der Komponenten-Extraktion

### 1. HTML-Code analysieren und logische Einheiten identifizieren

Der erste Schritt besteht darin, die bestehende index.html zu analysieren und logische UI-Einheiten zu identifizieren:

| Logische Einheit | HTML-Bereich | Vue-Komponente |
|------------------|--------------|----------------|
| Login-Formular | Zeilen 27-135 | `LoginForm.vue` |
| Navigation | Zeilen 142-177 | `AppHeader.vue` |
| Seitenleiste | Zeilen 181-248 | `SidebarNav.vue` |
| Chat-Bereich | Zeilen 252-369 | `ChatView.vue` |
| Admin-Panel | Zeilen 373-743 | `AdminPanel.vue` |
| Einstellungen | Zeilen 755-862 | `SettingsPanel.vue` |
| Feedback-Dialog | Zeilen 866-884 | `FeedbackDialog.vue` |
| Quellenerklärung | Zeilen 887-943 | `ExplanationDialog.vue` |

### 2. HTML-Struktur extrahieren

```bash
# Beispiel für die Extraktion der Chat-Komponente mit der 'sed'-Methode
sed -n '252,369p' index.html > chat-component-html.txt
```

### 3. Template, Script und Style trennen

Nachdem der HTML-Code extrahiert wurde, wird er in die Vue-Komponentenstruktur überführt:

```vue
<template>
  <!-- Extrahierter HTML-Code -->
</template>

<script>
export default {
  // Daten und Methoden basierend auf den im HTML gefundenen v-Direktiven
}
</script>

<style>
/* Relevante CSS-Styles aus den CSS-Dateien */
</style>
```

## Beispiel: Extraktion der Navigation-Komponente

### Original HTML-Code (Zeilen 142-177)

```html
<!-- Navigation Header -->
<header class="nscale-header p-4 shadow-sm">
    <div class="container mx-auto flex justify-between items-center">
        <div class="flex items-center">
            <img src="/static/images/senmvku-logo.png" alt="Berlin Logo" class="h-12 mr-4">
            <div class="nscale-logo">nscale DMS Assistent</div>
        </div>
        
        <!-- Simplified Navigation Menu -->
        <div class="flex items-center space-x-4">
            <button 
                @click="startNewSession" 
                class="nscale-btn-primary flex items-center">
                <i class="fas fa-plus mr-2"></i>
                Neue Unterhaltung
            </button>

            <!-- NEU: Admin-Konfigurationsbutton, nur für Admins sichtbar -->
            <button 
                v-if="userRole === 'admin'"
                @click="activeView = activeView === 'chat' ? 'admin' : 'chat'" 
                class="nscale-btn-secondary flex items-center"
                title="Systemadministration">
                <i class="fas fa-cog mr-2"></i>
                <span class="hidden md:inline">Administration</span>
            </button>

            <button 
                @click="logout" 
                class="nscale-btn-secondary flex items-center">
                <i class="fas fa-sign-out-alt mr-2"></i>
                Abmelden
            </button>
        </div>
    </div>
</header>
```

### Extrahiert als Vue-Komponente (AppHeader.vue)

```vue
<template>
  <header class="nscale-header p-4 shadow-sm">
    <div class="container mx-auto flex justify-between items-center">
      <div class="flex items-center">
        <img src="/static/images/senmvku-logo.png" alt="Berlin Logo" class="h-12 mr-4">
        <div class="nscale-logo">nscale DMS Assistent</div>
      </div>
      
      <div class="flex items-center space-x-4">
        <button 
          @click="startNewSession" 
          class="nscale-btn-primary flex items-center">
          <i class="fas fa-plus mr-2"></i>
          Neue Unterhaltung
        </button>

        <button 
          v-if="userRole === 'admin'"
          @click="toggleView" 
          class="nscale-btn-secondary flex items-center"
          title="Systemadministration">
          <i class="fas fa-cog mr-2"></i>
          <span class="hidden md:inline">Administration</span>
        </button>

        <button 
          @click="logout" 
          class="nscale-btn-secondary flex items-center">
          <i class="fas fa-sign-out-alt mr-2"></i>
          Abmelden
        </button>
      </div>
    </div>
  </header>
</template>

<script>
export default {
  name: 'AppHeader',
  props: {
    userRole: {
      type: String,
      required: true
    },
    activeView: {
      type: String,
      required: true
    }
  },
  methods: {
    startNewSession() {
      this.$emit('new-session');
    },
    toggleView() {
      const newView = this.activeView === 'chat' ? 'admin' : 'chat';
      this.$emit('update:activeView', newView);
    },
    logout() {
      this.$emit('logout');
    }
  }
}
</script>

<style>
/* Hier können zusätzliche komponentenspezifische Styles eingefügt werden */
/* Die Hauptstyles werden durch den Import der globalen CSS-Dateien abgedeckt */
</style>
```

## Variablen und Methoden identifizieren

### 1. v-model-Direktiven extrahieren

Suchen Sie nach `v-model`-Attributen im HTML, um Datenfelder zu identifizieren:

```
grep -o 'v-model="[^"]*"' index.html | sort | uniq
```

Gefundene v-model-Bindungen:
- `v-model="accessibilitySettings.reduceMotion"`
- `v-model="accessibilitySettings.simpleLanguage"`
- `v-model="adminTab"`
- `v-model="currentFontSize"`
- `v-model="currentTheme"`
- `v-model="email"`
- `v-model="feedbackComment"`
- `v-model="motdConfig.content"`
- `v-model="motdConfig.display.dismissible"`
- `v-model="motdConfig.display.showInChat"`
- `v-model="motdConfig.enabled"`
- `v-model="motdConfig.format"`
- `v-model="motdConfig.style.backgroundColor"`
- `v-model="motdConfig.style.borderColor"`
- `v-model="motdConfig.style.textColor"`
- `v-model="newUser.email"`
- `v-model="newUser.password"`
- `v-model="newUser.role"`
- `v-model="password"`
- `v-model="question"`
- `v-model="selectedColorTheme"`
- `v-model="user.role"`

### 2. Event-Handler extrahieren

Suchen Sie nach `@click`- und ähnlichen Event-Direktiven:

```
grep -o '@[a-zA-Z]*="[^"]*"' index.html | sort | uniq
```

Einige gefundene Event-Handler:
- `@click="clearEmbeddingCache"`
- `@click="clearModelCache"`
- `@click="createUser"`
- `@click="deleteSession"`
- `@click="deleteUser"`
- `@click="dismissMotd"`
- `@click="loadExplanation"`
- `@click="loadFeedbackStats"`
- `@click="loadSession"`
- `@click="loadSystemStats"`
- `@click="login"`
- `@click="logout"`
- `@click="register"`
- `@click="resetMotdConfig"`
- `@click="resetPassword"`
- `@click="saveMotdConfig"`
- `@click="sendQuestionStream"`
- `@click="showFeedbackCommentDialog"`
- `@click="showSourcesDialog"`
- `@click="startNewSession"`
- `@click="toggleSettings"`
- `@click.prevent="authMode = 'login'"`
- `@click.prevent="authMode = 'register'"`
- `@click.prevent="authMode = 'reset'"`
- `@click.stop="toggleSettings"`
- `@submit.prevent="login"`
- `@submit.prevent="register"`
- `@submit.prevent="resetPassword"`
- `@submit.prevent="sendQuestionStream"`

## Komponentenhierarchie und Datenfluss

Für die Extraktion der Komponenten ist es wichtig, den Datenfluss zu verstehen:

```
App.vue
├── LoginForm.vue (wenn nicht eingeloggt)
└── MainLayout.vue (wenn eingeloggt)
    ├── AppHeader.vue
    ├── SidebarNav.vue (wenn activeView === 'chat')
    ├── AdminSidebar.vue (wenn activeView === 'admin')
    ├── ChatView.vue (wenn activeView === 'chat')
    ├── AdminPanel.vue (wenn activeView === 'admin')
    └── Dialoge und Modals
        ├── SettingsPanel.vue
        ├── FeedbackDialog.vue
        └── ExplanationDialog.vue
```

## Gemeinsame State-Verwaltung

Für die Komponenten-übergreifende Zustandsverwaltung verwenden wir Stores:

```javascript
// authStore.js
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    userRole: localStorage.getItem('userRole') || 'user',
    email: ''
  }),
  actions: {
    login(email, password) {
      // Implementation
    },
    logout() {
      // Implementation
    }
  }
});

// sessionStore.js
export const useSessionStore = defineStore('session', {
  state: () => ({
    currentSessionId: null,
    sessions: [],
    messages: []
  }),
  actions: {
    startNewSession() {
      // Implementation
    },
    loadSession(id) {
      // Implementation
    }
  }
});
```

## Schrittweise Migration

Die Migration sollte schrittweise erfolgen:

1. Gemeinsame Stores erstellen
2. Basiskomponenten extrahieren (Header, Footer)
3. Komplexere Komponenten (Chat, Admin) extrahieren
4. Dialoge und Modals extrahieren
5. Integration und Tests

## Qualitätssicherung

Bei jedem Migrationsschritt muss geprüft werden:
- Identisches visuelles Erscheinungsbild
- Gleiche Funktionalität
- Keine Regressionsfehler

## Automatisiertes Testen

```javascript
// Beispiel für einen visuellen Regressions-Test
describe('ChatView Component', () => {
  it('looks exactly like the original HTML/CSS version', async () => {
    // Komponente rendern
    const wrapper = mount(ChatView, {
      props: { /* Erforderliche Props */ }
    });
    
    // Screenshot erstellen
    const screenshot = await takeScreenshot(wrapper.element);
    
    // Mit Referenz-Screenshot vergleichen
    expect(pixelDifference(screenshot, 'reference-chat.png')).toBeLessThan(10);
  });
});
```

## Fazit

Die systematische Extraktion von Komponenten aus bestehenden HTML-Strukturen ist der Schlüssel für eine erfolgreiche Migration zu Vue.js mit identischem UI. Durch die Beachtung der HTML-Struktur, CSS-Klassen und Event-Handler können wir sicherstellen, dass die Vue-Komponenten exakt dasselbe Erscheinungsbild und Verhalten wie die Original-HTML-Version aufweisen.