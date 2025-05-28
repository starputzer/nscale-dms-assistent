# Worktree Overview / Worktree Übersicht für nscale-assist

## Latest Fix - Session Deletion Double Confirmation (2025-05-17)

**Issue**: When deleting a session, two confirmation dialogs were shown
**Solution**: Removed redundant browser confirm dialogs from ChatView.vue

**Changed Files**:
- `/src/views/ChatView.vue` - Removed confirm() calls from handleDeleteSession() and handleBulkAction()

The SessionList component already provides a custom confirmation dialog, making the browser's confirm dialog redundant.

## English

## Parallel Development with Git Worktrees

Two Git Worktrees have been created for parallel development:

### 1. Admin-Improvements Worktree

**Path**: `/opt/nscale-assist/worktrees/admin-improvements`  
**Branch**: `admin-improvements`  
**Port**: 3002

**Affected Components**:
- `/src/views/AdminView.vue` - Main admin area view
- `/src/stores/admin/*.ts` - Admin-related stores
- `/src/components/admin/*.vue` - Admin components (tab components)
- `/src/services/admin/*.ts` - Admin services
- `/src/css/admin*.css` - Admin-specific styles

**Main Tasks**:
1. Fix UI store errors (`resetUIState`, `setActiveSession`)
2. Optimize admin tab components
3. Improve permission checks
4. Fix 401 Unauthorized errors when loading admin data

**Starting the development server**:
```bash
cd /opt/nscale-assist/worktrees/admin-improvements
npm run dev -- --port 3002
```

### 2. Fix-Chat-Streaming Worktree

**Path**: `/opt/nscale-assist/worktrees/fix-chat-streaming`  
**Branch**: `fix-chat-streaming`  
**Port**: 3003

**Affected Components**:
- `/src/views/SimpleChatView.vue` - Chat view with streaming issues
- `/src/stores/sessions.ts` - Session store with streaming logic
- `/src/utils/sourceReferenceAdapter.ts` - Source reference adapter (if relevant)
- `/src/api/server.py` - Backend API for stream endpoints
- `/src/composables/useChat.ts` - Chat composable
- `/src/composables/useBridgeChat.ts` - Bridge chat composable

**Main Tasks**:
1. Fix 422 Unprocessable Entity error
2. Fix non-displaying input messages in chat
3. Optimize streaming behavior
4. Check integration with source reference adapter

**Starting the development server**:
```bash
cd /opt/nscale-assist/worktrees/fix-chat-streaming
npm run dev -- --port 3003
```

## Shared Files

Some files affect both worktrees and should be edited with caution:

- `/src/stores/ui.ts` - UI store (affects both areas)
- `/src/stores/storeInitializer.ts` - Store initialization
- `/src/main.ts` - Main entry point
- `/src/router/index.ts` - Router configuration

## Working Method

1. **Admin-Improvements**: Focus on admin panel and UI store methods
2. **Fix-Chat-Streaming**: Focus on chat functionality and streaming API

## Synchronization

After completing work in the worktrees:

```bash
# In main repository
cd /opt/nscale-assist/app

# Merge admin changes
git merge admin-improvements

# Merge chat streaming changes  
git merge fix-chat-streaming

# Remove worktrees (optional)
git worktree remove ../worktrees/admin-improvements
git worktree remove ../worktrees/fix-chat-streaming
```

## Important Notes

- Both worktrees work on the same initial commit
- Changes should be isolated to their respective areas
- Coordination is required for conflicts in shared files
- Regular commits are recommended for better tracking

---

## Deutsch

## Parallele Entwicklung mit Git Worktrees

Es wurden zwei Git Worktrees für die parallele Entwicklung erstellt:

### 1. Admin-Improvements Worktree

**Pfad**: `/opt/nscale-assist/worktrees/admin-improvements`  
**Branch**: `admin-improvements`  
**Port**: 3002

**Betroffene Komponenten**:
- `/src/views/AdminView.vue` - Hauptansicht des Admin-Bereichs
- `/src/stores/admin/*.ts` - Admin-bezogene Stores
- `/src/components/admin/*.vue` - Admin-Komponenten (Tab-Komponenten)
- `/src/services/admin/*.ts` - Admin-Services
- `/src/css/admin*.css` - Admin-spezifische Styles

**Hauptaufgaben**:
1. Behebung der UI-Store Fehler (`resetUIState`, `setActiveSession`)
2. Optimierung der Admin-Tab-Komponenten
3. Verbesserung der Berechtigungsprüfungen
4. Behebung der 401 Unauthorized Fehler beim Laden der Admin-Daten

**Starten des Entwicklungsservers**:
```bash
cd /opt/nscale-assist/worktrees/admin-improvements
npm run dev -- --port 3002
```

### 2. Fix-Chat-Streaming Worktree

**Pfad**: `/opt/nscale-assist/worktrees/fix-chat-streaming`  
**Branch**: `fix-chat-streaming`  
**Port**: 3003

**Betroffene Komponenten**:
- `/src/views/SimpleChatView.vue` - Chat-View mit Streaming-Problemen
- `/src/stores/sessions.ts` - Session-Store mit Streaming-Logik
- `/src/utils/sourceReferenceAdapter.ts` - Source Reference Adapter (falls relevant)
- `/src/api/server.py` - Backend API für Stream-Endpoints
- `/src/composables/useChat.ts` - Chat-Composable
- `/src/composables/useBridgeChat.ts` - Bridge-Chat-Composable

**Hauptaufgaben**:
1. Behebung des 422 Unprocessable Entity Fehlers
2. Fix für nicht angezeigte Eingabenachrichten im Chat
3. Optimierung des Streaming-Verhaltens
4. Integration mit Source Reference Adapter prüfen

**Starten des Entwicklungsservers**:
```bash
cd /opt/nscale-assist/worktrees/fix-chat-streaming
npm run dev -- --port 3003
```

## Gemeinsame Dateien

Einige Dateien betreffen beide Worktrees und sollten mit Vorsicht bearbeitet werden:

- `/src/stores/ui.ts` - UI-Store (betrifft beide Bereiche)
- `/src/stores/storeInitializer.ts` - Store-Initialisierung
- `/src/main.ts` - Haupteinstiegspunkt
- `/src/router/index.ts` - Router-Konfiguration

## Arbeitsweise

1. **Admin-Improvements**: Fokus auf Admin-Panel und UI-Store-Methoden
2. **Fix-Chat-Streaming**: Fokus auf Chat-Funktionalität und Streaming-API

## Synchronisierung

Nach Abschluss der Arbeiten in den Worktrees:

```bash
# Im Hauptrepository
cd /opt/nscale-assist/app

# Admin-Änderungen mergen
git merge admin-improvements

# Chat-Streaming-Änderungen mergen  
git merge fix-chat-streaming

# Worktrees entfernen (optional)
git worktree remove ../worktrees/admin-improvements
git worktree remove ../worktrees/fix-chat-streaming
```

## Wichtige Hinweise

- Beide Worktrees arbeiten auf dem gleichen Initial-Commit
- Änderungen sollten isoliert in ihren jeweiligen Bereichen erfolgen
- Bei Konflikten in gemeinsamen Dateien ist Koordination erforderlich
- Regelmäßige Commits zur besseren Nachverfolgbarkeit empfohlen