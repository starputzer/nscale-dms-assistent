#!/usr/bin/env python3
"""
Test-Script für verbesserte Streaming-Funktionalität
"""

import asyncio
import aiohttp
import json
import sys

async def test_streaming_endpoint():
    """Testet den verbesserten Streaming-Endpunkt"""
    print("Test für verbesserten Streaming-Endpunkt startet...")
    
    # Parameter für den Test
    url = "http://localhost:8000/api/v1/question/stream"
    auth_token = "test_token"  # Hier einen gültigen Token einfügen, falls nötig
    question = "Was ist nscale DMS?"
    session_id = "1"  # Hier eine gültige Session-ID einfügen, falls nötig
    
    # HTTP-Parameter
    params = {
        "question": question,
        "session_id": session_id,
        "simple_language": "true"
    }
    
    headers = {
        "Authorization": f"Bearer {auth_token}"
    }
    
    try:
        print(f"Sende Anfrage an {url} mit Frage: '{question}'")
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers) as response:
                print(f"Antwort-Status: {response.status}")
                
                if response.status != 200:
                    error_text = await response.text()
                    print(f"Fehler: {error_text}")
                    return False
                
                # Verarbeite den Stream
                full_response = ""
                async for chunk in response.content.iter_chunked(1024):
                    chunk_text = chunk.decode('utf-8')
                    try:
                        # Versuche JSON zu parsen
                        data = json.loads(chunk_text)
                        if 'content' in data:
                            token = data['content']
                            full_response += token
                            print(token, end='', flush=True)
                        elif 'error' in data:
                            print(f"\nFehler vom Server: {data['error']}")
                        elif 'done' in data and data['done']:
                            print("\n[Stream abgeschlossen]")
                    except json.JSONDecodeError:
                        print(f"\nUngültiges JSON: {chunk_text}")
                    except Exception as e:
                        print(f"\nFehler beim Verarbeiten: {e}")
                
                print("\n\nVollständige Antwort:")
                print("-" * 80)
                print(full_response)
                print("-" * 80)
                
                return True
    
    except aiohttp.ClientError as e:
        print(f"Verbindungsfehler: {e}")
        return False
    except Exception as e:
        print(f"Unerwarteter Fehler: {e}")
        return False

if __name__ == "__main__":
    print("Streaming-Test startet...")
    success = asyncio.run(test_streaming_endpoint())
    print(f"Test {'erfolgreich' if success else 'fehlgeschlagen'}")
    sys.exit(0 if success else 1)