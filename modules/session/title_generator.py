import re
from typing import List, Optional

class SessionTitleGenerator:
    """Generiert automatisch Titel für Chat-Sessions basierend auf dem Inhalt der ersten Nachricht"""
    
    @staticmethod
    def generate_title(message: str, max_length: int = 40) -> str:
        """
        Generiert einen Titel aus einer Nachricht.
        
        Args:
            message: Die Nachricht, aus der der Titel generiert werden soll
            max_length: Maximale Länge des Titels
            
        Returns:
            Ein generierter Titel
        """
        if not message or len(message.strip()) == 0:
            return "Neue Unterhaltung"
        
        # Entfernen von Sonderzeichen und bereinigen der Nachricht
        clean_message = message.strip()
        
        # Entferne Fragewörter am Anfang
        question_pattern = r'^(wie|was|warum|weshalb|wann|wozu|wo|welche[rsm]?|wer|gibt es|kann ich|können wir|ist es möglich) '
        clean_message = re.sub(question_pattern, '', clean_message, flags=re.IGNORECASE)
        
        # Entferne allgemeine Formulierungen
        common_starts = [
            "ich möchte gerne wissen", "ich würde gerne wissen", 
            "können sie mir sagen", "können sie mir erklären",
            "kannst du mir sagen", "kannst du mir erklären",
            "ich habe eine frage zu", "ich möchte fragen", 
            "meine frage ist", "bitte erkläre mir",
            "erklär mir", "erkläre mir", "zeig mir", "zeige mir",
            "ich brauche hilfe bei", "hilf mir bei", "hilfe bei"
        ]
        
        for phrase in common_starts:
            if clean_message.lower().startswith(phrase):
                clean_message = clean_message[len(phrase):].strip()
                break
        
        # Entferne häufige Wörter aus der Anfrage
        filler_words = [
            "bitte", "danke", "vielen dank", "hallo", "hi", "guten tag",
            "dms", "software", "mit", "dem", "der", "das", "ein", "eine",
            "wie funktioniert", "wie kann ich", "wie kann man"
        ]
        
        for word in filler_words:
            clean_message = re.sub(r'\b' + re.escape(word) + r'\b', '', clean_message, flags=re.IGNORECASE)
        
        # Entferne doppelte Leerzeichen
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
            
            # Füge Auslassungspunkte hinzu
            if len(clean_message) < len(message):
                clean_message += "..."
        
        # Stelle sicher, dass der Titel mit einem Großbuchstaben beginnt
        if clean_message and len(clean_message) > 0:
            clean_message = clean_message[0].upper() + clean_message[1:]
        
        # Fallback, wenn der Titel zu kurz oder leer ist
        if not clean_message or len(clean_message) < 3:
            return "Neue Unterhaltung"
        
        return clean_message