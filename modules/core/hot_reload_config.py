import os
import json
import logging
import asyncio
from typing import Dict, Any, Callable, List, Optional
from pathlib import Path
from datetime import datetime
import aiofiles
import watchdog.observers
import watchdog.events
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass
class ConfigChange:
    """Represents a configuration change"""
    timestamp: datetime
    file_path: str
    old_value: Any
    new_value: Any
    key_path: str  # e.g., "rag.embedding.model"

class ConfigWatcher(watchdog.events.FileSystemEventHandler):
    """Watches configuration files for changes"""
    
    def __init__(self, config_manager: 'HotReloadConfigManager'):
        self.config_manager = config_manager
    
    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith(('.json', '.yaml', '.yml', '.env')):
            logger.info(f"Configuration file modified: {event.src_path}")
            asyncio.create_task(self.config_manager.reload_config(event.src_path))

class HotReloadConfigManager:
    """Manages configuration with hot-reload capabilities"""
    
    def __init__(self, config_dir: Optional[str] = None):
        self.config_dir = config_dir or os.path.join(
            Path(__file__).parent.parent.parent, 'config'
        )
        os.makedirs(self.config_dir, exist_ok=True)
        
        # Current configuration
        self.config: Dict[str, Any] = {}
        
        # Configuration files being watched
        self.config_files: Dict[str, Dict[str, Any]] = {}
        
        # Callbacks for configuration changes
        self.change_callbacks: Dict[str, List[Callable]] = {}
        
        # File watcher
        self.observer = watchdog.observers.Observer()
        self.event_handler = ConfigWatcher(self)
        
        # Change history
        self.change_history: List[ConfigChange] = []
        self.max_history = 100
        
        # Lock for thread safety
        self.lock = asyncio.Lock()
    
    async def start(self):
        """Start configuration watching"""
        # Load initial configuration
        await self.load_all_configs()
        
        # Start file watcher
        self.observer.schedule(self.event_handler, self.config_dir, recursive=True)
        self.observer.start()
        
        logger.info(f"Started hot-reload configuration manager for {self.config_dir}")
    
    def stop(self):
        """Stop configuration watching"""
        self.observer.stop()
        self.observer.join()
        logger.info("Stopped hot-reload configuration manager")
    
    async def load_all_configs(self):
        """Load all configuration files"""
        for file_path in Path(self.config_dir).rglob('*'):
            if file_path.is_file() and file_path.suffix in ['.json', '.yaml', '.yml', '.env']:
                await self.load_config_file(str(file_path))
    
    async def load_config_file(self, file_path: str):
        """Load a single configuration file"""
        try:
            async with self.lock:
                if file_path.endswith('.json'):
                    config = await self._load_json(file_path)
                elif file_path.endswith(('.yaml', '.yml')):
                    config = await self._load_yaml(file_path)
                elif file_path.endswith('.env'):
                    config = await self._load_env(file_path)
                else:
                    return
                
                # Store config
                relative_path = os.path.relpath(file_path, self.config_dir)
                self.config_files[relative_path] = config
                
                # Merge into main config
                self._merge_config(config)
                
                logger.info(f"Loaded configuration from {file_path}")
                
        except Exception as e:
            logger.error(f"Failed to load config file {file_path}: {str(e)}")
    
    async def _load_json(self, file_path: str) -> Dict[str, Any]:
        """Load JSON configuration file"""
        async with aiofiles.open(file_path, 'r') as f:
            content = await f.read()
            return json.loads(content)
    
    async def _load_yaml(self, file_path: str) -> Dict[str, Any]:
        """Load YAML configuration file"""
        try:
            import yaml
            async with aiofiles.open(file_path, 'r') as f:
                content = await f.read()
                return yaml.safe_load(content)
        except ImportError:
            logger.warning("PyYAML not installed, skipping YAML file")
            return {}
    
    async def _load_env(self, file_path: str) -> Dict[str, Any]:
        """Load .env configuration file"""
        config = {}
        async with aiofiles.open(file_path, 'r') as f:
            async for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()
        return config
    
    def _merge_config(self, new_config: Dict[str, Any]):
        """Merge new configuration into main config"""
        def deep_merge(base: Dict, update: Dict):
            for key, value in update.items():
                if isinstance(value, dict) and key in base and isinstance(base[key], dict):
                    deep_merge(base[key], value)
                else:
                    base[key] = value
        
        deep_merge(self.config, new_config)
    
    async def reload_config(self, file_path: str):
        """Reload a specific configuration file"""
        try:
            relative_path = os.path.relpath(file_path, self.config_dir)
            old_config = self.config_files.get(relative_path, {}).copy()
            
            # Load new config
            await self.load_config_file(file_path)
            new_config = self.config_files.get(relative_path, {})
            
            # Find changes
            changes = self._find_changes(old_config, new_config)
            
            # Record changes
            for change in changes:
                self._record_change(change)
            
            # Notify callbacks
            await self._notify_changes(changes)
            
        except Exception as e:
            logger.error(f"Failed to reload config {file_path}: {str(e)}")
    
    def _find_changes(self, old_config: Dict, new_config: Dict, 
                     prefix: str = "") -> List[ConfigChange]:
        """Find all changes between old and new config"""
        changes = []
        
        # Check for changed or new keys
        for key, new_value in new_config.items():
            key_path = f"{prefix}.{key}" if prefix else key
            old_value = old_config.get(key)
            
            if isinstance(new_value, dict) and isinstance(old_value, dict):
                # Recursive check for nested dicts
                changes.extend(self._find_changes(old_value, new_value, key_path))
            elif old_value != new_value:
                changes.append(ConfigChange(
                    timestamp=datetime.now(),
                    file_path=self.config_dir,
                    old_value=old_value,
                    new_value=new_value,
                    key_path=key_path
                ))
        
        # Check for removed keys
        for key in old_config:
            if key not in new_config:
                key_path = f"{prefix}.{key}" if prefix else key
                changes.append(ConfigChange(
                    timestamp=datetime.now(),
                    file_path=self.config_dir,
                    old_value=old_config[key],
                    new_value=None,
                    key_path=key_path
                ))
        
        return changes
    
    def _record_change(self, change: ConfigChange):
        """Record configuration change in history"""
        self.change_history.append(change)
        
        # Limit history size
        if len(self.change_history) > self.max_history:
            self.change_history = self.change_history[-self.max_history:]
    
    async def _notify_changes(self, changes: List[ConfigChange]):
        """Notify registered callbacks about changes"""
        for change in changes:
            # Notify exact key callbacks
            if change.key_path in self.change_callbacks:
                for callback in self.change_callbacks[change.key_path]:
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(change)
                        else:
                            callback(change)
                    except Exception as e:
                        logger.error(f"Callback error for {change.key_path}: {str(e)}")
            
            # Notify wildcard callbacks
            for pattern, callbacks in self.change_callbacks.items():
                if pattern.endswith('*') and change.key_path.startswith(pattern[:-1]):
                    for callback in callbacks:
                        try:
                            if asyncio.iscoroutinefunction(callback):
                                await callback(change)
                            else:
                                callback(change)
                        except Exception as e:
                            logger.error(f"Wildcard callback error for {pattern}: {str(e)}")
    
    def register_callback(self, key_path: str, callback: Callable):
        """Register callback for configuration changes"""
        if key_path not in self.change_callbacks:
            self.change_callbacks[key_path] = []
        self.change_callbacks[key_path].append(callback)
        logger.info(f"Registered callback for config key: {key_path}")
    
    def get(self, key_path: str, default: Any = None) -> Any:
        """Get configuration value by key path"""
        keys = key_path.split('.')
        value = self.config
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default
        
        return value
    
    async def set(self, key_path: str, value: Any, persist: bool = True):
        """Set configuration value"""
        async with self.lock:
            keys = key_path.split('.')
            config = self.config
            
            # Navigate to the parent dict
            for key in keys[:-1]:
                if key not in config:
                    config[key] = {}
                config = config[key]
            
            # Record old value
            old_value = config.get(keys[-1])
            
            # Set new value
            config[keys[-1]] = value
            
            # Create change record
            change = ConfigChange(
                timestamp=datetime.now(),
                file_path="runtime",
                old_value=old_value,
                new_value=value,
                key_path=key_path
            )
            
            self._record_change(change)
            await self._notify_changes([change])
            
            # Persist to file if requested
            if persist:
                await self._persist_change(key_path, value)
    
    async def _persist_change(self, key_path: str, value: Any):
        """Persist configuration change to file"""
        # For simplicity, save to a runtime config file
        runtime_config_path = os.path.join(self.config_dir, 'runtime.json')
        
        try:
            # Load existing runtime config
            if os.path.exists(runtime_config_path):
                async with aiofiles.open(runtime_config_path, 'r') as f:
                    runtime_config = json.loads(await f.read())
            else:
                runtime_config = {}
            
            # Update value
            keys = key_path.split('.')
            config = runtime_config
            for key in keys[:-1]:
                if key not in config:
                    config[key] = {}
                config = config[key]
            config[keys[-1]] = value
            
            # Save back
            async with aiofiles.open(runtime_config_path, 'w') as f:
                await f.write(json.dumps(runtime_config, indent=2))
            
            logger.info(f"Persisted config change: {key_path} = {value}")
            
        except Exception as e:
            logger.error(f"Failed to persist config change: {str(e)}")
    
    def get_change_history(self, key_path: Optional[str] = None) -> List[ConfigChange]:
        """Get configuration change history"""
        if key_path:
            return [c for c in self.change_history if c.key_path == key_path]
        return self.change_history.copy()
    
    async def export_config(self, file_path: str):
        """Export current configuration to file"""
        async with aiofiles.open(file_path, 'w') as f:
            await f.write(json.dumps(self.config, indent=2))
        logger.info(f"Exported configuration to {file_path}")
    
    def validate_config(self, schema: Dict[str, Any]) -> List[str]:
        """Validate configuration against schema"""
        errors = []
        
        # Simple validation example - can be extended with jsonschema
        def validate_dict(config: Dict, schema: Dict, path: str = ""):
            for key, rules in schema.items():
                full_path = f"{path}.{key}" if path else key
                
                if 'required' in rules and rules['required'] and key not in config:
                    errors.append(f"Missing required key: {full_path}")
                
                if key in config:
                    value = config[key]
                    
                    if 'type' in rules:
                        expected_type = rules['type']
                        if not isinstance(value, expected_type):
                            errors.append(
                                f"Type mismatch for {full_path}: "
                                f"expected {expected_type.__name__}, "
                                f"got {type(value).__name__}"
                            )
                    
                    if 'min' in rules and isinstance(value, (int, float)):
                        if value < rules['min']:
                            errors.append(
                                f"Value for {full_path} below minimum: "
                                f"{value} < {rules['min']}"
                            )
                    
                    if 'max' in rules and isinstance(value, (int, float)):
                        if value > rules['max']:
                            errors.append(
                                f"Value for {full_path} above maximum: "
                                f"{value} > {rules['max']}"
                            )
                    
                    if 'nested' in rules and isinstance(value, dict):
                        validate_dict(value, rules['nested'], full_path)
        
        validate_dict(self.config, schema)
        return errors

# Global hot-reload config manager
config_manager = HotReloadConfigManager()