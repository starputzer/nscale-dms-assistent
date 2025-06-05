"""
LLM Service - Handles communication with the language model
"""

import aiohttp
import json
import logging
from typing import List, Dict, Any, AsyncGenerator
import asyncio
from datetime import datetime

from modules.core.config import Config

logger = logging.getLogger(__name__)

class LLMService:
    """Service for interacting with the LLM"""
    
    def __init__(self):
        self.base_url = Config.OLLAMA_URL
        self.timeout = aiohttp.ClientTimeout(total=300)  # 5 minutes timeout
    
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama3:8b-instruct-q4_1"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream chat completion from the LLM"""
        
        # Add system message if not present
        if not messages or messages[0].get("role") != "system":
            system_message = {
                "role": "system",
                "content": "Du bist ein hilfreicher Assistent für das nscale Dokumentenmanagementsystem. Antworte auf Deutsch."
            }
            messages = [system_message] + messages
        
        # Prepare request
        request_data = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
                "top_k": 40,
                "num_predict": 2048
            }
        }
        
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.post(
                    f"{self.base_url}/api/chat",
                    json=request_data,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"LLM API error: {response.status} - {error_text}")
                        yield {
                            "type": "error",
                            "error": f"LLM API error: {response.status}"
                        }
                        return
                    
                    # Stream the response
                    async for line in response.content:
                        if line:
                            try:
                                data = json.loads(line)
                                
                                # Extract content from the message
                                if "message" in data and "content" in data["message"]:
                                    content = data["message"]["content"]
                                    if content:
                                        yield {
                                            "type": "content",
                                            "content": content
                                        }
                                
                                # Check if done
                                if data.get("done", False):
                                    yield {
                                        "type": "done",
                                        "model": data.get("model", model),
                                        "eval_count": data.get("eval_count", 0),
                                        "eval_duration": data.get("eval_duration", 0)
                                    }
                                    break
                                    
                            except json.JSONDecodeError as e:
                                logger.error(f"Failed to parse LLM response: {e}")
                                continue
                                
        except asyncio.TimeoutError:
            logger.error("LLM request timed out")
            yield {
                "type": "error",
                "error": "Request timed out"
            }
        except Exception as e:
            logger.error(f"LLM request error: {e}")
            yield {
                "type": "error",
                "error": str(e)
            }
    
    async def complete(
        self,
        prompt: str,
        model: str = "llama3:8b-instruct-q4_1"
    ) -> str:
        """Get a non-streaming completion from the LLM"""
        
        messages = [
            {
                "role": "system",
                "content": "Du bist ein hilfreicher Assistent für das nscale Dokumentenmanagementsystem. Antworte auf Deutsch."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        full_response = ""
        
        async for chunk in self.stream_chat(messages, model):
            if chunk["type"] == "content":
                full_response += chunk["content"]
            elif chunk["type"] == "error":
                raise Exception(f"LLM Error: {chunk['error']}")
        
        return full_response
    
    async def check_health(self) -> Dict[str, Any]:
        """Check if the LLM service is healthy"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                async with session.get(f"{self.base_url}/api/tags") as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "healthy": True,
                            "models": [model["name"] for model in data.get("models", [])]
                        }
                    else:
                        return {
                            "healthy": False,
                            "error": f"Status {response.status}"
                        }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e)
            }