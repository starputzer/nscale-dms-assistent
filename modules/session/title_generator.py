import re
from typing import List, Optional

class SessionTitleGenerator:
    """Generiert automatisch prägnante Titel für Chat-Sessions basierend auf dem Inhalt der ersten Nachricht"""
    
    @staticmethod
    def generate_title(message: str, max_length: int = 30) -> str:
        """
        Generiert einen prägnanten Titel aus einer Nachricht.
        
        Args:
            message: Die Nachricht, aus der der Titel generiert werden soll
            max_length: Maximale Länge des Titels
            
        Returns:
            Ein prägnanter Titel
        """
        if not message or len(message.strip()) == 0:
            return "Neue Unterhaltung"
        
        # Entfernen von Sonderzeichen und bereinigen der Nachricht
        clean_message = message.strip()
        
        # DMS-spezifische Fachbegriffe für bessere Titelerkennung
        dms_key_terms = {
            # Dokumenten-bezogene Begriffe
            "akte": "Akten",
            "dokument": "Dokumente",
            "datei": "Dateien",
            "archiv": "Archivierung",
            "scannen": "Scanvorgang",
            "digitalisier": "Digitalisierung",
            
            # Prozess-bezogene Begriffe
            "workflow": "Workflow",
            "geschäftsgang": "Geschäftsgang",
            "prozess": "Prozesse",
            "vorgang": "Vorgänge",
            
            # Technische Begriffe
            "benutzer": "Benutzerverwaltung",
            "berechtigung": "Berechtigungen",
            "zugriffsrecht": "Zugriffsrechte",
            "konfiguration": "Konfiguration",
            "einstellung": "Einstellungen",
            
            # Nscale-spezifische Begriffe
            "nscale": "nscale",
            "dms": "DMS",
            "client": "nscale Client",
            "server": "nscale Server",
            "web client": "Web Client",
            "export": "Export",
            "import": "Import",
            "vorlagen": "Vorlagen",
            "suche": "Suche",
            "template": "Templates",
            "objektreferenz": "Objektreferenzen",
            "indexdaten": "Indexdaten",
            
            # Formate
            "pdf": "PDF-Dokumente",
            "excel": "Excel-Dateien",
            "word": "Word-Dokumente",
            "email": "E-Mail-Verarbeitung",
            "outlook": "Outlook-Integration"
        }
        
        lowercase_message = clean_message.lower()
        
        # DEBUG-AUSGABE
        print(f"Title Generator: Originalfrage: '{message}'")
        
        # 1. Domänenspezifische Muster erkennen
        # Diese Muster sind spezifisch für nscale-DMS-Fragen
        dms_patterns = [
            # Wie tue ich X mit nscale/DMS?
            (r'wie\s+(?:kann|muss|soll|könnte|müsste|sollte)\s+(?:ich|man)\s+(.+?)\s+(?:in|mit|bei)\s+(?:nscale|dms)(?:\?|$)', 
             lambda m: f"nscale: {m.group(1).strip().title()}"),
            
            # nscale-spezifische Komponente X
            (r'(?:was\s+ist|wie\s+funktioniert)\s+(?:der|die|das)?\s*(?:nscale\s+)?([a-zA-Z\s\-]+?)(?:\s+in\s+nscale|\s+von\s+nscale|\?|$)',
             lambda m: f"nscale {m.group(1).strip().title()}"),
            
            # Frage zu spezifischer Funktion
            (r'(?:wie|wo|wann|warum)\s+(.+?)\s+(?:dokumente|akten|dateien|vorgänge)(?:\?|$)',
             lambda m: f"Dokumente: {m.group(1).strip().title()}")
        ]
        
        for pattern, title_formatter in dms_patterns:
            match = re.search(pattern, lowercase_message)
            if match:
                title = title_formatter(match)
                # Kürze Titel auf maximale Länge
                if len(title) > max_length:
                    title = title[:max_length-3] + "..."
                
                print(f"Title Generator: DMS-Muster erkannt - Titel: '{title}'")
                return title
        
        # 2. Direkte "Was ist X" Matcher für DMS-Begriffe 
        what_is_pattern = r'was ist (?:ein(?:e)? )?([a-zA-Z\-\s]+?)(?:\?|$|\s+in)'
        what_is_match = re.search(what_is_pattern, lowercase_message)
        if what_is_match:
            term = what_is_match.group(1).strip()
            # Prüfe, ob es sich um einen DMS-Fachbegriff handelt
            for key_term, title_term in dms_key_terms.items():
                if key_term in term:
                    title = f"{title_term} erklärt"
                    if len(title) > max_length:
                        title = title[:max_length-3] + "..."
                    print(f"Title Generator: Fachbegriff-Erklärung erkannt: {title}")
                    return title
            
            # Generischer "Was ist X"-Titel
            subject = term.title()
            title = f"{subject} Erklärung"
            if len(title) > max_length:
                title = title[:max_length-3] + "..."
            print(f"Title Generator: Was ist-Frage erkannt: {title}")
            return title
            
        # 3. Präzisere Fragemuster
        question_patterns = [
            # Wie kann/muss/soll ich X tun/machen
            (r'wie\s+(?:kann|muss|soll|könnte|müsste|sollte)\s+(?:ich|man)\s+(.+?)(?:\s+tun|\s+machen)?(?:\?|$)', 
             lambda m: f"{m.group(1).strip().title()} Anleitung"),
            
            # Wie funktioniert X
            (r'wie\s+funktioniert\s+(.+?)(?:\?|$)', 
             lambda m: f"{m.group(1).strip().title()} Erklärung"),
             
            # Wo finde ich X
            (r'wo\s+(?:finde|gibt|bekomme)\s+(?:ich|man)\s+(.+?)(?:\?|$)', 
             lambda m: f"{m.group(1).strip().title()} finden"),
             
            # Wann wird/ist X
            (r'wann\s+(?:wird|ist|soll|kann|muss)\s+(.+?)(?:\?|$)', 
             lambda m: f"{m.group(1).strip().title()} Zeitpunkt"),
             
            # Was bedeutet X
            (r'was\s+bedeutet\s+(.+?)(?:\?|$)', 
             lambda m: f"{m.group(1).strip().title()} Bedeutung"),
             
            # Wie erstelle ich X
            (r'wie\s+(?:erstelle|erzeuge|generiere|kreiere)\s+(?:ich|man)\s+(?:ein(?:e)?\s+)?(.+?)(?:\?|$)', 
             lambda m: f"{m.group(1).strip().title()} erstellen"),
             
            # Wie lösche ich X
            (r'wie\s+(?:lösche|entferne|vernichte)\s+(?:ich|man)\s+(?:ein(?:e)?\s+)?(.+?)(?:\?|$)', 
             lambda m: f"{m.group(1).strip().title()} löschen"),
             
            # Problem/Fehler mit X
            (r'(?:problem|fehler|issue|bug)\s+(?:mit|bei)\s+(.+?)(?:\?|$)', 
             lambda m: f"{m.group(1).strip().title()} Problem"),
             
            # Welche X gibt es
            (r'welche\s+(.+?)\s+gibt\s+es', 
             lambda m: f"{m.group(1).strip().title()} Übersicht"),
             
            # Allgemeines "Wie X" Muster (als Fallback)
            (r'wie\s+(.+?)(?:\?|$)',
             lambda m: f"{m.group(1).strip().title()}"),
        ]
        
        for pattern, title_formatter in question_patterns:
            match = re.search(pattern, lowercase_message)
            if match:
                title = title_formatter(match)
                # Kürze Titel auf maximale Länge
                if len(title) > max_length:
                    title = title[:max_length-3] + "..."
                
                print(f"Title Generator: Fragemuster erkannt - Titel: '{title}'")
                return title
        
        # 4. Erkennung von DMS-Fachbegriffen im Text
        for term, title in dms_key_terms.items():
            if term.lower() in lowercase_message:
                # Erstelle einen Titel basierend auf dem erkannten Fachbegriff
                prefix = ""
                # Bestimme dynamisch ein passendes Präfix
                if "wie" in lowercase_message[:15]:  # Prüft nur am Anfang der Nachricht
                    prefix = "Anleitung: "
                elif "was" in lowercase_message[:15]:
                    prefix = ""
                elif "problem" in lowercase_message or "fehler" in lowercase_message:
                    prefix = "Problem: "
                
                full_title = f"{prefix}{title}"
                if len(full_title) > max_length:
                    full_title = full_title[:max_length-3] + "..."
                    
                print(f"Title Generator: Fachbegriff '{term}' erkannt - Titel: '{full_title}'")
                return full_title
        
        # 5. Entferne typische Fragewort-Präfixe für bessere Titelextraktion
        question_prefixes = [
            r'^(wie|was|warum|weshalb|wann|wozu|wo|welche[rsm]?|wer|gibt es|kann ich|können wir|ist es möglich) ',
            r'^(ich möchte|möchte ich|ich will|will ich|ich brauche|brauche ich) ',
            r'^(bitte zeig|zeig mir|zeige mir|erkläre|erklär mir|hilf mir|helfen sie) ',
            r'^(hat jemand|kennt jemand|weiß jemand|kann mir jemand sagen|kann mir jemand erklären) '
        ]
        
        cleaned_text = lowercase_message
        for prefix_pattern in question_prefixes:
            cleaned_text = re.sub(prefix_pattern, '', cleaned_text, flags=re.IGNORECASE)
        
        # Entferne noch weitere Füllworte für klarere Titel
        filler_words = [
            r'\b(und|oder|aber|denn|weil|wenn|als|wie|dass|ob|bitte|einfach)\b',
            r'\b(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)\b',
            r'\b(mir|dir|uns|euch|ihnen|ihn|sie|es|man)\b',
            r'\b(mal|doch|noch|schon|ja|nein|vielleicht|eigentlich)\b',
            r'\b(ist|sind|war|waren|wird|werden|kann|können|muss|müssen|darf|dürfen|soll|sollen)\b'
        ]
        
        for filler in filler_words:
            cleaned_text = re.sub(filler, ' ', cleaned_text, flags=re.IGNORECASE)
        
        # Bereinige mehrfache Leerzeichen
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()
        
        print(f"Title Generator: Bereinigter Text: '{cleaned_text}'")
        
        # Nehme die ersten 2-4 Wörter als Titel
        words = cleaned_text.split()
        if len(words) >= 2:
            # Beschränke auf 3 Wörter oder max_length
            title_words = words[:min(3, len(words))]
            title = ' '.join(title_words).title()
            
            if len(title) > max_length:
                title = title[:max_length-3] + "..."
                
            print(f"Title Generator: Aus Wörtern generierter Titel: '{title}'")
            return title
        elif len(words) == 1 and len(words[0]) >= 3:
            # Nur ein Wort, aber lang genug
            title = words[0].title()
            print(f"Title Generator: Einzelwort-Titel: '{title}'")
            return title
        
        # Fallback: Nehme einfach den Anfang des bereinigten Textes
        if cleaned_text and len(cleaned_text) >= 3:
            if len(cleaned_text) > max_length:
                title = cleaned_text[:max_length-3] + "..."
            else:
                title = cleaned_text
                
            title = title.title()
            print(f"Title Generator: Fallback-Titel aus Text: '{title}'")
            return title
        
        # Absolute Fallback: Standardtitel
        print("Title Generator: Nutze Standard-Fallback-Titel")
        return "Neue Unterhaltung"