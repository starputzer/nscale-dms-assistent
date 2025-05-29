#!/usr/bin/env python3
"""
Test-Skript für direkte Kommunikation mit dem Ollama-Server.
Speichern als test_ollama.py und ausführen mit:
python test_ollama.py
"""

import aiohttp
import asyncio
import json
import time

async def test_ollama():
    print("Teste direkte Verbindung zum Ollama-Server...")
    
    # Konfiguration
    OLLAMA_URL = "http://localhost:11434"
    MODEL_NAME = "mistral-tuned"  # Entsprechend Ihrem konfigurierten Modell
    
    # Einfacher Test-Prompt
    prompt = "Bitte gib mir eine kurze Antwort auf diese Frage: Was ist nscale DMS?"
    
    # Payload für Ollama
    payload = {
        'model': MODEL_NAME,
        'prompt': prompt,
        'stream': True,
        'options': {
            'temperature': 0.2,
            'num_ctx': 8192,
            'num_predict': 4096,
            'top_p': 0.9,
            'repeat_penalty': 1.1,
            'num_batch': 512,
        }
    }
    
    print(f"Verbinde mit {OLLAMA_URL}/api/generate...")
    start_time = time.time()
    
    try:
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    f"{OLLAMA_URL}/api/generate",
                    json=payload,
                    timeout=30.0
                ) as resp:
                    print(f"Server-Antwort: Status {resp.status}")
                    
                    if resp.status != 200:
                        error_text = await resp.text()
                        print(f"Fehler: {resp.status} {error_text}")
                        return
                    
                    # Verarbeite den Stream
                    complete_response = ""
                    async for line in resp.content:
                        if not line:
                            continue
                        
                        line_text = line.decode('utf-8').strip()
                        print(f"Rohausgabe: {line_text}")
                        
                        if not line_text.startswith('data: '):
                            continue
                        
                        try:
                            data_json = line_text[6:]  # Nach "data: "
                            data = json.loads(data_json)
                            
                            if 'response' in data:
                                token = data['response']
                                complete_response += token
                                print(f"Token: '{token}'")
                            
                            if data.get('done', False):
                                break
                        
                        except json.JSONDecodeError as e:
                            print(f"JSON-Fehler: {e}")
                            continue
                    
                    print(f"\nZeit: {time.time() - start_time:.2f}s")
                    print(f"\nVollständige Antwort:\n{complete_response}")
            
            except aiohttp.ClientError as e:
                print(f"Verbindungsfehler: {e}")
            except asyncio.TimeoutError:
                print("Timeout bei der Anfrage")
    
    except Exception as e:
        print(f"Unerwarteter Fehler: {e}")

if __name__ == "__main__":
    asyncio.run(test_ollama())
