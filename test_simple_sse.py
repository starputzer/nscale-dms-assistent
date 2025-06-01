from fastapi import FastAPI
from sse_starlette.sse import EventSourceResponse
import asyncio
import json

app = FastAPI()

@app.get("/test-sse")
async def test_sse():
    async def event_generator():
        # Test 1: Plain JSON
        yield json.dumps({"message": "Test 1"})
        await asyncio.sleep(0.1)
        
        # Test 2: With data: prefix
        yield f"data: {json.dumps({'message': 'Test 2'})}"
        await asyncio.sleep(0.1)
        
        # Test 3: With full SSE format
        yield f"data: {json.dumps({'message': 'Test 3'})}\n\n"
        await asyncio.sleep(0.1)
        
        # Test 4: Done event
        yield "event: done\ndata: \n\n"
    
    return EventSourceResponse(event_generator())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)