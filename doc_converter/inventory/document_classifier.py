import pandas as pd
import logging
from typing import Dict, List, Any, Optional, Tuple

class DocumentClassifier:
    """Klassifiziert und priorisiert Dokumente für die Konvertierung"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialisiert den DocumentClassifier.
        
        Args:
            config: Konfigurationswörterbuch mit Klassifizierungseinstellungen
        """
        self.logger = logging.getLogger(__name__)
        self.config = config or {}
        
        # Standard-Prioritätsmatrix, kann durch Konfiguration überschrieben werden
        self.priority_matrix = self.config.get('priority_matrix', {
            # Format: (content_category, complexity_category): priority_level
            ('Benutzerhandbuch', 'Einfach'): 1,  # Höchste Priorität
            ('Benutzerhandbuch', 'Mittel'): 1,
            ('Benutzerhandbuch', 'Komplex'): 2,
            ('FAQ', 'Einfach'): 1,
            ('FAQ', 'Mittel'): 2,
            ('FAQ', 'Komplex'): 3,
            ('Administration', 'Einfach'): 2,
            ('Administration', 'Mittel'): 3,
            ('Administration', 'Komplex'): 4,
            ('Sonstige Dokumentation', 'Einfach'): 3,
            ('Sonstige Dokumentation', 'Mittel'): 4,
            ('Sonstige Dokumentation', 'Komplex'): 5  # Niedrigste Priorität
        })
        
        # Schlüsselwörter für die Inhaltskategorisierung
        self.content_keywords = self.config.get('content_keywords', {
            'Benutzerhandbuch': ['benutzerhandbuch', 'anleitung', 'guide', 'manual', 'howto', 
                                'tutorial', 'leitfaden', 'bedienung', 'hilfe'],
            'Administration': ['admin', 'installation', 'konfiguration', 'setup', 'systemadmin', 
                             'wartung', 'deployment', 'server', 'infrastruktur'],
            'FAQ': ['faq', 'häufig', 'fragen', 'antworten', 'probleme', 'troubleshooting', 
                   'fehler', 'bekannte probleme']
        })
    
    def classify_documents(self, document_df: pd.DataFrame) -> pd.DataFrame:
        """
        Klassifiziert und priorisiert Dokumente.
        
        Args:
            document_df: DataFrame mit Dokumentenmetadaten
            
        Returns:
            DataFrame mit hinzugefügten Klassifikationen und Prioritäten
        """
        if document_df.empty:
            self.logger.warning("Leerer DataFrame übergeben, nichts zu klassifizieren")
            return document_df
        
        self.logger.info(f"Klassifiziere {len(document_df)} Dokumente")
        
        # Kopie erstellen, um Original nicht zu verändern
        df = document_df.copy()
        
        # Dokumenttyp-Klassifizierung
        df['document_category'] = df['file_type'].apply(self._categorize_document_type)
        
        # Komplexitätsklassifizierung
        df['complexity_category'] = df['complexity_score'].apply(self._categorize_complexity)
        
        # Inhaltliche Klassifizierung
        df['content_category'] = df.apply(self._categorize_content, axis=1)
        
        # Priorität zuweisen
        df['priority'] = df.apply(self._assign_priority, axis=1)
        
        # Prioritätsgruppen bilden
        df['priority_group'] = df['priority'].apply(
            lambda x: 'Gruppe 1 (Hohe Priorität)' if x <= 1 else
                     'Gruppe 2 (Mittlere Priorität)' if x <= 3 else
                     'Gruppe 3 (Niedrige Priorität)'
        )
        
        # Statistik ausgeben
        self.logger.info("Dokument-Kategorisierung:")
        for cat in sorted(df['document_category'].unique()):
            count = df[df['document_category'] == cat].shape[0]
            self.logger.info(f"  - {cat}: {count} Dokumente")
            
        self.logger.info("Inhaltskategorisierung:")
        for cat in sorted(df['content_category'].unique()):
            count = df[df['content_category'] == cat].shape[0]
            self.logger.info(f"  - {cat}: {count} Dokumente")
            
        self.logger.info("Komplexitätskategorien:")
        for cat in sorted(df['complexity_category'].unique()):
            count = df[df['complexity_category'] == cat].shape[0]
            self.logger.info(f"  - {cat}: {count} Dokumente")
            
        self.logger.info("Prioritätsgruppen:")
        for group in sorted(df['priority_group'].unique()):
            count = df[df['priority_group'] == group].shape[0]
            self.logger.info(f"  - {group}: {count} Dokumente")
        
        return df
    
    def _categorize_document_type(self, file_type: str) -> str:
        """Klassifiziert den Dokumenttyp basierend auf dem MIME-Typ"""
        if 'pdf' in file_type:
            return 'PDF'
        elif 'word' in file_type or 'openxmlformats-officedocument.wordprocessingml' in file_type:
            return 'Word'
        elif 'excel' in file_type or 'spreadsheet' in file_type or 'openxmlformats-officedocument.spreadsheetml' in file_type:
            return 'Excel'
        elif 'powerpoint' in file_type or 'presentation' in file_type or 'openxmlformats-officedocument.presentationml' in file_type:
            return 'PowerPoint'
        elif 'html' in file_type:
            return 'HTML'
        elif 'text/plain' in file_type:
            return 'Text'
        elif 'markdown' in file_type:
            return 'Markdown'
        else:
            return 'Sonstige'
    
    def _categorize_complexity(self, complexity_score: int) -> str:
        """Klassifiziert die Komplexität basierend auf dem Komplexitätsscore"""
        if complexity_score <= 2:
            return 'Einfach'
        elif complexity_score <= 4:
            return 'Mittel'
        else:
            return 'Komplex'
    
    def _categorize_content(self, row: pd.Series) -> str:
        """Klassifiziert den Inhalt basierend auf Titel, Dateiname und Pfad"""
        title = str(row.get('title', '')).lower()
        path = str(row.get('path', '')).lower()
        filename = str(row.get('filename', '')).lower()
        
        # Prüfe jede Inhaltskategorie
        for category, keywords in self.content_keywords.items():
            for keyword in keywords:
                if (keyword in title or keyword in path or keyword in filename):
                    return category
        
        # Zusätzliche spezifische nscale-Klassifikation für verbesserte Kategorisierung
        if any(term in path.lower() or term in filename.lower() 
               for term in ['nscale', 'dms', 'dokumentenmanagement']):
            
            if any(term in path.lower() or term in filename.lower() 
                  for term in ['client', 'interface', 'ui', 'oberfläche']):
                return 'Benutzerhandbuch'
                
            if any(term in path.lower() or term in filename.lower() 
                  for term in ['server', 'install', 'config']):
                return 'Administration'
        
        return 'Sonstige Dokumentation'
    
    def _assign_priority(self, row: pd.Series) -> int:
        """Weist eine Priorität basierend auf der Prioritätsmatrix zu"""
        # Erstelle den Schlüssel für die Prioritätsmatrix
        key = (row['content_category'], row['complexity_category'])
        
        # Standardpriorität 5 (niedrigste) wenn nicht in Matrix definiert
        return self.priority_matrix.get(key, 5)


if __name__ == "__main__":
    # Setup Logging
    logging.basicConfig(level=logging.INFO, 
                        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Test des Klassifizierers
    import sys
    import os
    
    # Lade Beispieldaten, falls die CSV-Datei existiert
    inventory_file = "doc_converter/data/inventory/document_inventory.csv"
    
    if os.path.exists(inventory_file):
        df = pd.read_csv(inventory_file)
        
        classifier = DocumentClassifier()
        classified_df = classifier.classify_documents(df)
        
        # Ausgabe
        print("\nKlassifizierte Dokumente:")
        print(classified_df[['filename', 'document_category', 'content_category', 
                            'complexity_category', 'priority', 'priority_group']].head())
        
        # Speichern der klassifizierten Daten
        output_file = "doc_converter/data/inventory/classified_documents.csv"
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        classified_df.to_csv(output_file, index=False)
        print(f"\nKlassifizierte Dokumente gespeichert unter: {output_file}")
    else:
        print(f"Inventardatei nicht gefunden: {inventory_file}")
        print("Bitte zuerst den DocumentScanner ausführen, um die Inventardatei zu erstellen.")
        sys.exit(1)