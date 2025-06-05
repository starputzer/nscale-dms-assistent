#!/usr/bin/env python3
"""
Test the add_message method directly
"""

import sys
sys.path.insert(0, '/opt/nscale-assist/app')

from modules.chat.chat_history_manager import ChatHistoryManager
import uuid

# Create manager
manager = ChatHistoryManager()

# Add a test message
session_id = str(uuid.uuid4())
user_id = "5"
role = "user"
content = "Test message"
model = "llama3:8b-instruct-q4_1"

print("Adding message...")
message_id = manager.add_message(
    session_id=session_id,
    role=role,
    content=content,
    user_id=user_id,
    model=model
)

print(f"Message ID: {message_id}")

# Get messages
print("\nGetting messages...")
messages = manager.get_session_messages(session_id)
print(f"Found {len(messages)} messages")
for msg in messages:
    print(f"- {msg}")