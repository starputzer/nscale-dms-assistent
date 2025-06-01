#!/usr/bin/env python3
"""Test Ollama Streaming direkt"""
import asyncio
import aiohttp
import json

async def test_streaming():
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "llama3:8b-instruct-q4_1",
        "prompt": "Was ist Vue.js? Erkläre es kurz.",
        "stream": True
    }
    
    print("Starte Streaming-Test...")
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as resp:
            print(f"Status: {resp.status}")
            
            token_count = 0
            async for line in resp.content:
                if line:
                    try:
                        data = json.loads(line.decode('utf-8'))
                        if 'response' in data:
                            token = data['response']
                            print(f"Token {token_count}: '{token}'")
                            token_count += 1
                            
                        if data.get('done', False):
                            print(f"\nFertig! Total tokens: {token_count}")
                            break
                    except:
                        pass

if __name__ == "__main__":
    asyncio.run(test_streaming())