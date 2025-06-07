"""
Admin Module - Contains all admin-related endpoints and functionality
"""

# Import the central admin router
from .admin_router import router

# Also export individual handlers for direct access if needed
from .dashboard_handler import dashboard_handler
from .users_handler import users_handler
from .feedback_handler import feedback_handler
from .statistics_handler import statistics_handler

__all__ = [
    'router',  # The main admin router
    'dashboard_handler',
    'users_handler',
    'feedback_handler',
    'statistics_handler'
]