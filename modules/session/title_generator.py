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
            "fehler", "problem", "fehler im geschäftsgang", "hallo", "hilfe"
        ]
        
        # Die häufigsten direkten Fragen mit RegEx behandeln
        direct_patterns = [
            (r'(wie|erstell|leg).*(neue|akte)', 'Akte anlegen'),
            (r'(wie|kann).*(dokument|datei).*(hinzufüg|upload|import)', 'Dokument hochladen'),
            (r'(fehler|problem).*(geschäftsgang|workflow)', 'Fehler im Geschäftsgang'),
            (r'(was|wie).*(suche|find)', 'Dokumente suchen'),
            (r'(wie|kann).*(scan|einscan)', 'Dokumente scannen'),
            (r'hallo', 'Begrüßung'),
            (r'(guten\s+)?(morgen|tag|abend)', 'Begrüßung'),
            (r'hilfe', 'Hilfe angefordert'),
            (r'starten', 'Workflow starten'),
            (r'fehler', 'Fehlerbehebung'),
            (r'anlegen', 'Anlegen'),
            (r'benutzer|berechtigung', 'Benutzerverwaltung'),
            (r'(pdf|dokument|datei|ablage)', 'Dokumentenverwaltung'),
        ]
        
        # Prüfe zuerst direkte Muster
        lowercase_message = clean_message.lower()
        for pattern, title in direct_patterns:
            if re.search(pattern, lowercase_message):
                print(f"Muster '{pattern}' gefunden in '{lowercase_message}', Titel: '{title}'")
                return title
            
        # Prüfe, ob einer der Schlüsselbegriffe enthalten ist
        found_phrases = []
        for phrase in key_phrases:
            if phrase.lower() in lowercase_message:
                found_phrases.append(phrase)
        
        # Wenn ein Schlüsselbegriff gefunden wurde, nutze den längsten
        if found_phrases:
            longest_phrase = max(found_phrases, key=len)
            print(f"Schlüsselbegriff '{longest_phrase}' in Nachricht gefunden")
            return longest_phrase.title()  # Erster Buchstabe groß
            
        # Aggressive Entfernung von Fragewörtern und Füllwörtern
        # Entferne Fragewörter am Anfang
        question_pattern = r'^(wie|was|warum|weshalb|wann|wozu|wo|welche[rsm]?|wer|gibt es|kann ich|können wir|ist es möglich|ich möchte|möchte ich|ich will|will ich) '
        clean_message = re.sub(question_pattern, '', clean_message, flags=re.IGNORECASE)
        
        # Entferne allgemeine Formulierungen
        common_starts = [
            "ich möchte gerne wissen", "ich würde gerne wissen", "ich möchte wissen", "würde gerne wissen",
            "können sie mir sagen", "können sie mir erklären", "können sie mir zeigen", "können sie mir helfen",
            "kannst du mir sagen", "kannst du mir erklären", "kannst du mir zeigen", "kannst du mir helfen",
            "ich habe eine frage zu", "ich möchte fragen", "ich habe", "ich will", "ich brauche",
            "meine frage ist", "bitte erkläre mir", "bitte zeige mir", "bitte sage mir",
            "erklär mir", "erkläre mir", "zeig mir", "zeige mir", "hilf mir", "helfen sie mir",
            "ich brauche hilfe bei", "hilf mir bei", "hilfe bei", "hilfestellung", "anleitung für",
            "wie funktioniert", "wie geht", "wie kann ich", "wie kann man", "wie erstelle ich",
            "wie füge ich", "wie lege ich", "wie mache ich"
        ]
        
        for phrase in common_starts:
            if clean_message.lower().startswith(phrase):
                clean_message = clean_message[len(phrase):].strip()
                break
        
        # Entferne häufige Stopwörter (erweiterte Liste)
        stopwords = [
            "bitte", "danke", "vielen dank", "hallo", "hi", "guten tag", "moin", "servus",
            "dms", "software", "system", "programm", "anwendung", "nscale",
            "mit", "dem", "der", "die", "das", "ein", "eine", "einen", "einer", "eines",
            "zu", "zur", "zum", "bei", "für", "von", "vom", "am", "im", "in", "an", "auf",
            "ist", "sind", "war", "waren", "sein", "werden", "wurde", "wurden",
            "mein", "meine", "meinen", "meiner", "meines",
            "hat", "haben", "hatte", "hatten", "gehabt",
            "möchte", "möchten", "will", "wollen", "wollte", "wollten",
            "kann", "können", "konnte", "konnten", "gekonnt",
            "soll", "sollen", "sollte", "sollten", "gesollt",
            "muss", "müssen", "musste", "mussten", "gemusst",
            "darf", "dürfen", "durfte", "durften", "gedurft",
            "mir", "dir", "uns", "euch", "ihnen", "sich",
            "man", "jemand", "niemand", "alle", "einige"
        ]
        
        for word in stopwords:
            clean_message = re.sub(r'\b' + re.escape(word) + r'\b', '', clean_message, flags=re.IGNORECASE)
        
        # Entferne doppelte Leerzeichen und bereinige den Text
        clean_message = re.sub(r'\s+', ' ', clean_message).strip()
        
        # Teile in Satzzeichen auf und nehme nur den ersten Teil
        sentence_parts = re.split(r'[.!?]', clean_message)
        if sentence_parts and len(sentence_parts[0]) > 0:
            clean_message = sentence_parts[0].strip()
        
        # Kürzen auf maximale Länge
        if len(clean_message) > max_length:
            # Versuche, am Wortende zu kürzen
            words = clean_message[:max_length].split(' ')
            if len(words) > 1:
                words.pop()  # Entferne letztes (möglicherweise abgeschnittenes) Wort
            clean_message = ' '.join(words)
        
        # Stelle sicher, dass der Titel mit einem Großbuchstaben beginnt
        if clean_message and len(clean_message) > 0:
            clean_message = clean_message[0].upper() + clean_message[1:]
        
        # Fallback, wenn der Titel zu kurz oder leer ist
        if not clean_message or len(clean_message) < 3:
            return "Neue Unterhaltung"
        
        print(f"Generierter Titel: '{clean_message}'")
        return clean_message