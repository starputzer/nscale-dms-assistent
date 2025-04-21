import asyncio
import aiohttp
import json
import sys

async def test_streaming():
    """Einfacher Test für Ollama-Streaming ohne Integration"""
    prompt = "Antworte mit einem kurzen Satz auf Deutsch: Was ist nscale?"
    
    payload = {
        'model': 'mistral-tuned',  # Ihr Modellname
        'prompt': prompt,
        'stream': True,
        'options': {
            'temperature': 0.2,
        }
    }
    
    print(f"Sende Anfrage zum Streamen an Ollama (URL: http://localhost:11434/api/generate)...")
    print(f"Prompt: {prompt}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "http://localhost:11434/api/generate",
                json=payload,
                timeout=60.0
            ) as resp:
                print(f"Antwort: Status {resp.status}")
                
                if resp.status != 200:
                    print(f"Fehler: {resp.status}")
                    return
                
                # Gesamte Antwort sammeln
                full_response = ""
                token_count = 0
                
                print("\n--- BEGINN DER STREAMED TOKENS ---")
                async for line in resp.content:
                    if not line:
                        continue
                    
                    line_text = line.decode('utf-8').strip()
                    print(f"Rohausgabe: {line_text}")
                    
                    try:
                        data = json.loads(line_text)
                        if 'response' in data:
                            token = data['response']
                            token_count += 1
                            # Token zur Gesamtantwort hinzufügen
                            full_response += token
                            # Token ausgeben (ohne Zeilenumbruch)
                            sys.stdout.write(token)
                            sys.stdout.flush()
                        
                        if data.get('done', False):
                            print("\n--- ENDE DER STREAMED TOKENS ---")
                            break
                    except Exception as e:
                        print(f"Fehler beim Verarbeiten: {e}")
                
                print(f"\nAnzahl der Token: {token_count}")
                print(f"\nVollständige Antwort:\n{full_response}")
    
    except Exception as e:
        print(f"Fehler bei der Anfrage: {e}")

# Führt den Test aus
if __name__ == "__main__":
    asyncio.run(test_streaming())
