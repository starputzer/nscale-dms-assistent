# Roadmap: nscale DMS Assistent

Diese Roadmap gibt einen Überblick über den aktuellen Entwicklungsstand und die geplanten Features des nscale DMS Assistenten.

## Aktuelle Situation

### Frontend-Strategie Änderung
Die Anwendung durchläuft eine wichtige Neuausrichtung bei der UI-Entwicklung:

- [x] **Vue.js-Migration gestartet** (AUFGEGEBEN)
  - [x] Feature-Toggle-Mechanismus implementiert
  - [x] Dokumentenkonverter als Vue.js-Komponente implementiert
  - [x] Admin-Bereich teilweise als Vue.js-Komponenten umgesetzt
  - [x] Umfangreiche Fallback-Mechanismen implementiert

- [ ] **Zurück zur HTML/CSS/JS-Implementierung** (ABGESCHLOSSEN)
  - [x] Wiederherstellung der stabilen HTML/CSS/JS-basierten Oberfläche
  - [x] Entfernung der fehlerhaften Vue.js-Komponenten
  - [x] Optimierung der bestehenden UI für maximale Robustheit

- [ ] **React-Migration starten** (AKTUELLER FOKUS)
  - [ ] Projektstruktur für React-Integration vorbereiten
  - [ ] Erste React-Komponenten entwickeln (Dokumentenkonverter)
  - [ ] Build-Prozess für React-Komponenten einrichten
  - [ ] Nahtlose Integration in bestehende Architektur
  - [ ] Feature-Toggle-System für React-Komponenten anpassen

### Gründe für die Aufgabe der Vue.js-Migration

Die Vue.js-Migration wurde aus folgenden Gründen aufgegeben:

1. **Persistente 404-Fehler**:
   - Trotz verschiedenster Lösungsansätze waren 404-Fehler für statische Ressourcen ein konstantes Problem
   - Selbst mit Multipath-Strategien und Fallback-Mechanismen traten immer wieder Pfadprobleme auf

2. **Komplexe DOM-Manipulation**:
   - Konflikte zwischen Vue.js-Rendering und direkter DOM-Manipulation
   - Endlosschleifen in den Initialisierungsprozessen der Vue-Komponenten
   - Schwer zu behebende Timing-Probleme zwischen UI-Frameworks

3. **Unvorhersehbares Rendering-Verhalten**:
   - Inkonsistentes Layout und Verhalten zwischen klassischen und Vue.js-Komponenten
   - Probleme mit der dynamischen Einbindung von Vue-Komponenten in bestehende Strukturen

4. **Steigende technische Schulden**:
   - Zunehmende Komplexität der Workarounds und Lösungsansätze
   - Nicht nachhaltige Architekturentscheidungen für langfristige Wartbarkeit

### Rollenkonzept

Das erweiterte Rollenkonzept wird in mehreren Phasen implementiert:

- [x] **Phase 1**: Definition weiterer spezifischer Rollen und deren Berechtigungen (ABGESCHLOSSEN)
- [ ] **Phase 2**: Implementierung des Backend-Supports für einzelne, spezifische Rollen
- [ ] **Phase 3**: Erweiterung des Benutzerinterfaces für rollenbasierte Funktionen
- [ ] **Phase 4**: Implementation des Mehrrollen-Systems
- [ ] **Phase 5**: Überarbeitung des Benutzer-Managements für Administratoren

### Dokumentenkonverter

- [x] **Robuste Basisimplementierung**: Der Dokumentenkonverter wurde als stabile HTML/CSS/JS-Komponente implementiert (ABGESCHLOSSEN)
- [x] **Fallback-Mechanismen**: Mehrschichtige Fallback-Mechanismen für maximale Robustheit (ABGESCHLOSSEN)
- [x] **Fehlerbehandlung**: Verbesserte Fehlerbehandlung und Diagnose (ABGESCHLOSSEN)
- [ ] **React-Version entwickeln**: Implementierung des Dokumentenkonverters als React-Komponente (AKTUELLER FOKUS)
- [ ] **Verbesserter PDF-Parser**: Bessere Erkennung von Tabellen und Strukturen in PDFs
- [ ] **Batch-Konvertierung**: Möglichkeit, mehrere Dokumente gleichzeitig zu konvertieren

## Geplante Features

### 1. React-Integration (Q3 2025)

- [ ] **Entwicklungsumgebung einrichten**: Setup für React mit TypeScript
- [ ] **Komponenten-Bibliothek erstellen**: Grundlegende UI-Komponenten in React
- [ ] **Zustandsverwaltung implementieren**: Effiziente Zustandsverwaltung mit Redux oder Context API
- [ ] **Admin-Bereich migrieren**: Schrittweise Migration des Admin-Bereichs zu React
- [ ] **Chat-Interface migrieren**: Neuimplementierung des Chat-Interfaces mit React

### 2. Verbesserte RAG-Engine (Q3 2025)

- [ ] **Vektorindexierung optimieren**: Schnellere Suche durch verbesserte Indexierung
- [ ] **Hybridsuche implementieren**: Kombination aus Vektorsuche und traditioneller Volltextsuche
- [ ] **Kontext-Chunking überarbeiten**: Verbesserte Aufteilung der Dokumente für präzisere Antworten
- [ ] **Multi-Vektor-Retrieval**: Verschiedene Embedding-Modelle für unterschiedliche Dokumenttypen

### 3. Benutzererfahrung (Q3-Q4 2025)

- [ ] **Redesign der Chat-Oberfläche**: Moderneres und intuitiveres Design mit React-Komponenten
- [ ] **Mobile Optimierung**: Verbesserte Nutzererfahrung auf Mobilgeräten
- [ ] **Sprachsteuerung**: Möglichkeit, per Spracheingabe mit dem Assistenten zu interagieren
- [ ] **Personalisierte Benutzereinstellungen**: Anpassbare Themen, Schriftgrößen und Layouts

### 4. Erweiterung der Wissensbasis (fortlaufend)

- [ ] **Automatische Aktualisierung der Wissensbasis**: Regelmäßige Updates der Dokumentation
- [ ] **Priorisierung relevanter Quellen**: Intelligente Gewichtung von Dokumenten nach Relevanz
- [ ] **Erkennung veralteter Informationen**: Warnung, wenn Informationen möglicherweise veraltet sind
- [ ] **Community-Wissen integrieren**: Einbindung von Forendiskussionen und Benutzerhandbüchern

### 5. Integration in die nscale Umgebung (Q4 2025)

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
- [ ] **Bereinigung des Code-Repositories**: Entfernung aller Überreste der Vue.js-Migration

## Erkenntnisse aus der gescheiterten Vue.js-Migration

Die folgenden Lehren wurden aus dem Scheitern der Vue.js-Migration gezogen:

1. **Framework-Entscheidungen frühzeitig treffen**: Klare Entscheidung für ein primäres UI-Framework
2. **Vermeidung von Framework-Hybridansätzen**: Komplexität von parallelen Framework-Implementierungen unterschätzt
3. **Konsequente Pfadstrategie**: Einheitliche Pfadstrategie für Assets von Anfang an implementieren
4. **Inkrementelle Migration bevorzugen**: Klare, isolierte Komponenten zuerst migrieren
5. **React als bessere Alternative**: Bessere TypeScript-Integration und weniger DOM-Manipulationsprobleme mit React

## Hinweise

- Die Roadmap wird regelmäßig aktualisiert, um den aktuellen Entwicklungsstand und neue Prioritäten zu reflektieren.
- Die Zeitpläne sind vorläufig und können sich je nach Ressourcenverfügbarkeit und Prioritätsänderungen verschieben.

---

Zuletzt aktualisiert: 05.05.2025