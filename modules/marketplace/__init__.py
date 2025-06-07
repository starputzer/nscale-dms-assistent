"""
Widget Marketplace Module

Provides widget store functionality for installing, updating, and managing widgets.
"""

from .widget_store import (
    WidgetMarketplace,
    WidgetMetadata,
    InstalledWidget,
    WidgetCategory,
    WidgetStatus,
    widget_marketplace
)

__all__ = [
    'WidgetMarketplace',
    'WidgetMetadata',
    'InstalledWidget',
    'WidgetCategory',
    'WidgetStatus',
    'widget_marketplace'
]