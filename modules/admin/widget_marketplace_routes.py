from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime

from modules.core.auth_dependency import get_current_admin_user
from modules.auth.user_model import User
from modules.marketplace import (
    widget_marketplace,
    WidgetCategory,
    WidgetStatus
)

router = APIRouter(prefix="/api/admin/widgets", tags=["admin-widgets"])

@router.get("/available")
async def get_available_widgets(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search term"),
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get available widgets from marketplace"""
    try:
        # Parse category if provided
        widget_category = None
        if category:
            try:
                widget_category = WidgetCategory(category)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid category: {category}"
                )
        
        # Fetch widgets
        widgets = await widget_marketplace.fetch_marketplace_widgets(
            category=widget_category,
            search=search
        )
        
        # Convert to response format
        widgets_data = []
        for widget in widgets:
            widget_data = {
                'id': widget.id,
                'name': widget.name,
                'description': widget.description,
                'category': widget.category.value,
                'author': widget.author,
                'icon': widget.icon,
                'screenshots': widget.screenshots,
                'current_version': {
                    'version': widget.current_version.version,
                    'release_date': widget.current_version.release_date.isoformat(),
                    'changelog': widget.current_version.changelog,
                    'size_bytes': widget.current_version.size_bytes
                },
                'rating': widget.rating,
                'downloads': widget.downloads,
                'status': widget_marketplace.get_widget_status(widget.id).value,
                'tags': widget.tags,
                'permissions': widget.permissions
            }
            widgets_data.append(widget_data)
        
        return {
            'success': True,
            'widgets': widgets_data,
            'total': len(widgets_data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/installed")
async def get_installed_widgets(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get installed widgets"""
    try:
        installed = []
        
        for widget_id, widget in widget_marketplace.installed_widgets.items():
            installed.append({
                'id': widget.widget_id,
                'name': widget.metadata.name,
                'description': widget.metadata.description,
                'category': widget.metadata.category.value,
                'installed_version': widget.installed_version,
                'current_version': widget.metadata.current_version.version,
                'installed_at': widget.installed_at.isoformat(),
                'is_enabled': widget.is_enabled,
                'has_update': widget.installed_version != widget.metadata.current_version.version,
                'config': widget.config
            })
        
        return {
            'success': True,
            'widgets': installed,
            'total': len(installed)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/install/{widget_id}")
async def install_widget(
    widget_id: str,
    version: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Install a widget"""
    try:
        installed_widget = await widget_marketplace.install_widget(
            widget_id, 
            version
        )
        
        return {
            'success': True,
            'message': f'Widget {widget_id} installed successfully',
            'widget': {
                'id': installed_widget.widget_id,
                'name': installed_widget.metadata.name,
                'version': installed_widget.installed_version,
                'installed_at': installed_widget.installed_at.isoformat()
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/uninstall/{widget_id}")
async def uninstall_widget(
    widget_id: str,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Uninstall a widget"""
    try:
        success = await widget_marketplace.uninstall_widget(widget_id)
        
        return {
            'success': success,
            'message': f'Widget {widget_id} uninstalled successfully'
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/update/{widget_id}")
async def update_widget(
    widget_id: str,
    version: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Update a widget to a new version"""
    try:
        updated_widget = await widget_marketplace.update_widget(
            widget_id,
            version
        )
        
        return {
            'success': True,
            'message': f'Widget {widget_id} updated successfully',
            'widget': {
                'id': updated_widget.widget_id,
                'name': updated_widget.metadata.name,
                'version': updated_widget.installed_version
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/enable/{widget_id}")
async def enable_widget(
    widget_id: str,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Enable a widget"""
    try:
        widget_marketplace.enable_widget(widget_id)
        
        return {
            'success': True,
            'message': f'Widget {widget_id} enabled'
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/disable/{widget_id}")
async def disable_widget(
    widget_id: str,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Disable a widget"""
    try:
        widget_marketplace.disable_widget(widget_id)
        
        return {
            'success': True,
            'message': f'Widget {widget_id} disabled'
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/configure/{widget_id}")
async def configure_widget(
    widget_id: str,
    config: Dict[str, Any],
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Configure a widget"""
    try:
        widget_marketplace.configure_widget(widget_id, config)
        
        return {
            'success': True,
            'message': f'Widget {widget_id} configured'
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_widget_categories(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get available widget categories"""
    categories = [
        {
            'id': category.value,
            'name': category.value.title().replace('_', ' '),
            'description': f'{category.value.title()} widgets'
        }
        for category in WidgetCategory
    ]
    
    return {
        'success': True,
        'categories': categories
    }

@router.get("/stats")
async def get_marketplace_stats(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get marketplace statistics"""
    try:
        stats = widget_marketplace.get_marketplace_stats()
        
        return {
            'success': True,
            'stats': stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))