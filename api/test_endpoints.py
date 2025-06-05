"""Test endpoints for debugging"""

from fastapi import APIRouter, Request
from typing import Dict, Any

router = APIRouter()

@router.get("/headers")
async def echo_headers(request: Request) -> Dict[str, Any]:
    """Echo all received headers for debugging"""
    headers = dict(request.headers)
    return {
        "headers": headers,
        "url": str(request.url),
        "method": request.method,
        "client": f"{request.client.host}:{request.client.port}" if request.client else None
    }

@router.get("/auth-test")
async def test_auth(request: Request) -> Dict[str, Any]:
    """Test authorization header specifically"""
    auth_header = request.headers.get("authorization")
    return {
        "authorization_header": auth_header,
        "has_bearer": auth_header.startswith("Bearer ") if auth_header else False,
        "token_length": len(auth_header.split(" ")[1]) if auth_header and " " in auth_header else 0,
        "all_headers": dict(request.headers)
    }