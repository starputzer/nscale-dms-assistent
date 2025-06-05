"""Simplified admin endpoints that work"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from datetime import datetime
import json

router = APIRouter()

# Simple mock data
MOCK_USERS = [
    {"id": 1, "email": "admin@example.com", "role": "admin"},
    {"id": 5, "email": "martin@danglefeet.com", "role": "admin"}
]

MOCK_STATS = {
    "users": {"total": 42, "active": 38, "admins": 3},
    "sessions": {"total": 1256, "active": 12},
    "documents": {"total": 156, "processed_today": 23}
}

# Simplified endpoints that return mock data
@router.get("/users/")
async def get_users():
    """Get all users - simplified"""
    return {"users": MOCK_USERS, "total": len(MOCK_USERS)}

@router.get("/users/count")
async def get_user_count():
    """Get user count - simplified"""
    return {"count": len(MOCK_USERS)}

@router.get("/users/stats")
async def get_user_stats():
    """Get user statistics - simplified"""
    return MOCK_STATS["users"]

@router.get("/system/stats")
async def get_system_stats():
    """Get system statistics - simplified"""
    return MOCK_STATS

@router.get("/feedback/stats")
async def get_feedback_stats():
    """Get feedback statistics - simplified"""
    return {
        "total": 89,
        "positive": 72,
        "negative": 17,
        "average_rating": 4.2
    }

@router.get("/dashboard/summary")
async def get_dashboard_summary():
    """Get dashboard summary - simplified"""
    return {
        "overview": MOCK_STATS,
        "recent_activity": [],
        "system_health": "operational"
    }
