
import os
import pandas as pd
import logging
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

class ReportGenerator:
    """Generiert Berichte über die inventarisierten und klassifizierten Dokumente"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialisiert den ReportGenerator.
        
        Args:
            config: Konfigurationswörterbuch mit Berichtseinstellungen
        """
        self.logger = logging.getLogger(__name__)
        self.config = config or {}
        
        # Standardpfad für Berichte
        self.report_path = self.config.get('report_path', 'doc_converter/data/inventory/reports')
        os.makedirs(self.report_path, exist_ok=True)
    
    def generate_inventory_report(self, 
                                  document_df: pd.DataFrame, 
                                  report_name: Optional[str] = None) -> str:
        """
        Generiert einen Bericht über die inventarisierten und klassifizierten Dokumente.
        
        Args:
            document_df: DataFrame mit klassifizierten Dokumentenmetadaten
            report_name: Optionaler Name für den Bericht
            
        Returns:
            Pfad zum generierten Berichtverzeichnis
        """
        if document_df.empty:
            self.logger.warning("Leerer DataFrame übergeben, kein Bericht generiert")
            return ""
        
        # Erstelle Berichtsverzeichnis mit Zeitstempel
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_name = report_name or f"doku_inventar_{timestamp}"
        report_dir = os.path.join(self.report_path, report_name)
        os.makedirs(report_dir, exist_ok=True)
        
        self.logger.info(f"Generiere Bericht in: {report_dir}")
        
        # 1. Excel-Report erstellen
        self._generate_excel_report(document_df, report_dir)
        
        # 2. JSON-Report erstellen
        self._generate_json_report(document_df, report_dir)
        
        # 3. Markdownbericht erstellen
        self._generate_markdown_report(document_df, report_dir)
        
        # 4. Visualisierungen erstellen
        self._generate_visualizations(document_df, report_dir)
        
        self.logger.info(f"Bericht erfolgreich generiert: {report_dir}")
        return report_dir
    
    def _generate_excel_report(self, df: pd.DataFrame, report_dir: str) -> None:
        """Erstellt einen detaillierten Excel-Bericht"""
        excel_path = os.path.join(report_dir, "dokument_inventar.xlsx")
        
        with pd.ExcelWriter(excel_path) as writer:
            # Haupttabelle mit allen Dokumenten
            df.to_excel(writer, sheet_name='Alle Dokumente', index=False)
            
            # Zusammenfassung nach Dokumenttyp
            doc_type_summary = pd.DataFrame({
                'Dokumenttyp': df['document_category'].value_counts().index,
                'Anzahl': df['document_category'].value_counts().values
            })
            doc_type_summary.to_excel(writer, sheet_name='Nach Dokumenttyp', index=False)
            
            # Zusammenfassung nach Inhaltskategorie
            content_summary = pd.DataFrame({
                'Inhaltskategorie': df['content_category'].value_counts().index,
                'Anzahl': df['content_category'].value_counts().values
            })
            content_summary.to_excel(writer, sheet_name='Nach Inhalt', index=False)
            
            # Zusammenfassung nach Komplexität
            complexity_summary = pd.DataFrame({
                'Komplexität': df['complexity_category'].value_counts().index,
                'Anzahl': df['complexity_category'].value_counts().values
            })
            complexity_summary.to_excel(writer, sheet_name='Nach Komplexität', index=False)
            
            # Zusammenfassung nach Prioritätsgruppe
            priority_summary = pd.DataFrame({
                'Prioritätsgruppe': df['priority_group'].value_counts().index,
                'Anzahl': df['priority_group'].value_counts().values
            })
            priority_summary.to_excel(writer, sheet_name='Nach Priorität', index=False)
            
            # Dokumentenliste je Prioritätsgruppe
            for group in sorted(df['priority_group'].unique()):
                group_docs = df[df['priority_group'] == group]
                group_docs = group_docs[['filename', 'document_category', 'content_category', 
                                        'complexity_category', 'size_kb', 'pages']]
                sheet_name = f"Gruppe {group[7]}"  # Extrahiere Gruppennummer
                group_docs.to_excel(writer, sheet_name=sheet_name, index=False)
        
        self.logger.info(f"Excel-Bericht erstellt: {excel_path}")
    
    def _generate_json_report(self, df: pd.DataFrame, report_dir: str) -> None:
        """Erstellt einen JSON-Bericht zur programmatischen Weiterverarbeitung"""
        json_path = os.path.join(report_dir, "dokument_inventar.json")
        
        # Zusammenfassung erstellen
        summary = {
            "total_documents": len(df),
            "document_types": df['document_category'].value_counts().to_dict(),
            "content_categories": df['content_category'].value_counts().to_dict(),
            "complexity_categories": df['complexity_category'].value_counts().to_dict(),
            "priority_groups": df['priority_group'].value_counts().to_dict(),
            "total_pages": int(df['pages'].sum()),
            "total_size_kb": int(df['size_kb'].sum()),
            "documents": []
        }
        
        # Dokumentenliste für die JSON-Ausgabe
        doc_list = []
        for _, row in df.iterrows():
            doc_data = {
                "filename": row['filename'],
                "path": row['path'],
                "title": row['title'],
                "file_type": row['file_type'],
                "document_category": row['document_category'],
                "content_category": row['content_category'],
                "complexity_category": row['complexity_category'],
                "priority": int(row['priority']),
                "priority_group": row['priority_group'],
                "size_kb": float(row['size_kb']),
                "pages": int(row['pages']) if not pd.isna(row['pages']) else 0,
                "has_tables": bool(row['has_tables']) if 'has_tables' in row else False,
                "has_images": bool(row['has_images']) if 'has_images' in row else False
            }
            doc_list.append(doc_data)
        
        summary["documents"] = doc_list
        
        # JSON speichern
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        
        self.logger.info(f"JSON-Bericht erstellt: {json_path}")
    
    def _generate_markdown_report(self, df: pd.DataFrame, report_dir: str) -> None:
        """Erstellt einen Markdown-Bericht für die Anzeige in GitHub oder anderen Markdown-Readern"""
        md_path = os.path.join(report_dir, "README.md")
        
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write("# Dokumentenbestand für nscale DMS Assistent\n\n")
            f.write(f"*Bericht erstellt am: {datetime.now().strftime('%d.%m.%Y um %H:%M:%S')}*\n\n")
            
            f.write("## Zusammenfassung\n\n")
            f.write(f"- **Gesamtanzahl Dokumente:** {len(df)}\n")
            f.write(f"- **Gesamtseitenzahl:** {int(df['pages'].sum())}\n")
            f.write(f"- **Gesamtgröße:** {int(df['size_kb'].sum() / 1024):.2f} MB\n\n")
            
            f.write("## Aufschlüsselung nach Dokumenttyp\n\n")
            f.write("| Dokumenttyp | Anzahl | Prozent |\n")
            f.write("|------------|--------|---------|\n")
            doc_type_counts = df['document_category'].value_counts()
            for doc_type, count in doc_type_counts.items():
                percent = count / len(df) * 100
                f.write(f"| {doc_type} | {count} | {percent:.1f}% |\n")
            
            f.write("\n## Aufschlüsselung nach Inhaltskategorie\n\n")
            f.write("| Inhaltskategorie | Anzahl | Prozent |\n")
            f.write("|------------------|--------|---------|\n")
            content_counts = df['content_category'].value_counts()
            for content, count in content_counts.items():
                percent = count / len(df) * 100
                f.write(f"| {content} | {count} | {percent:.1f}% |\n")
            
            f.write("\n## Aufschlüsselung nach Komplexität\n\n")
            f.write("| Komplexität | Anzahl | Prozent |\n")
            f.write("|-------------|--------|---------|\n")
            complexity_counts = df['complexity_category'].value_counts()
            for complexity, count in complexity_counts.items():
                percent = count / len(df) * 100
                f.write(f"| {complexity} | {count} | {percent:.1f}% |\n")
            
            f.write("\n## Aufschlüsselung nach Prioritätsgruppe\n\n")
            f.write("| Prioritätsgruppe | Anzahl | Prozent |\n")
            f.write("|------------------|--------|---------|\n")
            priority_counts = df['priority_group'].value_counts()
            for priority, count in priority_counts.items():
                percent = count / len(df) * 100
                f.write(f"| {priority} | {count} | {percent:.1f}% |\n")
            
            f.write("\n## Dokumente mit hoher Priorität (Gruppe 1)\n\n")
            high_priority = df[df['priority_group'] == 'Gruppe 1 (Hohe Priorität)']
            f.write("| Dateiname | Dokumenttyp | Inhaltskategorie | Komplexität |\n")
            f.write("|-----------|-------------|------------------|-------------|\n")
            for _, row in high_priority.iterrows():
                f.write(f"| {row['filename']} | {row['document_category']} | {row['content_category']} | {row['complexity_category']} |\n")
            
            f.write("\n## Nächste Schritte\n\n")
            f.write("1. **Konvertierung der Dokumente mit hoher Priorität (Gruppe 1)**\n")
            f.write("2. **Überprüfung der Konvertierungsqualität**\n")
            f.write("3. **Konvertierung der Dokumente mit mittlerer Priorität (Gruppe 2)**\n")
            f.write("4. **Konvertierung der Dokumente mit niedriger Priorität (Gruppe 3)**\n")
        
        self.logger.info(f"Markdown-Bericht erstellt: {md_path}")
    
    def _generate_visualizations(self, df: pd.DataFrame, report_dir: str) -> None:
        """Erstellt Visualisierungen für den Bericht"""
        vis_dir = os.path.join(report_dir, "visualizations")
        os.makedirs(vis_dir, exist_ok=True)
        
        # Verwende einen stilisierten Look für die Plots
        sns.set_style("whitegrid")
        plt.rcParams.update({'font.size': 12})
        
        # 1. Dokumenttypen-Verteilung
        plt.figure(figsize=(10, 6))
        doc_count = df['document_category'].value_counts()
        ax = sns.barplot(x=doc_count.index, y=doc_count.values, palette="viridis")
        plt.title('Verteilung nach Dokumenttyp')
        plt.xlabel('Dokumenttyp')
        plt.ylabel('Anzahl')
        plt.xticks(rotation=45)
        plt.tight_layout()
        for i, count in enumerate(doc_count.values):
            ax.text(i, count + 0.1, str(count), ha='center')
        plt.savefig(os.path.join(vis_dir, "dokumenttypen.png"), dpi=300)
        plt.close()
        
        # 2. Inhaltskategorien-Verteilung
        plt.figure(figsize=(10, 6))
        content_count = df['content_category'].value_counts()
        ax = sns.barplot(x=content_count.index, y=content_count.values, palette="muted")
        plt.title('Verteilung nach Inhaltskategorie')
        plt.xlabel('Inhaltskategorie')
        plt.ylabel('Anzahl')
        plt.xticks(rotation=45)
        plt.tight_layout()
        for i, count in enumerate(content_count.values):
            ax.text(i, count + 0.1, str(count), ha='center')
        plt.savefig(os.path.join(vis_dir, "inhaltskategorien.png"), dpi=300)
        plt.close()
        
        # 3. Komplexitäts-Verteilung
        plt.figure(figsize=(8, 6))
        complexity_count = df['complexity_category'].value_counts().reindex(['Einfach', 'Mittel', 'Komplex'])
        ax = sns.barplot(x=complexity_count.index, y=complexity_count.values, palette="YlOrRd")
        plt.title('Verteilung nach Komplexität')
        plt.xlabel('Komplexität')
        plt.ylabel('Anzahl')
        plt.tight_layout()
        for i, count in enumerate(complexity_count.values):
            ax.text(i, count + 0.1, str(count), ha='center')
        plt.savefig(os.path.join(vis_dir, "komplexitaet.png"), dpi=300)
        plt.close()
        
        # 4. Prioritätsgruppen-Verteilung
        plt.figure(figsize=(10, 6))
        priority_count = df['priority_group'].value_counts().sort_index(
            key=lambda x: x.map({
                'Gruppe 1 (Hohe Priorität)': 1,
                'Gruppe 2 (Mittlere Priorität)': 2, 
                'Gruppe 3 (Niedrige Priorität)': 3
            })
        )
        ax = sns.barplot(x=priority_count.index, y=priority_count.values, palette="Blues_r")
        plt.title('Verteilung nach Prioritätsgruppe')
        plt.xlabel('Prioritätsgruppe')
        plt.ylabel('Anzahl')
        plt.xticks(rotation=45)
        plt.tight_layout()
        for i, count in enumerate(priority_count.values):
            ax.text(i, count + 0.1, str(count), ha='center')
        plt.savefig(os.path.join(vis_dir, "prioritaetsgruppen.png"), dpi=300)
        plt.close()
        
        # 5. Kreuztabelle: Dokumenttyp vs. Komplexität
        plt.figure(figsize=(12, 8))
        cross_tab = pd.crosstab(df['document_category'], df['complexity_category'])
        cross_tab = cross_tab.reindex(columns=['Einfach', 'Mittel', 'Komplex'])
        ax = cross_tab.plot(kind='bar', stacked=True, colormap='viridis')
        plt.title('Dokumenttyp vs. Komplexität')
        plt.xlabel('Dokumenttyp')
        plt.ylabel('Anzahl')
        plt.xticks(rotation=45)
        plt.legend(title='Komplexität')
        plt.tight_layout()
        plt.savefig(os.path.join(vis_dir, "dokumenttyp_vs_komplexitaet.png"), dpi=300)
        plt.close()
        
        # 6. Kreuztabelle: Inhalt vs. Priorität
        plt.figure(figsize=(12, 8))
        content_priority = pd.crosstab(df['content_category'], df['priority_group'])
        # Sortiere die Prioritätsgruppen
        priority_order = ['Gruppe 1 (Hohe Priorität)', 'Gruppe 2 (Mittlere Priorität)', 'Gruppe 3 (Niedrige Priorität)']
        content_priority = content_priority.reindex(columns=priority_order)
        ax = content_priority.plot(kind='bar', stacked=True, colormap='Blues')
        plt.title('Inhaltskategorie vs. Prioritätsgruppe')
        plt.xlabel('Inhaltskategorie')
        plt.ylabel('Anzahl')
        plt.xticks(rotation=45)
        plt.legend(title='Prioritätsgruppe')
        plt.tight_layout()
        plt.savefig(os.path.join(vis_dir, "inhalt_vs_prioritaet.png"), dpi=300)
        plt.close()
        
        self.logger.info(f"Visualisierungen erstellt im Verzeichnis: {vis_dir}")


if __name__ == "__main__":
    # Setup Logging
    logging.basicConfig(level=logging.INFO, 
                        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Test des ReportGenerator
    import sys
    
    # Lade Beispieldaten, falls die CSV-Datei existiert
    classified_file = "doc_converter/data/inventory/classified_documents.csv"
    
    if os.path.exists(classified_file):
        df = pd.read_csv(classified_file)
        
        report_gen = ReportGenerator()
        report_dir = report_gen.generate_inventory_report(df, "beispiel_bericht")
        
        print(f"\nBericht wurde erstellt in: {report_dir}")
        print("Öffnen Sie die README.md oder dokument_inventar.xlsx für Details.")
    else:
        print(f"Klassifizierte Dokumentendatei nicht gefunden: {classified_file}")
        print("Bitte zuerst den DocumentScanner und DocumentClassifier ausführen.")
        sys.exit(1)