# Rollenkonzept

Dieses Dokument beschreibt das aktuelle und geplante Rollenkonzept des nscale DMS Assistenten.

## Aktuelle Rollenhierarchie

In der aktuellen Version des nscale DMS Assistenten sind folgende Rollen definiert:

1. **Administrator**
   - Vollzugriff auf alle Funktionen des Systems
   - Verwaltung von Benutzern und deren Rechten
   - Konfiguration aller Systemeinstellungen
   - Zugriff auf System-Monitoring und -Wartung
   - Verwaltung des Dokumentenkonverters

2. **Benutzer**
   - Zugriff auf das Chat-Interface
   - Nutzung des Dokumentenkonverters
   - Anzeige der eigenen Chat-Historie
   - Anpassung persönlicher Einstellungen

**Hinweis:** Jeder Benutzer benötigt einen Account - es gibt keine Gastfunktionalität.

## Geplantes erweitertes Rollenkonzept

Die Anwendung wird um ein detaillierteres, granulares Rollenkonzept erweitert:

### 1. Primäre Rollen

Diese Rollen definieren den grundlegenden Zugriff auf das System:

1. **Administrator**
   - Übergeordnete Rolle mit vollständigen Rechten
   - Kann weitere Rollenrechte verändern und zuweisen
   - Technische Systemverwaltung

2. **Manager**
   - Zugriff auf administrative Bereiche ohne technische Systemkonfiguration
   - Verwaltung von Benutzerkonten und Gruppen
   - Einsicht in Nutzungsstatistiken und Reports

3. **Power User**
   - Erweiterte Funktionalitäten im Chat-Interface
   - Zugriff auf erweiterte Dokumentenkonvertierung
   - Bereitstellung von Feedback und Verbesserungsvorschlägen

4. **Benutzer**
   - Standardzugriff auf das Chat-Interface
   - Grundlegende Dokumentenkonvertierung
   - Persönliche Einstellungen und Chat-Historie

### 2. Funktionale Rollen

Diese Rollen können zusätzlich zu den primären Rollen vergeben werden. Ein Benutzer kann mehrere funktionale Rollen gleichzeitig innehaben:

1. **Feedback-Analyst**
   - Zugriff auf das Feedback-Verwaltungssystem
   - Analyse und Kategorisierung von Benutzerfeedback
   - Generierung von Feedback-Reports

2. **System-Monitor**
   - Überwachung der Systemleistung
   - Zugriff auf Logs und Diagnose-Tools
   - Benachrichtigung bei Systemanomalien

3. **Content-Manager**
   - Verwaltung der Wissensbasis
   - Aktualisierung und Erweiterung von Dokumentationen
   - Qualitätssicherung der Inhalte

4. **User-Manager**
   - Verwaltung von Benutzerkonten
   - Erstellen und Deaktivieren von Benutzerkonten
   - Zurücksetzen von Passwörtern

5. **Chat-Moderator**
   - Überwachung und Moderation von Chat-Inhalten
   - Zugriff auf globale Chat-Historien
   - Bearbeitung und Löschung von problematischen Inhalten

### 3. Implementierungsphasen

Das erweiterte Rollenkonzept wird in folgenden Phasen implementiert:

- **Phase 1**: Definition spezifischer Rollen und deren Berechtigungen (abgeschlossen)
- **Phase 2**: Backend-Support für einzelne, spezifische Rollen
- **Phase 3**: Benutzeroberfläche für rollenbasierte Funktionen
- **Phase 4**: Implementierung des Mehrrollensystems (kombinierte Rollen)
- **Phase 5**: Überarbeitung des Benutzermanagements für administrative Rollen

## Berechtigungssystem

Die Berechtigungen werden nach dem Prinzip der geringsten Privilegien (Principle of Least Privilege) vergeben:

### Berechtigungskategorien

1. **Zugriff auf Systemfunktionen**
   - `system.view`: Einsicht in Systemstatistiken
   - `system.manage`: Verwaltung von Systemparametern
   - `system.config`: Konfiguration kritischer Systemeinstellungen

2. **Benutzerverwaltung**
   - `users.view`: Einsicht in Benutzerliste
   - `users.manage`: Verwaltung von Benutzerkonten
   - `users.roles`: Zuweisung von Rollen

3. **Dokumentenkonverter**
   - `converter.use`: Nutzung des Dokumentenkonverters
   - `converter.admin`: Verwaltung des Dokumentenkonverters
   - `converter.batch`: Zugriff auf Batch-Konvertierung

4. **Feedback-System**
   - `feedback.view`: Einsicht in Feedback
   - `feedback.analyze`: Analyse von Feedback-Daten
   - `feedback.manage`: Verwaltung des Feedback-Systems

5. **Chat-Interface**
   - `chat.use`: Nutzung des Chat-Interfaces
   - `chat.history`: Zugriff auf Chat-Historie
   - `chat.moderate`: Moderation von Chat-Inhalten

### Rollenzuweisung und Mehrfachrollen

Die primären Rollen erhalten standardmäßig folgende Berechtigungen:

- **Administrator**: Alle Berechtigungen
- **Manager**: `system.view`, `users.view`, `users.manage`, `converter.use`, `converter.admin`, `feedback.view`, `feedback.analyze`, `chat.use`, `chat.history`
- **Power User**: `converter.use`, `converter.batch`, `feedback.view`, `chat.use`, `chat.history`
- **Benutzer**: `converter.use`, `chat.use`, `chat.history`

Funktionale Rollen erhalten zusätzliche spezifische Berechtigungen:

- **Feedback-Analyst**: `feedback.view`, `feedback.analyze`
- **System-Monitor**: `system.view`
- **Content-Manager**: `system.view` (eingeschränkt), `converter.use`, `converter.admin`
- **User-Manager**: `users.view`, `users.manage`
- **Chat-Moderator**: `chat.use`, `chat.history`, `chat.moderate`

Ein Benutzer mit mehreren Rollen erhält die Vereinigungsmenge aller Berechtigungen seiner Rollen. Beispiel:
- Ein Benutzer mit der primären Rolle "Power User" und den funktionalen Rollen "Feedback-Analyst" und "Chat-Moderator" erhält alle Berechtigungen dieser drei Rollen.

## Technische Umsetzung

### Backend-Implementierung

Die Rollenverwaltung wird im Backend wie folgt implementiert:

```python
# Beispiel aus modules/auth/user_model.py
class User:
    def __init__(self, username, email, primary_role, functional_roles=None):
        self.username = username
        self.email = email
        self.primary_role = primary_role
        self.functional_roles = functional_roles or []
        
    def has_permission(self, permission):
        """Prüft, ob der Benutzer die angegebene Berechtigung hat."""
        # Berechtigungen der primären Rolle prüfen
        if permission in ROLE_PERMISSIONS.get(self.primary_role, []):
            return True
            
        # Berechtigungen der funktionalen Rollen prüfen
        for role in self.functional_roles:
            if permission in ROLE_PERMISSIONS.get(role, []):
                return True
                
        return False
        
    def get_all_permissions(self):
        """Gibt alle Berechtigungen des Benutzers zurück."""
        permissions = set(ROLE_PERMISSIONS.get(self.primary_role, []))
        
        for role in self.functional_roles:
            permissions.update(ROLE_PERMISSIONS.get(role, []))
            
        return permissions
```

### Frontend-Integration

Das Rollenkonzept wird im Frontend durch bedingte Renderinglogik umgesetzt:

```javascript
// React-Beispiel für rollenbasiertes Rendering
function AdminPanel({ user }) {
  if (!user.hasPermission('system.manage')) {
    return <AccessDeniedMessage />;
  }
  
  return (
    <div className="admin-panel">
      <h2>Systemverwaltung</h2>
      
      {user.hasPermission('users.manage') && (
        <UserManagement />
      )}
      
      {user.hasPermission('converter.admin') && (
        <ConverterSettings />
      )}
      
      {user.hasPermission('feedback.analyze') && (
        <FeedbackAnalysis />
      )}
    </div>
  );
}
```

## Benutzeroberfläche für Mehrfachrollen

Die Benutzeroberfläche für die Verwaltung von Mehrfachrollen wird folgendermaßen umgesetzt:

```html
<!-- Beispiel für Benutzerbearbeitung mit Mehrfachrollen -->
<div class="user-edit-panel">
  <h3>Rollen für Benutzer: {{user.email}}</h3>
  
  <div class="role-section">
    <h4>Primäre Rolle</h4>
    <select v-model="user.primary_role">
      <option value="admin">Administrator</option>
      <option value="manager">Manager</option>
      <option value="power_user">Power User</option>
      <option value="user">Benutzer</option>
    </select>
  </div>
  
  <div class="role-section">
    <h4>Funktionale Rollen</h4>
    <div class="checkbox-list">
      <label>
        <input type="checkbox" v-model="user.functional_roles" value="feedback_analyst">
        Feedback-Analyst
      </label>
      <label>
        <input type="checkbox" v-model="user.functional_roles" value="system_monitor">
        System-Monitor
      </label>
      <label>
        <input type="checkbox" v-model="user.functional_roles" value="content_manager">
        Content-Manager
      </label>
      <label>
        <input type="checkbox" v-model="user.functional_roles" value="user_manager">
        User-Manager
      </label>
      <label>
        <input type="checkbox" v-model="user.functional_roles" value="chat_moderator">
        Chat-Moderator
      </label>
    </div>
  </div>
  
  <button @click="saveUserRoles">Speichern</button>
</div>
```

## Vorteile des granularen Rollenkonzepts mit Mehrfachrollen

Das erweiterte Rollenkonzept mit Mehrfachrollen bietet mehrere Vorteile:

1. **Präzise Zugriffssteuerung**: Nutzer erhalten nur die Berechtigungen, die sie tatsächlich benötigen
2. **Flexibilität**: Kombinationsmöglichkeiten von Rollen bieten große Flexibilität
3. **Sicherheit**: Prinzip der geringsten Privilegien reduziert potenzielle Sicherheitsrisiken
4. **Übersichtlichkeit**: Klare Trennung zwischen grundlegenden und funktionalen Rollen
5. **Skalierbarkeit**: Einfache Erweiterung um neue Rollen und Berechtigungen

## Zukunftspläne

Für zukünftige Versionen sind folgende Erweiterungen des Rollenkonzepts geplant:

1. **Dynamische Rollendefin:** Möglichkeit zur Definition benutzerdefinierter Rollen mit spezifischen Berechtigungen
2. **Temporäre Rollenerhöhung**: Temporäre Vergabe erweiterter Rechte für spezifische Aufgaben
3. **Gruppenbasierte Rollen**: Zuweisung von Rollen basierend auf Benutzergruppen
4. **Kontextbasierte Berechtigungen**: Berechtigungen abhängig vom Nutzungskontext

---

Zuletzt aktualisiert: 05.05.2025