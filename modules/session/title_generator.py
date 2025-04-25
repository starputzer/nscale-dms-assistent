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
        
        # Extrahiere Schlüsselwörter und häufige Begriffe im DMS-Kontext
        key_phrases = [
            "akte anlegen", "dokument speichern", "datei hochladen", "workflow starten", 
            "benutzer anlegen", "berechtigung", "einscannen", "archivieren", "suche", 
            "wiederfinden", "freigabe", "digitalisierung", "geschäftsgang", "aktenplan", 
            "ablage", "aktenzeichen", "vorgang", "dokumententyp", "prozess", 
            "elektronische akte", "workflow", "scannen", "erstellen", "importieren", 
            "exportieren", "konvertieren", "verschieben", "kopieren", "löschen",
            "pdf", "word", "excel", "email", "zugriffsrechte", "drucken", "teilen",
            "fehler", "problem", "fehler im geschäftsgang", "hallo", "hilfe",
            "nscale", "dms", "dokumentenmanagementsystem", "dokumentenmanagement"
        ]
        
        lowercase_message = clean_message.lower()
        
        # DEBUG-AUSGABE
        print(f"Title Generator: Originalfrage: '{message}'")
        
        # 1. Direkter "Was ist X" Matcher 
        what_is_pattern = r'was ist (nscale|dms|dokumentenmanagementsystem)'
        what_is_match = re.search(what_is_pattern, lowercase_message)
        if what_is_match:
            subject = what_is_match.group(1).upper()
            print(f"Title Generator: Was ist {subject} Pattern erkannt")
            return f"{subject} Erklärung"
            
        # 2. Allgemeiner "Was ist X" Matcher
        general_what_is = r'was ist\s+(\w+)'
        general_what_match = re.search(general_what_is, lowercase_message)
        if general_what_match:
            subject = general_what_match.group(1)
            # Erste Buchstaben groß
            titled_subject = subject.title()
            print(f"Title Generator: Allgemeines Was ist Pattern erkannt: {titled_subject}")
            return f"{titled_subject} Erklärung"
            
        # 3. Allgemeine Fragemuster
        # Format: {Fragewort} {Verb} {Subjekt}
        question_patterns = [
            # Wie kann/muss/soll ich X
            (r'wie\s+(kann|muss|soll|könnte|müsste|sollte)\s+(?:ich|man)\s+(.+?)(?:\?|$)', 
             lambda m: f"{m.group(2).strip().title()} Anleitung"),
            
            # Wie funktioniert X
            (r'wie\s+funktioniert\s+(.+?)(?:\?|$)', 
             lambda m: f"{m.group(1).strip().title()} Erklärung"),
             
            # Wo finde ich X
            (r'wo\s+(?:finde|gibt|bekomme)\s+(?:ich|man)\s+(.+?)(?:\?|$)', 
             lambda m: f"{m.group(1).strip().title()} Ort"),
             
            # Wann wird/ist X
            (r'wann\s+(?:wird|ist|soll|kann|muss)\s+(.+?)(?:\?|$)', 
             lambda m: f"{m.group(1).strip().title()} Zeitpunkt"),
             
            # Was bedeutet X
            (r'was\s+bedeutet\s+(.+?)(?:\?|$)', 
             lambda m: f"{m.group(1).strip().title()} Bedeutung"),
             
            # Was sind X
            (r'was\s+sind\s+(.+?)(?:\?|$)', 
             lambda m: f"{m.group(1).strip().title()} Erklärung"),
             
            # Welche X gibt es
            (r'welche\s+(.+?)\s+gibt\s+es', 
             lambda m: f"{m.group(1).strip().title()} Übersicht"),
             
            # Allgemeines "Wie X" Muster
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
        
        # 4. Schlüsselbegriff-basierte Titel
        # Prüfe, ob einer der Schlüsselbegriffe enthalten ist
        found_phrases = []
        for phrase in key_phrases:
            if phrase.lower() in lowercase_message:
                found_phrases.append(phrase)
        
        # Wenn ein Schlüsselbegriff gefunden wurde, nutze den längsten
        if found_phrases:
            longest_phrase = max(found_phrases, key=len)
            print(f"Title Generator: Schlüsselbegriff '{longest_phrase}' in Nachricht gefunden")
            return longest_phrase.title()  # Erster Buchstabe groß
        
        # 5. Extrahiere Subjekt und/oder Verb aus dem Text
        # Entferne typische Fragewort-Präfixe
        question_prefixes = [
            r'^(wie|was|warum|weshalb|wann|wozu|wo|welche[rsm]?|wer|gibt es|kann ich|können wir|ist es möglich) ',
            r'^(ich möchte|möchte ich|ich will|will ich|ich brauche|brauche ich) ',
            r'^(bitte zeig|zeig mir|zeige mir|erkläre|erklär mir|hilf mir|helfen sie) '
        ]
        
        cleaned_text = lowercase_message
        for prefix_pattern in question_prefixes:
            cleaned_text = re.sub(prefix_pattern, '', cleaned_text, flags=re.IGNORECASE)
        
        # Entferne noch weitere Füllworte
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