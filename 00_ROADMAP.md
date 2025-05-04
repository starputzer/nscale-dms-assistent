# Roadmap: nscale DMS Assistent

Diese Roadmap gibt einen Überblick über den aktuellen Entwicklungsstand und die geplanten Features des nscale DMS Assistenten.

## Aktueller Stand

### Vue.js Migration
Die Umstellung der Benutzeroberfläche auf Vue.js ist in vollem Gange. Hier ist der aktuelle Fortschritt:

- [x] **Feature-Toggle-Mechanismus verbessern** (HOCH)
- [x] **Dokumentenkonverter-Integration anpassen** (HOCH)
- [x] **Server-Routen für die Vue.js-App einrichten** (MITTEL)
- [x] **Admin-Bereich vollständig implementieren** (HOCH)
  - [x] Feedback-Verwaltung implementieren
  - [x] MOTD-Verwaltung implementieren
  - [x] Benutzerverwaltung implementieren
  - [x] System-Monitoring implementieren
- [ ] **Kommunikation zwischen alter und neuer UI implementieren** (MITTEL)
- [ ] **ChatView.vue Komponente entwickeln** (HOCH)
- [ ] **MessageList.vue und MessageItem.vue Komponenten erstellen** (HOCH)
- [ ] **SessionList.vue und SessionItem.vue Komponenten erstellen** (MITTEL)
- [ ] **chatStore.js und sessionStore.js implementieren** (HOCH)
- [ ] **Settings-Bereich implementieren** (MITTEL)

### Rollenkonzept

Das erweiterte Rollenkonzept wird in mehreren Phasen implementiert:

- [x] **Phase 1**: Definition weiterer spezifischer Rollen und deren Berechtigungen
- [ ] **Phase 2**: Implementierung des Backend-Supports für einzelne, spezifische Rollen
- [ ] **Phase 3**: Erweiterung des Benutzerinterfaces für rollenbasierte Funktionen
- [ ] **Phase 4**: Implementation des Mehrrollen-Systems
- [ ] **Phase 5**: Überarbeitung des Benutzer-Managements für Administratoren

Die geplanten Rollen umfassen:
- **Feedback-Analyst**: Zugriff auf die Feedback-Analyse
- **System-Monitor**: Überwachung der Systemleistung
- **Content-Manager**: Verwaltung der Inhalte und Wissensquellen
- **User-Manager**: Verwaltung der Benutzerkonten

### Dokumentenkonverter

- [x] **Integration mit Vue.js**: Der Dokumentenkonverter wurde erfolgreich als Vue.js-Komponente integriert
- [x] **Feature-Toggle-Mechanismus**: Es wurde ein Umschalter zwischen klassischer und Vue.js-Implementierung hinzugefügt
- [x] **Fehlerbehebung bei der Integration**: Die Probleme mit endlosen Ladeanimationen wurden behoben
- [ ] **Verbesserter PDF-Parser**: Bessere Erkennung von Tabellen und Strukturen in PDFs
- [ ] **Batch-Konvertierung**: Möglichkeit, mehrere Dokumente gleichzeitig zu konvertieren
- [ ] **Fortschrittsanzeige mit Prozentangabe**: Genauere Anzeige des Konvertierungsfortschritts
- [ ] **Erweiterung unterstützter Formate**: Unterstützung für weitere Dokumentformate

## Geplante Features

### 1. Verbesserte RAG-Engine (Q3 2025)

- [ ] **Vektorindexierung optimieren**: Schnellere Suche durch verbesserte Indexierung
- [ ] **Hybridsuche implementieren**: Kombination aus Vektorsuche und traditioneller Volltextsuche
- [ ] **Kontext-Chunking überarbeiten**: Verbesserte Aufteilung der Dokumente für präzisere Antworten
- [ ] **Multi-Vektor-Retrieval**: Verschiedene Embedding-Modelle für unterschiedliche Dokumenttypen

### 2. Benutzererfahrung (Q3-Q4 2025)

- [ ] **Redesign der Chat-Oberfläche**: Moderneres und intuitiveres Design
- [ ] **Mobile Optimierung**: Verbesserte Nutzererfahrung auf Mobilgeräten
- [ ] **Sprachsteuerung**: Möglichkeit, per Spracheingabe mit dem Assistenten zu interagieren
- [ ] **Personalisierte Benutzereinstellungen**: Anpassbare Themen, Schriftgrößen und Layouts

### 3. Erweiterung der Wissensbasis (fortlaufend)

- [ ] **Automatische Aktualisierung der Wissensbasis**: Regelmäßige Updates der Dokumentation
- [ ] **Priorisierung relevanter Quellen**: Intelligente Gewichtung von Dokumenten nach Relevanz
- [ ] **Erkennung veralteter Informationen**: Warnung, wenn Informationen möglicherweise veraltet sind
- [ ] **Community-Wissen integrieren**: Einbindung von Forendiskussionen und Benutzerhandbüchern

### 4. Integration in die nscale Umgebung (Q4 2025)

- [ ] **Direkte Aktionen in nscale**: Möglichkeit, Aktionen direkt aus dem Chat heraus auszuführen
- [ ] **Contextual Help**: Kontextbezogene Hilfe basierend auf der aktuellen Ansicht in nscale
- [ ] **Workflow-Unterstützung**: Schritt-für-Schritt-Anleitungen für komplexe Prozesse
- [ ] **Single Sign-On**: Nahtlose Integration in das nscale Authentifizierungssystem

## Technische Schulden

Die folgenden Punkte wurden als technische Schulden identifiziert, die in zukünftigen Releases behoben werden sollten:

- [ ] **Refactoring der API-Endpunkte**: Vereinheitlichung der API-Strukturen
- [ ] **Test-Coverage erhöhen**: Erweiterung der automatisierten Tests
- [ ] **Optimierung der Datenbankabfragen**: Verbesserung der Effizienz bei häufigen Abfragen
- [ ] **Dokumentation aktualisieren**: Vollständige Dokumentation aller Komponenten und APIs

## Hinweise

- Die Roadmap wird regelmäßig aktualisiert, um den aktuellen Entwicklungsstand und neue Prioritäten zu reflektieren.
- Die Zeitpläne sind vorläufig und können sich je nach Ressourcenverfügbarkeit und Prioritätsänderungen verschieben.
- Feedback und Vorschläge zur Roadmap sind willkommen und werden bei zukünftigen Updates berücksichtigt.

---

Zuletzt aktualisiert: 05.05.2025