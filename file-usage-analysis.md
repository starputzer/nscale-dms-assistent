# nscale DMS Assistent - Dateinutzungsanalyse

## Aktiv genutzte Dateien

### 1. Views (Aktiv genutzt)
- `/src/views/LoginView.vue` - Login-Ansicht
- `/src/views/SimpleChatView.vue` - Haupt-Chat-Ansicht
- `/src/views/AdminView.vue` - Admin-Panel
- `/src/views/SettingsView.vue` - Einstellungen  
- `/src/views/DocumentsView.vue` - Dokumentenkonverter
- `/src/views/NotFoundView.vue` - 404-Seite
- `/src/views/Advanced404View.vue` - Als Hilfe-Ansicht verwendet

### 2. Layouts (Aktiv genutzt)
- `/src/layouts/MainAppLayout.vue` - Hauptlayout mit Navigation
- `/src/layouts/GuestLayout.vue` - Layout für unauthentifizierte Nutzer  

### 3. Stores (Aktiv genutzt)
- `/src/stores/auth.ts` - Authentifizierung
- `/src/stores/sessions.ts` - Chat-Sitzungen
- `/src/stores/ui.ts` - UI-Zustand
- `/src/stores/theme.ts` - Theme-Verwaltung
- `/src/stores/settings.ts` - Benutzereinstellungen
- `/src/stores/admin/` - Admin-Stores
- `/src/stores/featureToggles.ts` - Feature-Flags
- `/src/stores/documentConverter.ts` - Dokumentenkonvertierung

### 4. Services (Aktiv genutzt)  
- `/src/services/api/` - API-Services
- `/src/services/auth/` - Authentifizierung
- `/src/services/analytics/telemetry.ts` - Telemetrie
- `/src/services/ui/` - UI-Services

### 5. Composables (Aktiv genutzt)
- `/src/composables/useAuth.ts`
- `/src/composables/useChat.ts` 
- `/src/composables/useTheme.ts`
- `/src/composables/useSettings.ts`
- `/src/composables/useUI.ts`

## Ungenutzte/verwaiste Dateien

### 1. Views (NICHT genutzt)
- `/src/views/ChatView.vue` - Alte Chat-Implementierung
- `/src/views/ChatView-redesigned.vue` - Redesign-Versuch
- `/src/views/CleanChatView.vue` - Alternative Chat-Ansicht
- `/src/views/EnhancedChatView.vue` - Erweiterte Chat-Version
- `/src/views/EnhancedLoginView.vue` - Alternative Login-Ansicht
- `/src/views/LoginView.simple.vue` - Vereinfachte Login-Version
- `/src/views/AuthView.vue` - Alternative Auth-Ansicht
- `/src/views/ErrorView.vue` - Error-Ansicht
- `/src/views/UIComponentsDemoView.vue` - Demo-Ansicht

### 2. Komponenten (REDUNDANT/DUPLIKAT)
- `/src/components/ChatView.vue` - Duplizierte Chat-Komponente
- `/src/components/App.vue` - Alternative App-Komponente
- `/src/components/Sidebar.vue` - Alternative Sidebar
- `/src/components/SidebarComponent.vue` - Weitere Sidebar
- `/src/components/NavigationBar.vue` - Alternative Navigation
- `/src/components/MessageInput.vue` - Alternative Message-Eingabe
- `/src/components/InputComponent.vue` - Weitere Input-Komponente

### 3. Store-Duplikate
- `/src/stores/sessions.optimized.ts` - Optimierte Session-Version (nicht aktiv)
- `/src/stores/admin/settings.optimized.ts` - Optimierte Admin-Settings (nicht aktiv)
- `/src/stores/uiSimple.ts` - Vereinfachte UI-Store
- `/src/stores/uiFix.ts` - UI-Store-Fix
- `/src/stores/sessionsResponseFix.ts` - Sessions-Fix

### 4. Mock-Implementierungen (Nur für Tests relevant)
- `/src/stores/*.mock.ts` - Alle Mock-Stores
- `/src/services/mocks/` - Mock-Services

### 5. Layout-Komponenten (REDUNDANT)
- `/src/components/layout/` - Viele ungenutzte Layout-Komponenten
- `/src/components/layout.backup/` - Backup-Versionen

### 6. Ungenutzte Utils
- Viele Fix-Dateien in `/src/utils/` wie:
  - `authFix.ts`
  - `authenticationFix.ts`
  - `authStatusSync.ts`
  - `authStatusSyncFixed.ts`

## Konsolidierungsmöglichkeiten

### 1. Views
- Entfernen Sie alle ungenutzten View-Varianten
- Behalten Sie nur `SimpleChatView.vue` als Hauptimplementierung

### 2. Komponenten
- Konsolidieren Sie redundante Komponenten
- Einheitliche Namenskonvention verwenden

### 3. Stores
- Entfernen Sie optimierte Versionen, wenn nicht aktiv genutzt
- Mock-Stores in separaten Test-Ordner verschieben

### 4. Utils
- Bereinigen Sie Fix-Dateien und Auth-Duplikate
- Dokumentieren Sie, welche Utils aktiv sind

### 5. Services
- Strukturieren Sie Mock-Services neu
- Entfernen Sie ungenutzte Service-Wrapper

## Empfehlungen

1. **Sofortige Bereinigung**: Entfernen Sie eindeutig ungenutzte Views und Komponenten
2. **Test-Trennung**: Verschieben Sie Mock-Implementierungen in Test-Verzeichnisse
3. **Dokumentation**: Erstellen Sie eine klare Übersicht der aktiven Module
4. **Feature-Flags**: Nutzen Sie Feature-Toggles für experimentelle Features
5. **Code-Review**: Überprüfen Sie Utils und Services auf redundante Implementierungen

Diese Bereinigung würde die Codebasis erheblich vereinfachen und die Wartbarkeit verbessern.