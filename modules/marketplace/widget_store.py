import logging
import json
import os
import shutil
import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
import hashlib
import requests
from pathlib import Path
import zipfile
import yaml

logger = logging.getLogger(__name__)

class WidgetCategory(Enum):
    VISUALIZATION = "visualization"
    PRODUCTIVITY = "productivity"
    ANALYTICS = "analytics"
    COMMUNICATION = "communication"
    INTEGRATION = "integration"
    UTILITIES = "utilities"
    CUSTOM = "custom"

class WidgetStatus(Enum):
    AVAILABLE = "available"
    INSTALLED = "installed"
    UPDATE_AVAILABLE = "update_available"
    INCOMPATIBLE = "incompatible"
    DEPRECATED = "deprecated"

@dataclass
class WidgetVersion:
    """Widget version information"""
    version: str
    release_date: datetime
    min_app_version: str
    max_app_version: Optional[str] = None
    changelog: str = ""
    download_url: str = ""
    checksum: str = ""
    size_bytes: int = 0

@dataclass
class WidgetMetadata:
    """Widget metadata"""
    id: str
    name: str
    description: str
    category: WidgetCategory
    author: str
    author_email: str
    license: str
    homepage: str
    repository: str
    tags: List[str]
    screenshots: List[str]
    icon: str
    current_version: WidgetVersion
    versions: List[WidgetVersion]
    dependencies: Dict[str, str]
    permissions: List[str]
    rating: float = 0.0
    downloads: int = 0
    created_at: datetime = None
    updated_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()

@dataclass
class InstalledWidget:
    """Installed widget information"""
    widget_id: str
    metadata: WidgetMetadata
    installed_version: str
    installed_at: datetime
    install_path: str
    is_enabled: bool = True
    config: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.config is None:
            self.config = {}

class WidgetMarketplace:
    """Widget marketplace manager"""
    
    def __init__(self, widgets_dir: Optional[str] = None,
                 marketplace_url: Optional[str] = None):
        self.widgets_dir = widgets_dir or os.path.join(
            Path(__file__).parent.parent.parent, 'widgets'
        )
        self.marketplace_url = marketplace_url or os.getenv(
            'WIDGET_MARKETPLACE_URL', 
            'https://api.nscale-widgets.com/v1'
        )
        
        # Create directories
        os.makedirs(self.widgets_dir, exist_ok=True)
        os.makedirs(os.path.join(self.widgets_dir, 'installed'), exist_ok=True)
        os.makedirs(os.path.join(self.widgets_dir, 'cache'), exist_ok=True)
        
        # Widget registry
        self.available_widgets: Dict[str, WidgetMetadata] = {}
        self.installed_widgets: Dict[str, InstalledWidget] = {}
        
        # Load installed widgets
        self._load_installed_widgets()
        
        # Initialize demo widgets
        self._initialize_demo_widgets()
    
    def _initialize_demo_widgets(self):
        """Initialize demo widgets for testing"""
        demo_widgets = [
            WidgetMetadata(
                id="chart-widget",
                name="Advanced Charts",
                description="Beautiful and interactive charts for data visualization",
                category=WidgetCategory.VISUALIZATION,
                author="NScale Team",
                author_email="widgets@nscale.com",
                license="MIT",
                homepage="https://github.com/nscale/chart-widget",
                repository="https://github.com/nscale/chart-widget",
                tags=["charts", "visualization", "analytics"],
                screenshots=[
                    "https://example.com/chart-widget-1.png",
                    "https://example.com/chart-widget-2.png"
                ],
                icon="https://example.com/chart-widget-icon.png",
                current_version=WidgetVersion(
                    version="2.1.0",
                    release_date=datetime.now(),
                    min_app_version="1.0.0",
                    changelog="Added new chart types and improved performance",
                    download_url="https://example.com/chart-widget-2.1.0.zip",
                    checksum="abc123",
                    size_bytes=1024 * 1024 * 2  # 2MB
                ),
                versions=[],
                dependencies={"d3": "^7.0.0", "chart.js": "^4.0.0"},
                permissions=["storage", "api"],
                rating=4.8,
                downloads=15420
            ),
            WidgetMetadata(
                id="task-manager",
                name="Task Manager Pro",
                description="Powerful task management widget with Kanban board",
                category=WidgetCategory.PRODUCTIVITY,
                author="Productivity Labs",
                author_email="info@productivitylabs.com",
                license="Commercial",
                homepage="https://productivitylabs.com/task-manager",
                repository="",
                tags=["tasks", "productivity", "kanban", "project-management"],
                screenshots=[
                    "https://example.com/task-manager-1.png"
                ],
                icon="https://example.com/task-manager-icon.png",
                current_version=WidgetVersion(
                    version="1.5.2",
                    release_date=datetime.now(),
                    min_app_version="1.2.0",
                    changelog="Fixed drag and drop issues",
                    download_url="https://example.com/task-manager-1.5.2.zip",
                    checksum="def456",
                    size_bytes=1024 * 1024 * 3  # 3MB
                ),
                versions=[],
                dependencies={"vue-draggable": "^4.0.0"},
                permissions=["storage", "notifications"],
                rating=4.5,
                downloads=8932
            ),
            WidgetMetadata(
                id="weather-widget",
                name="Weather Dashboard",
                description="Real-time weather information and forecasts",
                category=WidgetCategory.UTILITIES,
                author="WeatherTech",
                author_email="support@weathertech.io",
                license="MIT",
                homepage="https://weathertech.io",
                repository="https://github.com/weathertech/weather-widget",
                tags=["weather", "forecast", "temperature"],
                screenshots=[],
                icon="https://example.com/weather-icon.png",
                current_version=WidgetVersion(
                    version="3.0.0",
                    release_date=datetime.now(),
                    min_app_version="1.0.0",
                    changelog="Complete redesign with new API",
                    download_url="https://example.com/weather-3.0.0.zip",
                    checksum="ghi789",
                    size_bytes=1024 * 512  # 512KB
                ),
                versions=[],
                dependencies={},
                permissions=["geolocation", "network"],
                rating=4.2,
                downloads=23150
            )
        ]
        
        for widget in demo_widgets:
            self.available_widgets[widget.id] = widget
    
    def _load_installed_widgets(self):
        """Load installed widgets from disk"""
        installed_dir = os.path.join(self.widgets_dir, 'installed')
        
        for widget_dir in os.listdir(installed_dir):
            manifest_path = os.path.join(installed_dir, widget_dir, 'widget.json')
            
            if os.path.exists(manifest_path):
                try:
                    with open(manifest_path, 'r') as f:
                        data = json.load(f)
                        
                    # Reconstruct widget from manifest
                    metadata = self._parse_widget_manifest(data['metadata'])
                    
                    installed_widget = InstalledWidget(
                        widget_id=data['widget_id'],
                        metadata=metadata,
                        installed_version=data['installed_version'],
                        installed_at=datetime.fromisoformat(data['installed_at']),
                        install_path=os.path.join(installed_dir, widget_dir),
                        is_enabled=data.get('is_enabled', True),
                        config=data.get('config', {})
                    )
                    
                    self.installed_widgets[widget_dir] = installed_widget
                    
                except Exception as e:
                    logger.error(f"Failed to load widget {widget_dir}: {str(e)}")
    
    def _parse_widget_manifest(self, data: Dict[str, Any]) -> WidgetMetadata:
        """Parse widget manifest data"""
        # Parse version
        version_data = data['current_version']
        current_version = WidgetVersion(
            version=version_data['version'],
            release_date=datetime.fromisoformat(version_data['release_date']),
            min_app_version=version_data['min_app_version'],
            max_app_version=version_data.get('max_app_version'),
            changelog=version_data.get('changelog', ''),
            download_url=version_data.get('download_url', ''),
            checksum=version_data.get('checksum', ''),
            size_bytes=version_data.get('size_bytes', 0)
        )
        
        # Create metadata
        return WidgetMetadata(
            id=data['id'],
            name=data['name'],
            description=data['description'],
            category=WidgetCategory(data['category']),
            author=data['author'],
            author_email=data['author_email'],
            license=data['license'],
            homepage=data['homepage'],
            repository=data['repository'],
            tags=data['tags'],
            screenshots=data['screenshots'],
            icon=data['icon'],
            current_version=current_version,
            versions=[],  # TODO: Parse all versions
            dependencies=data['dependencies'],
            permissions=data['permissions'],
            rating=data.get('rating', 0.0),
            downloads=data.get('downloads', 0),
            created_at=datetime.fromisoformat(data['created_at']),
            updated_at=datetime.fromisoformat(data['updated_at'])
        )
    
    async def fetch_marketplace_widgets(self, 
                                      category: Optional[WidgetCategory] = None,
                                      search: Optional[str] = None) -> List[WidgetMetadata]:
        """Fetch available widgets from marketplace"""
        # For demo, return local widgets
        widgets = list(self.available_widgets.values())
        
        # Filter by category
        if category:
            widgets = [w for w in widgets if w.category == category]
        
        # Search filter
        if search:
            search_lower = search.lower()
            widgets = [
                w for w in widgets
                if search_lower in w.name.lower() or
                   search_lower in w.description.lower() or
                   any(search_lower in tag for tag in w.tags)
            ]
        
        return widgets
    
    async def install_widget(self, widget_id: str, 
                           version: Optional[str] = None) -> InstalledWidget:
        """Install a widget"""
        if widget_id not in self.available_widgets:
            raise ValueError(f"Widget {widget_id} not found")
        
        if widget_id in self.installed_widgets:
            raise ValueError(f"Widget {widget_id} is already installed")
        
        widget = self.available_widgets[widget_id]
        
        # Use current version if not specified
        if not version:
            version = widget.current_version.version
        
        logger.info(f"Installing widget {widget_id} version {version}")
        
        # Create installation directory
        install_path = os.path.join(self.widgets_dir, 'installed', widget_id)
        os.makedirs(install_path, exist_ok=True)
        
        try:
            # Download widget (simulated for demo)
            await self._download_widget(widget, version, install_path)
            
            # Create installed widget record
            installed_widget = InstalledWidget(
                widget_id=widget_id,
                metadata=widget,
                installed_version=version,
                installed_at=datetime.now(),
                install_path=install_path,
                is_enabled=True
            )
            
            # Save manifest
            manifest_path = os.path.join(install_path, 'widget.json')
            with open(manifest_path, 'w') as f:
                json.dump({
                    'widget_id': widget_id,
                    'metadata': self._metadata_to_dict(widget),
                    'installed_version': version,
                    'installed_at': installed_widget.installed_at.isoformat(),
                    'is_enabled': True,
                    'config': {}
                }, f, indent=2)
            
            # Register widget
            self.installed_widgets[widget_id] = installed_widget
            
            # Initialize widget
            await self._initialize_widget(installed_widget)
            
            logger.info(f"Successfully installed widget {widget_id}")
            return installed_widget
            
        except Exception as e:
            # Cleanup on failure
            if os.path.exists(install_path):
                shutil.rmtree(install_path)
            raise Exception(f"Failed to install widget: {str(e)}")
    
    async def _download_widget(self, widget: WidgetMetadata, 
                             version: str, install_path: str):
        """Download and extract widget files"""
        # For demo, create mock widget files
        
        # Create main widget file
        widget_js = f"""
// {widget.name} v{version}
export default {{
  name: '{widget.id}',
  version: '{version}',
  
  async init(container, config) {{
    console.log('Initializing {widget.name}');
    // Widget initialization code
  }},
  
  async render(data) {{
    console.log('Rendering {widget.name}');
    // Widget rendering code
  }},
  
  async destroy() {{
    console.log('Destroying {widget.name}');
    // Cleanup code
  }}
}};
"""
        
        with open(os.path.join(install_path, 'widget.js'), 'w') as f:
            f.write(widget_js)
        
        # Create widget styles
        widget_css = f"""
/* {widget.name} Styles */
.widget-{widget.id} {{
  padding: 1rem;
  border-radius: 8px;
  background: var(--widget-background);
}}
"""
        
        with open(os.path.join(install_path, 'widget.css'), 'w') as f:
            f.write(widget_css)
        
        # Create README
        readme = f"""# {widget.name}

{widget.description}

## Installation
This widget has been installed automatically.

## Usage
Configure the widget through the admin panel.

## Author
{widget.author} ({widget.author_email})

## License
{widget.license}
"""
        
        with open(os.path.join(install_path, 'README.md'), 'w') as f:
            f.write(readme)
    
    async def _initialize_widget(self, widget: InstalledWidget):
        """Initialize an installed widget"""
        logger.info(f"Initializing widget {widget.widget_id}")
        # Widget initialization logic would go here
        # For now, just log
    
    async def uninstall_widget(self, widget_id: str) -> bool:
        """Uninstall a widget"""
        if widget_id not in self.installed_widgets:
            raise ValueError(f"Widget {widget_id} is not installed")
        
        installed_widget = self.installed_widgets[widget_id]
        
        logger.info(f"Uninstalling widget {widget_id}")
        
        try:
            # Remove widget files
            if os.path.exists(installed_widget.install_path):
                shutil.rmtree(installed_widget.install_path)
            
            # Remove from registry
            del self.installed_widgets[widget_id]
            
            logger.info(f"Successfully uninstalled widget {widget_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to uninstall widget: {str(e)}")
            raise
    
    async def update_widget(self, widget_id: str, 
                          target_version: Optional[str] = None) -> InstalledWidget:
        """Update an installed widget"""
        if widget_id not in self.installed_widgets:
            raise ValueError(f"Widget {widget_id} is not installed")
        
        installed_widget = self.installed_widgets[widget_id]
        current_version = installed_widget.installed_version
        
        # Get latest version if not specified
        if not target_version:
            target_version = installed_widget.metadata.current_version.version
        
        if current_version == target_version:
            raise ValueError(f"Widget {widget_id} is already at version {target_version}")
        
        logger.info(f"Updating widget {widget_id} from {current_version} to {target_version}")
        
        # Backup current installation
        backup_path = f"{installed_widget.install_path}_backup"
        shutil.copytree(installed_widget.install_path, backup_path)
        
        try:
            # Download new version
            await self._download_widget(
                installed_widget.metadata, 
                target_version, 
                installed_widget.install_path
            )
            
            # Update version
            installed_widget.installed_version = target_version
            
            # Update manifest
            manifest_path = os.path.join(installed_widget.install_path, 'widget.json')
            with open(manifest_path, 'w') as f:
                json.dump({
                    'widget_id': widget_id,
                    'metadata': self._metadata_to_dict(installed_widget.metadata),
                    'installed_version': target_version,
                    'installed_at': installed_widget.installed_at.isoformat(),
                    'is_enabled': installed_widget.is_enabled,
                    'config': installed_widget.config
                }, f, indent=2)
            
            # Remove backup
            shutil.rmtree(backup_path)
            
            logger.info(f"Successfully updated widget {widget_id} to {target_version}")
            return installed_widget
            
        except Exception as e:
            # Restore backup on failure
            if os.path.exists(backup_path):
                shutil.rmtree(installed_widget.install_path)
                shutil.move(backup_path, installed_widget.install_path)
            raise Exception(f"Failed to update widget: {str(e)}")
    
    def get_widget_status(self, widget_id: str) -> WidgetStatus:
        """Get widget installation status"""
        if widget_id not in self.available_widgets:
            return WidgetStatus.INCOMPATIBLE
        
        if widget_id not in self.installed_widgets:
            return WidgetStatus.AVAILABLE
        
        installed = self.installed_widgets[widget_id]
        available = self.available_widgets[widget_id]
        
        if installed.installed_version != available.current_version.version:
            return WidgetStatus.UPDATE_AVAILABLE
        
        return WidgetStatus.INSTALLED
    
    def enable_widget(self, widget_id: str):
        """Enable a widget"""
        if widget_id not in self.installed_widgets:
            raise ValueError(f"Widget {widget_id} is not installed")
        
        self.installed_widgets[widget_id].is_enabled = True
        self._update_widget_manifest(widget_id)
    
    def disable_widget(self, widget_id: str):
        """Disable a widget"""
        if widget_id not in self.installed_widgets:
            raise ValueError(f"Widget {widget_id} is not installed")
        
        self.installed_widgets[widget_id].is_enabled = False
        self._update_widget_manifest(widget_id)
    
    def configure_widget(self, widget_id: str, config: Dict[str, Any]):
        """Configure a widget"""
        if widget_id not in self.installed_widgets:
            raise ValueError(f"Widget {widget_id} is not installed")
        
        self.installed_widgets[widget_id].config = config
        self._update_widget_manifest(widget_id)
    
    def _update_widget_manifest(self, widget_id: str):
        """Update widget manifest file"""
        installed_widget = self.installed_widgets[widget_id]
        manifest_path = os.path.join(installed_widget.install_path, 'widget.json')
        
        with open(manifest_path, 'w') as f:
            json.dump({
                'widget_id': widget_id,
                'metadata': self._metadata_to_dict(installed_widget.metadata),
                'installed_version': installed_widget.installed_version,
                'installed_at': installed_widget.installed_at.isoformat(),
                'is_enabled': installed_widget.is_enabled,
                'config': installed_widget.config
            }, f, indent=2)
    
    def _metadata_to_dict(self, metadata: WidgetMetadata) -> Dict[str, Any]:
        """Convert metadata to dictionary"""
        return {
            'id': metadata.id,
            'name': metadata.name,
            'description': metadata.description,
            'category': metadata.category.value,
            'author': metadata.author,
            'author_email': metadata.author_email,
            'license': metadata.license,
            'homepage': metadata.homepage,
            'repository': metadata.repository,
            'tags': metadata.tags,
            'screenshots': metadata.screenshots,
            'icon': metadata.icon,
            'current_version': {
                'version': metadata.current_version.version,
                'release_date': metadata.current_version.release_date.isoformat(),
                'min_app_version': metadata.current_version.min_app_version,
                'max_app_version': metadata.current_version.max_app_version,
                'changelog': metadata.current_version.changelog,
                'download_url': metadata.current_version.download_url,
                'checksum': metadata.current_version.checksum,
                'size_bytes': metadata.current_version.size_bytes
            },
            'dependencies': metadata.dependencies,
            'permissions': metadata.permissions,
            'rating': metadata.rating,
            'downloads': metadata.downloads,
            'created_at': metadata.created_at.isoformat(),
            'updated_at': metadata.updated_at.isoformat()
        }
    
    def get_marketplace_stats(self) -> Dict[str, Any]:
        """Get marketplace statistics"""
        return {
            'total_available': len(self.available_widgets),
            'total_installed': len(self.installed_widgets),
            'categories': {
                category.value: len([
                    w for w in self.available_widgets.values()
                    if w.category == category
                ])
                for category in WidgetCategory
            },
            'installed_by_category': {
                category.value: len([
                    w for w in self.installed_widgets.values()
                    if w.metadata.category == category
                ])
                for category in WidgetCategory
            },
            'total_downloads': sum(
                w.downloads for w in self.available_widgets.values()
            ),
            'average_rating': sum(
                w.rating for w in self.available_widgets.values()
            ) / len(self.available_widgets) if self.available_widgets else 0
        }

# Global widget marketplace instance
widget_marketplace = WidgetMarketplace()