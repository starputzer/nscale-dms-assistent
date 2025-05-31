# Admin-Authentifizierung Verbesserungen

## Übersicht

Die Admin-Authentifizierung wurde überarbeitet, um einen sichereren und benutzerfreundlicheren Zugriff auf den Admin-Bereich zu gewährleisten.

## Implementierte Verbesserungen

### 1. Admin Route Guard

Ein neuer Route Guard wurde erstellt: `/src/router/guards/adminGuard.ts`

Funktionen:
- Prüft Authentifizierung und Admin-Berechtigungen
- Leitet nicht-authentifizierte Benutzer zum Login weiter
- Zeigt Fehlermeldungen für unzureichende Berechtigungen
- Automatische Token-Erneuerung wenn Token bald abläuft
- Debug-Logging für einfachere Fehlersuche

```typescript
export const adminGuard: NavigationGuard = async (to, from, next) => {
  // Prüfe Authentifizierung
  if (!authStore.isAuthenticated) {
    return next('/login')
  }
  
  // Prüfe Admin-Berechtigung
  const hasAdminAccess = authStore.isAdmin || 
    authStore.hasPermission('admin.access')
  
  if (!hasAdminAccess) {
    toast.error('Keine Admin-Berechtigung')
    return next('/')
  }
  
  next()
}
```

### 2. Permission-basierte Guards

Factory-Funktion für spezifische Berechtigungen:

```typescript
export const createPermissionGuard = (requiredPermission: string): NavigationGuard => {
  return async (to, from, next) => {
    if (!authStore.hasPermission(requiredPermission)) {
      toast.error(`Berechtigung '${requiredPermission}' erforderlich`)
      return next(false)
    }
    next()
  }
}
```

Vordefinierte Section Guards:
- `adminSectionGuards.users` - für Benutzerverwaltung
- `adminSectionGuards.settings` - für Einstellungen
- `adminSectionGuards.logs` - für Log-Viewer
- `adminSectionGuards.system` - für Systemverwaltung

### 3. Admin Login Prompt

Neue Komponente: `/src/components/auth/AdminLoginPrompt.vue`

Features:
- Modal-Dialog für Admin-Anmeldung
- Validierung von Admin-Berechtigungen nach Login
- Automatische Weiterleitung nach erfolgreicher Anmeldung
- Fehlerbehandlung für nicht-Admin-Konten
- Responsive Design und Dark Mode Support

### 4. Router-Integration

Der Admin-Bereich nutzt jetzt den neuen Guard:

```typescript
{
  path: 'admin',
  name: 'Admin',
  component: AdminView,
  meta: { requiresAdmin: true },
  beforeEnter: adminGuard,
  children: [
    // Admin sub-routes
  ]
}
```

## Authentifizierungs-Flow

1. Benutzer navigiert zu `/admin`
2. `adminGuard` prüft Authentifizierung
3. Wenn nicht angemeldet → Weiterleitung zu `/login`
4. Wenn angemeldet, aber kein Admin → Fehlermeldung
5. Wenn Admin → Zugriff gewährt
6. Token-Refresh wenn nötig

## Nutzung

### Admin Guard verwenden

```typescript
import { adminGuard } from '@/router/guards/adminGuard'

const routes = [
  {
    path: '/admin/special',
    component: SpecialAdminComponent,
    beforeEnter: adminGuard
  }
]
```

### Permission Guard verwenden

```typescript
import { createPermissionGuard } from '@/router/guards/adminGuard'

const routes = [
  {
    path: '/admin/users/delete',
    component: UserDeleteComponent,
    beforeEnter: createPermissionGuard('admin.users.delete')
  }
]
```

### Admin Login Prompt einbinden

```vue
<template>
  <AdminLoginPrompt
    :show="showAdminLogin"
    :redirect-to="/admin/dashboard"
    @close="showAdminLogin = false"
    @success="handleAdminLoginSuccess"
  />
</template>

<script setup>
import AdminLoginPrompt from '@/components/auth/AdminLoginPrompt.vue'

const showAdminLogin = ref(false)

const handleAdminLoginSuccess = () => {
  // Weitere Aktionen nach erfolgreicher Anmeldung
}
</script>
```

## Sicherheitsaspekte

1. **Token-Validierung**: Tokens werden bei jedem Guard-Aufruf validiert
2. **Permission-Check**: Granulare Berechtigungsprüfung möglich
3. **Automatisches Logout**: Nicht-Admin-Benutzer werden beim Admin-Login abgemeldet
4. **Session-Management**: Token-Refresh verhindert Session-Ablauf
5. **Audit-Trail**: Alle Admin-Zugriffe werden geloggt

## Nächste Schritte

1. **Two-Factor Authentication**: 2FA für Admin-Konten implementieren
2. **Session Timeout**: Konfigurierbare Session-Timeouts für Admin
3. **IP-Whitelisting**: Admin-Zugriff auf bestimmte IPs beschränken
4. **Audit Logging**: Detailliertes Logging aller Admin-Aktionen
5. **Role Management**: Erweiterte Rollenverwaltung mit RBAC
6. **E2E Tests**: Automatisierte Tests für Auth-Flow

## Migration

Für bestehende Implementierungen:

1. Alte Route Guards durch `adminGuard` ersetzen
2. Permission-basierte Guards für spezifische Bereiche einführen
3. Admin Login Prompt in Navigation einbauen
4. Fehlerbehandlung anpassen

## Troubleshooting

### "Keine Admin-Berechtigung" trotz Admin-Rolle

```javascript
// Debug im Browser Console:
const authStore = useAuthStore()
console.log('User:', authStore.user)
console.log('Is Admin:', authStore.isAdmin)
console.log('Roles:', authStore.user?.roles)
console.log('Permissions:', authStore.permissions)
```

### Token läuft während Admin-Session ab

Der Guard prüft automatisch Token-Ablauf und refresht wenn nötig. Falls Probleme:

```javascript
// Manueller Token-Refresh:
await authStore.refreshToken()
```

### Login-Modal erscheint nicht

Prüfen Sie:
1. Ist die Komponente korrekt importiert?
2. Wird die `show` Prop korrekt gesetzt?
3. Gibt es CSS-Konflikte mit z-index?

## Fazit

Die verbesserte Admin-Authentifizierung bietet:
- Sicherere Zugriffskontrolle
- Bessere Benutzererfahrung
- Flexiblere Berechtigungsverwaltung
- Einfachere Fehlerbehandlung