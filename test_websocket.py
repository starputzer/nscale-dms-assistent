#!/usr/bin/env python3
"""
Test script for WebSocket functionality
Tests connection, authentication, and various subscription features
"""
import asyncio
import json
import websockets
import sys
from datetime import datetime


async def test_websocket_connection(token: str):
    """Test WebSocket connection and features"""
    
    uri = f"ws://localhost:8000/ws/connect?token={token}"
    
    try:
        async with websockets.connect(uri) as websocket:
            print(f"[{datetime.now()}] Connected to WebSocket server")
            
            # Test 1: Wait for connection confirmation
            response = await websocket.recv()
            data = json.loads(response)
            print(f"[{datetime.now()}] Connection confirmed: {data}")
            
            # Test 2: Send ping
            await websocket.send(json.dumps({
                "type": "ping",
                "timestamp": datetime.utcnow().isoformat()
            }))
            print(f"[{datetime.now()}] Sent ping")
            
            # Test 3: Subscribe to system metrics
            await websocket.send(json.dumps({
                "type": "subscribe_system_metrics"
            }))
            print(f"[{datetime.now()}] Subscribed to system metrics")
            
            # Test 4: Get active jobs
            await websocket.send(json.dumps({
                "type": "get_active_jobs"
            }))
            print(f"[{datetime.now()}] Requested active jobs")
            
            # Test 5: Subscribe to job updates
            await websocket.send(json.dumps({
                "type": "subscribe_job_updates"
            }))
            print(f"[{datetime.now()}] Subscribed to job updates")
            
            # Test 6: Subscribe to document updates
            await websocket.send(json.dumps({
                "type": "subscribe_document_updates"
            }))
            print(f"[{datetime.now()}] Subscribed to document updates")
            
            # Listen for messages for 30 seconds
            print(f"\n[{datetime.now()}] Listening for messages (30 seconds)...")
            print("-" * 60)
            
            end_time = asyncio.get_event_loop().time() + 30
            
            while asyncio.get_event_loop().time() < end_time:
                try:
                    # Set timeout for receiving messages
                    response = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(response)
                    
                    # Pretty print the message
                    print(f"\n[{datetime.now()}] Received {data['type']}:")
                    
                    if data['type'] == 'system_metrics':
                        metrics = data['data']
                        print(f"  CPU: {metrics['cpu']['percent']}%")
                        print(f"  Memory: {metrics['memory']['percent']}%")
                        print(f"  Disk: {metrics['disk']['percent']}%")
                        
                    elif data['type'] == 'job_updates':
                        updates = data['data']['updates']
                        for update in updates:
                            print(f"  Job {update['job_id']}: {update['event']}")
                            
                    elif data['type'] == 'active_jobs':
                        jobs = data['data']['jobs']
                        print(f"  Active jobs: {len(jobs)}")
                        for job in jobs:
                            print(f"    - {job['name']} ({job['status']}): {job['progress']}%")
                            
                    else:
                        print(f"  Data: {json.dumps(data, indent=2)}")
                        
                except asyncio.TimeoutError:
                    # No message received, continue
                    pass
                except Exception as e:
                    print(f"[{datetime.now()}] Error receiving message: {e}")
                    
            print("\n" + "-" * 60)
            print(f"[{datetime.now()}] Test completed successfully!")
            
            # Unsubscribe before closing
            await websocket.send(json.dumps({
                "type": "unsubscribe_system_metrics"
            }))
            await websocket.send(json.dumps({
                "type": "unsubscribe_job_updates"
            }))
            await websocket.send(json.dumps({
                "type": "unsubscribe_document_updates"
            }))
            
    except websockets.exceptions.WebSocketException as e:
        print(f"[{datetime.now()}] WebSocket error: {e}")
    except Exception as e:
        print(f"[{datetime.now()}] Error: {e}")


async def test_admin_broadcast(token: str):
    """Test admin broadcast functionality"""
    
    uri = f"ws://localhost:8000/ws/connect?token={token}"
    
    try:
        async with websockets.connect(uri) as websocket:
            print(f"[{datetime.now()}] Testing admin broadcast...")
            
            # Wait for connection
            await websocket.recv()
            
            # Try to broadcast
            await websocket.send(json.dumps({
                "type": "broadcast_admin",
                "data": {
                    "message": "Test broadcast from admin",
                    "priority": "info"
                }
            }))
            
            # Wait for response
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(response)
            print(f"[{datetime.now()}] Broadcast response: {data}")
            
    except Exception as e:
        print(f"[{datetime.now()}] Admin broadcast test error: {e}")


def print_usage():
    """Print usage instructions"""
    print("Usage: python test_websocket.py <jwt_token>")
    print("\nExample:")
    print("  python test_websocket.py eyJ0eXAiOiJKV1QiLCJhbGc...")
    print("\nTo get a JWT token:")
    print("  1. Login via the API: POST /api/auth/login")
    print("  2. Use the token from the response")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)
        
    token = sys.argv[1]
    
    print("=" * 60)
    print("WebSocket Test Suite")
    print("=" * 60)
    
    # Run tests
    asyncio.run(test_websocket_connection(token))
    
    # If token looks like admin token, test admin features
    # (In real implementation, this would be determined by decoding the JWT)
    if input("\nTest admin features? (y/n): ").lower() == 'y':
        asyncio.run(test_admin_broadcast(token))