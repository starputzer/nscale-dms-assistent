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
            "akte anlegen", "dokument speichern", "datei hochladen", "workflow starten", "benutzer anlegen",
            "berechtigung", "einscannen", "archivieren", "suche", "wiederfinden", "freigabe",
            "digitalisierung", "geschäftsgang", "aktenplan", "ablage", "aktenzeichen", "vorgang", 
            "dokumententyp", "prozess", "elektronische akte", "workflow"
        ]
        
        # Spezialfall: Wenn die Nachricht "Wie lege ich eine Akte an" oder ähnlich ist
        if any(phrase in clean_message.lower() for phrase in ["akte anlegen", "neue akte", "akte erstellen"]):
            return "Akte anlegen"
        
        if any(phrase in clean_message.lower() for phrase in ["fehler im geschäftsgang", "geschäftsgang fehler"]):
            return "Fehler im Geschäftsgang"
            
        # Prüfe, ob einer der Schlüsselbegriffe enthalten ist
        found_phrases = []
        for phrase in key_phrases:
            if phrase.lower() in clean_message.lower():
                found_phrases.append(phrase)
        
        # Wenn ein Schlüsselbegriff gefunden wurde, nutze den längsten
        if found_phrases:
            longest_phrase = max(found_phrases, key=len)
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
            "mit", "dem", "der", "das", "ein", "eine", "einen", "einer", "eines",
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
            "man", "jemand", "niemand", "alle", "einige",
            "bisher", "dabei", "dafür", "dagegen", "danach", "dann", "daran", "darauf", "daraus",
            "darin", "darum", "darunter", "davon", "dazu", "dazwischen", "dein", "deine", "deinem",
            "deinen", "deiner", "deines", "demgegenüber", "demgemäß", "demzufolge",
            "den", "denen", "denselben", "derer", "derjenige", "derjenigen", "derselbe", "derselben",
            "deshalb", "desselben", "dessen", "deswegen", "dich", "die", "dies", "diese", "dieselbe",
            "dieselben", "diesem", "diesen", "dieser", "dieses", "dort", "dorthin",
            "durch", "eben", "ebenso", "eigen", "eigene", "eigenen", "eigener", "eigenes",
            "einander", "einmal", "erst", "es", "etwa", "etwas", "euch", "euer", "eure",
            "eurem", "euren", "eurer", "eures", "falls", "fast", "ferner", "folgende", "früher",
            "gegen", "gegenüber", "gemäß", "genau", "gerade", "gern", "gestern", "gewesen",
            "geworden", "gibt", "gleich", "gute", "guten", "hab", "habe", "halb", "hallo",
            "hast", "her", "heraus", "herbei", "herein", "heute", "hier", "hierher", "hiesige",
            "hin", "hinein", "hinten", "hinter", "hoch", "ihn", "ihnen", "ihr", "ihre", "ihrem",
            "ihren", "ihrer", "ihres", "immer", "indem", "indessen", "infolge", "innen",
            "innerhalb", "ins", "insofern", "inzwischen", "irgend", "je", "jede", "jedem",
            "jeden", "jeder", "jedermann", "jedermanns", "jedes", "jedoch", "jemand", "jemandem",
            "jemanden", "jemands", "jene", "jenem", "jenen", "jener", "jenes", "jenseits",
            "jetzt", "keinen", "könnt", "könnte", "könnten", "kaum", "kein", "keine", "keinem",
            "keinen", "keiner", "keines", "kleine", "kleinen", "kleiner", "kleines", "kommen",
            "kommt", "lang", "lange", "leicht", "leider", "lesen", "letzter", "letztes", "lief",
            "los", "machen", "machst", "machte", "mag", "magst", "manche", "manchem", "manchen",
            "mancher", "manches", "mehr", "mein", "meine", "meinem", "meinen", "meiner", "meines",
            "meist", "meiste", "meisten", "nachdem", "nachher", "nahm", "natürlich", "neben",
            "nebst", "nein", "neue", "neuen", "neuem", "neuer", "neues", "nicht", "nichts",
            "nie", "niemandem", "niemanden", "niemands", "nimm", "nimmer", "nimmt", "nirgends",
            "noch", "nun", "nur", "nötig", "nützt", "nutzt", "oder", "oben", "über", "überhaupt",
            "übrigens", "oft", "ohne", "per"
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
        
        return clean_message