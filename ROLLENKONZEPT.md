# Roadmap: Erweitertes Rollenkonzept für nscale DMS Assistent

## Aktuelle Situation

Derzeit verfügt der nscale DMS Assistent über ein einfaches Rollenkonzept:
- **Benutzer**: Standardbenutzer mit Zugriff auf die grundlegenden Funktionen (Chat, Dokumentkonverter)
- **Administrator**: Vollzugriff auf alle Funktionen, einschließlich der administrativen Bereiche

## Geplante Rollenerweiterung

Für eine feingranularere Rechteverwaltung sind folgende dedizierte Rollen geplant:

### 1. Feedback-Analyst

**Beschreibung**: Zugriff auf die Feedback-Analyse, um Benutzerrückmeldungen auszuwerten und Verbesserungen vorzuschlagen

**Berechtigungen**:
- Zugriff auf den Feedback-Bereich
- Einsicht in Benutzerkommentare, Fragen und Antworten
- Export von Feedback-Daten
- Keine weiteren administrativen Rechte

**Datenschutzaspekt**: 
Diese Rolle ermöglicht einen gezielten Zugriff auf Feedback-Daten für Personen, die nicht unbedingt volle Administratorrechte benötigen, was dem Prinzip der minimalen Berechtigungen entspricht.

### 2. System-Monitor

**Beschreibung**: Überwachung der Systemleistung und Ressourcen

**Berechtigungen**:
- Zugriff auf den System-Bereich im Admin-Panel
- Einsicht in Systemstatistiken und Logs
- Keine Berechtigung für Benutzer- oder Inhaltsverwaltung

### 3. Content-Manager

**Beschreibung**: Verwaltung der Inhalte und Wissensquellen

**Berechtigungen**:
- Hinzufügen/Entfernen von Dokumenten in der Wissensdatenbank
- Zugriff auf Dokument-Konvertierungsstatistiken
- Möglichkeit zur Überprüfung der Qualität von Inhalten

### 4. User-Manager

**Beschreibung**: Verwaltung der Benutzerkonten

**Berechtigungen**:
- Benutzerkonten anlegen/bearbeiten/deaktivieren
- Passwortzurücksetzung für Benutzer
- Keine weiteren administrativen Rechte

## Mehrrollen-System

Langfristig ist ein Mehrrollen-System geplant, das es ermöglicht, Benutzern mehrere Rollen zuzuweisen. Dies bietet folgende Vorteile:

- **Flexibilität**: Benutzer können genau die Berechtigungen erhalten, die sie für ihre Aufgaben benötigen
- **Skalierbarkeit**: Mit zunehmender Teamgröße können Verantwortlichkeiten besser aufgeteilt werden
- **Sicherheit**: Verbesserter Schutz durch Beschränkung des Zugriffs auf notwendige Funktionen

## Implementierungsanmerkungen

### Datenbank-Schema

Änderungen am Benutzermodell, um mehrere Rollen zu unterstützen:
```sql
CREATE TABLE user_roles (
    user_id INTEGER NOT NULL,
    role_name TEXT NOT NULL,
    PRIMARY KEY (user_id, role_name),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Backend-Anpassungen

- Umstellung von einer einzelnen Rollenattribut auf ein Array von Rollen im Benutzermodell
- Anpassung der Autorisierungslogik, um mehrere Rollen zu berücksichtigen
- Einführung von Rollenprüfungen auf API-Ebene

### Frontend-Anpassungen

- Erweiterung des Auth-Stores für die Verwaltung mehrerer Rollen
- Anpassung der Benutzeroberfläche zur Anzeige und Verwaltung von Berechtigungen
- Überarbeitung der Navigationskomponenten, um auf Basis mehrerer Rollen zu funktionieren

## Priorisierung

1. **Phase 1**: Definition weiterer spezifischer Rollen und deren Berechtigungen
2. **Phase 2**: Implementierung des Backend-Supports für einzelne, spezifische Rollen
3. **Phase 3**: Erweiterung des Benutzerinterfaces für rollenbasierte Funktionen
4. **Phase 4**: Implementation des Mehrrollen-Systems
5. **Phase 5**: Überarbeitung des Benutzer-Managements für Administratoren

## Hinweise

- Das ursprüngliche Benutzermodell soll migrierbar sein, ohne bestehende Benutzerkonten zu beeinträchtigen
- Für die Rollenzuweisung soll eine intuitive Benutzeroberfläche entwickelt werden
- Die Berechtigungslogik sollte zentral verwaltet werden, um zukünftige Erweiterungen zu erleichtern