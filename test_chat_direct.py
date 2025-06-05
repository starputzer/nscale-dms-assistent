#!/usr/bin/env python3
"""
Direct test of chat functionality
"""

import asyncio
import sys
sys.path.insert(0, '/opt/nscale-assist/app')

from modules.chat.chat_history_manager import ChatHistoryManager
from modules.sessions.session_manager import SessionManager
from modules.llm.llm_service import LLMService
import json

async def test_chat():
    # Initialize services
    chat_history = ChatHistoryManager()
    session_manager = SessionManager()
    llm_service = LLMService()
    
    # Test data
    session_id = "test-session-123"
    user_id = "5"
    message = "Hallo, wie geht es dir?"
    model = "llama3:8b-instruct-q4_1"
    
    # Create session first
    session = session_manager.create_session(
        session_id=session_id,
        user_id=user_id,
        title="Test Session"
    )
    print(f"Session created: {session}")
    
    # Save user message
    print("\n1. Saving user message...")
    user_msg_id = chat_history.add_message(
        session_id=session_id,
        role="user",
        content=message,
        user_id=user_id
    )
    print(f"User message ID: {user_msg_id}")
    
    # Get messages for LLM
    messages = [
        {"role": "system", "content": "Du bist ein hilfreicher Assistent."},
        {"role": "user", "content": message}
    ]
    
    # Stream from LLM
    print("\n2. Streaming from LLM...")
    assistant_content = ""
    
    async for chunk in llm_service.stream_chat(messages, model):
        if chunk["type"] == "content":
            assistant_content += chunk["content"]
            print(chunk["content"], end="", flush=True)
        elif chunk["type"] == "done":
            print("\n\nStreaming done!")
            break
    
    # Save assistant message
    print("\n3. Saving assistant message...")
    assistant_msg_id = chat_history.add_message(
        session_id=session_id,
        role="assistant",
        content=assistant_content,
        user_id=user_id,
        model=model
    )
    print(f"Assistant message ID: {assistant_msg_id}")
    
    # Get all messages
    print("\n4. Getting all messages...")
    all_messages = chat_history.get_session_messages(session_id)
    print(f"Total messages: {len(all_messages)}")
    for msg in all_messages:
        print(f"- [{msg['role']}] {msg['content'][:50]}...")

if __name__ == "__main__":
    asyncio.run(test_chat())