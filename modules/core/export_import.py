import logging
import json
import csv
import io
import zipfile
import asyncio
from typing import Dict, List, Any, Optional, Union, BinaryIO, Callable
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
import pandas as pd
import openpyxl
from pathlib import Path
import xml.etree.ElementTree as ET
import yaml

logger = logging.getLogger(__name__)

class ExportFormat(Enum):
    JSON = "json"
    CSV = "csv"
    EXCEL = "excel"
    XML = "xml"
    YAML = "yaml"
    ZIP = "zip"  # Multiple formats in archive

@dataclass
class ExportConfig:
    """Export configuration"""
    format: ExportFormat
    include_metadata: bool = True
    include_relations: bool = True
    compress: bool = False
    encryption_key: Optional[str] = None
    filters: Dict[str, Any] = None
    fields: Optional[List[str]] = None  # Specific fields to export
    
@dataclass
class ImportConfig:
    """Import configuration"""
    format: ExportFormat
    validate: bool = True
    update_existing: bool = False
    skip_errors: bool = False
    mapping: Optional[Dict[str, str]] = None  # Field mapping
    defaults: Optional[Dict[str, Any]] = None  # Default values

@dataclass
class ExportResult:
    """Export operation result"""
    success: bool
    format: ExportFormat
    total_items: int
    file_size: int
    file_path: Optional[str] = None
    data: Optional[bytes] = None
    errors: List[str] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []

@dataclass
class ImportResult:
    """Import operation result"""
    success: bool
    total_items: int
    imported_items: int
    updated_items: int
    failed_items: int
    errors: List[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []

class DataExporter:
    """Universal data export functionality"""
    
    def __init__(self):
        self.exporters = {
            ExportFormat.JSON: self._export_json,
            ExportFormat.CSV: self._export_csv,
            ExportFormat.EXCEL: self._export_excel,
            ExportFormat.XML: self._export_xml,
            ExportFormat.YAML: self._export_yaml,
            ExportFormat.ZIP: self._export_zip
        }
    
    async def export_data(self, data: List[Dict[str, Any]], 
                         config: ExportConfig) -> ExportResult:
        """Export data in specified format"""
        try:
            # Apply filters
            if config.filters:
                data = self._apply_filters(data, config.filters)
            
            # Select fields
            if config.fields:
                data = self._select_fields(data, config.fields)
            
            # Get exporter
            exporter = self.exporters.get(config.format)
            if not exporter:
                raise ValueError(f"Unsupported format: {config.format}")
            
            # Export data
            result = await exporter(data, config)
            
            # Compress if requested
            if config.compress and config.format != ExportFormat.ZIP:
                result = self._compress_result(result)
            
            # Encrypt if requested
            if config.encryption_key:
                result = self._encrypt_result(result, config.encryption_key)
            
            return result
            
        except Exception as e:
            logger.error(f"Export failed: {str(e)}")
            return ExportResult(
                success=False,
                format=config.format,
                total_items=0,
                file_size=0,
                errors=[str(e)]
            )
    
    def _apply_filters(self, data: List[Dict[str, Any]], 
                      filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Apply filters to data"""
        filtered = []
        
        for item in data:
            match = True
            for field, value in filters.items():
                if field not in item or item[field] != value:
                    match = False
                    break
            if match:
                filtered.append(item)
        
        return filtered
    
    def _select_fields(self, data: List[Dict[str, Any]], 
                      fields: List[str]) -> List[Dict[str, Any]]:
        """Select specific fields from data"""
        return [
            {field: item.get(field) for field in fields}
            for item in data
        ]
    
    async def _export_json(self, data: List[Dict[str, Any]], 
                          config: ExportConfig) -> ExportResult:
        """Export to JSON format"""
        try:
            # Convert to JSON
            json_data = json.dumps(data, indent=2, default=str)
            json_bytes = json_data.encode('utf-8')
            
            return ExportResult(
                success=True,
                format=ExportFormat.JSON,
                total_items=len(data),
                file_size=len(json_bytes),
                data=json_bytes
            )
        except Exception as e:
            raise Exception(f"JSON export failed: {str(e)}")
    
    async def _export_csv(self, data: List[Dict[str, Any]], 
                         config: ExportConfig) -> ExportResult:
        """Export to CSV format"""
        try:
            if not data:
                return ExportResult(
                    success=True,
                    format=ExportFormat.CSV,
                    total_items=0,
                    file_size=0,
                    data=b''
                )
            
            # Get all fields
            fields = set()
            for item in data:
                fields.update(item.keys())
            fields = sorted(fields)
            
            # Create CSV
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=fields)
            writer.writeheader()
            writer.writerows(data)
            
            csv_data = output.getvalue().encode('utf-8')
            
            return ExportResult(
                success=True,
                format=ExportFormat.CSV,
                total_items=len(data),
                file_size=len(csv_data),
                data=csv_data
            )
        except Exception as e:
            raise Exception(f"CSV export failed: {str(e)}")
    
    async def _export_excel(self, data: List[Dict[str, Any]], 
                           config: ExportConfig) -> ExportResult:
        """Export to Excel format"""
        try:
            # Convert to DataFrame
            df = pd.DataFrame(data)
            
            # Create Excel file in memory
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Data', index=False)
                
                # Add metadata sheet if requested
                if config.include_metadata:
                    metadata = {
                        'Export Date': datetime.now().isoformat(),
                        'Total Items': len(data),
                        'Fields': list(df.columns)
                    }
                    pd.DataFrame([metadata]).to_excel(
                        writer, sheet_name='Metadata', index=False
                    )
            
            excel_data = output.getvalue()
            
            return ExportResult(
                success=True,
                format=ExportFormat.EXCEL,
                total_items=len(data),
                file_size=len(excel_data),
                data=excel_data
            )
        except Exception as e:
            raise Exception(f"Excel export failed: {str(e)}")
    
    async def _export_xml(self, data: List[Dict[str, Any]], 
                         config: ExportConfig) -> ExportResult:
        """Export to XML format"""
        try:
            # Create root element
            root = ET.Element('data')
            
            # Add metadata
            if config.include_metadata:
                metadata = ET.SubElement(root, 'metadata')
                ET.SubElement(metadata, 'export_date').text = datetime.now().isoformat()
                ET.SubElement(metadata, 'total_items').text = str(len(data))
            
            # Add items
            items = ET.SubElement(root, 'items')
            for item_data in data:
                item = ET.SubElement(items, 'item')
                for key, value in item_data.items():
                    field = ET.SubElement(item, key)
                    field.text = str(value) if value is not None else ''
            
            # Convert to string
            xml_str = ET.tostring(root, encoding='unicode')
            xml_data = xml_str.encode('utf-8')
            
            return ExportResult(
                success=True,
                format=ExportFormat.XML,
                total_items=len(data),
                file_size=len(xml_data),
                data=xml_data
            )
        except Exception as e:
            raise Exception(f"XML export failed: {str(e)}")
    
    async def _export_yaml(self, data: List[Dict[str, Any]], 
                          config: ExportConfig) -> ExportResult:
        """Export to YAML format"""
        try:
            # Convert to YAML
            yaml_data = yaml.dump(data, default_flow_style=False, allow_unicode=True)
            yaml_bytes = yaml_data.encode('utf-8')
            
            return ExportResult(
                success=True,
                format=ExportFormat.YAML,
                total_items=len(data),
                file_size=len(yaml_bytes),
                data=yaml_bytes
            )
        except Exception as e:
            raise Exception(f"YAML export failed: {str(e)}")
    
    async def _export_zip(self, data: List[Dict[str, Any]], 
                         config: ExportConfig) -> ExportResult:
        """Export to ZIP archive with multiple formats"""
        try:
            output = io.BytesIO()
            
            with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zf:
                # Export in multiple formats
                for format_type in [ExportFormat.JSON, ExportFormat.CSV, ExportFormat.XML]:
                    sub_config = ExportConfig(
                        format=format_type,
                        include_metadata=config.include_metadata,
                        include_relations=config.include_relations
                    )
                    
                    result = await self.exporters[format_type](data, sub_config)
                    if result.success:
                        filename = f"data.{format_type.value}"
                        zf.writestr(filename, result.data)
                
                # Add metadata file
                metadata = {
                    'export_date': datetime.now().isoformat(),
                    'total_items': len(data),
                    'formats': ['json', 'csv', 'xml']
                }
                zf.writestr('metadata.json', json.dumps(metadata, indent=2))
            
            zip_data = output.getvalue()
            
            return ExportResult(
                success=True,
                format=ExportFormat.ZIP,
                total_items=len(data),
                file_size=len(zip_data),
                data=zip_data
            )
        except Exception as e:
            raise Exception(f"ZIP export failed: {str(e)}")
    
    def _compress_result(self, result: ExportResult) -> ExportResult:
        """Compress export result"""
        import gzip
        
        compressed = gzip.compress(result.data)
        result.data = compressed
        result.file_size = len(compressed)
        
        return result
    
    def _encrypt_result(self, result: ExportResult, key: str) -> ExportResult:
        """Encrypt export result"""
        # Simple XOR encryption for demo - use proper encryption in production
        encrypted = bytearray()
        key_bytes = key.encode('utf-8')
        
        for i, byte in enumerate(result.data):
            encrypted.append(byte ^ key_bytes[i % len(key_bytes)])
        
        result.data = bytes(encrypted)
        return result

class DataImporter:
    """Universal data import functionality"""
    
    def __init__(self):
        self.importers = {
            ExportFormat.JSON: self._import_json,
            ExportFormat.CSV: self._import_csv,
            ExportFormat.EXCEL: self._import_excel,
            ExportFormat.XML: self._import_xml,
            ExportFormat.YAML: self._import_yaml,
            ExportFormat.ZIP: self._import_zip
        }
    
    async def import_data(self, data: Union[bytes, BinaryIO], 
                         config: ImportConfig,
                         validator: Optional[Callable] = None) -> ImportResult:
        """Import data from specified format"""
        try:
            # Get importer
            importer = self.importers.get(config.format)
            if not importer:
                raise ValueError(f"Unsupported format: {config.format}")
            
            # Import data
            items = await importer(data, config)
            
            # Apply field mapping
            if config.mapping:
                items = self._apply_mapping(items, config.mapping)
            
            # Apply defaults
            if config.defaults:
                items = self._apply_defaults(items, config.defaults)
            
            # Validate items
            valid_items = []
            errors = []
            
            for i, item in enumerate(items):
                if config.validate and validator:
                    try:
                        if validator(item):
                            valid_items.append(item)
                        else:
                            errors.append({
                                'index': i,
                                'item': item,
                                'error': 'Validation failed'
                            })
                    except Exception as e:
                        errors.append({
                            'index': i,
                            'item': item,
                            'error': str(e)
                        })
                        if not config.skip_errors:
                            raise
                else:
                    valid_items.append(item)
            
            return ImportResult(
                success=len(errors) == 0 or config.skip_errors,
                total_items=len(items),
                imported_items=len(valid_items),
                updated_items=0,  # Would be set by actual import logic
                failed_items=len(errors),
                errors=errors
            )
            
        except Exception as e:
            logger.error(f"Import failed: {str(e)}")
            return ImportResult(
                success=False,
                total_items=0,
                imported_items=0,
                updated_items=0,
                failed_items=0,
                errors=[{'error': str(e)}]
            )
    
    def _apply_mapping(self, items: List[Dict[str, Any]], 
                      mapping: Dict[str, str]) -> List[Dict[str, Any]]:
        """Apply field mapping to items"""
        mapped_items = []
        
        for item in items:
            mapped_item = {}
            for old_field, new_field in mapping.items():
                if old_field in item:
                    mapped_item[new_field] = item[old_field]
            
            # Keep unmapped fields
            for field, value in item.items():
                if field not in mapping:
                    mapped_item[field] = value
            
            mapped_items.append(mapped_item)
        
        return mapped_items
    
    def _apply_defaults(self, items: List[Dict[str, Any]], 
                       defaults: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Apply default values to items"""
        for item in items:
            for field, default_value in defaults.items():
                if field not in item or item[field] is None:
                    item[field] = default_value
        
        return items
    
    async def _import_json(self, data: Union[bytes, BinaryIO], 
                          config: ImportConfig) -> List[Dict[str, Any]]:
        """Import from JSON format"""
        try:
            if isinstance(data, bytes):
                json_str = data.decode('utf-8')
            else:
                json_str = data.read().decode('utf-8')
            
            items = json.loads(json_str)
            
            if not isinstance(items, list):
                items = [items]
            
            return items
        except Exception as e:
            raise Exception(f"JSON import failed: {str(e)}")
    
    async def _import_csv(self, data: Union[bytes, BinaryIO], 
                         config: ImportConfig) -> List[Dict[str, Any]]:
        """Import from CSV format"""
        try:
            if isinstance(data, bytes):
                csv_str = data.decode('utf-8')
                reader = csv.DictReader(io.StringIO(csv_str))
            else:
                reader = csv.DictReader(io.TextIOWrapper(data, encoding='utf-8'))
            
            return list(reader)
        except Exception as e:
            raise Exception(f"CSV import failed: {str(e)}")
    
    async def _import_excel(self, data: Union[bytes, BinaryIO], 
                           config: ImportConfig) -> List[Dict[str, Any]]:
        """Import from Excel format"""
        try:
            if isinstance(data, bytes):
                excel_data = io.BytesIO(data)
            else:
                excel_data = data
            
            # Read Excel file
            df = pd.read_excel(excel_data, sheet_name=0)
            
            # Convert to list of dicts
            items = df.to_dict('records')
            
            # Convert NaN to None
            for item in items:
                for key, value in item.items():
                    if pd.isna(value):
                        item[key] = None
            
            return items
        except Exception as e:
            raise Exception(f"Excel import failed: {str(e)}")
    
    async def _import_xml(self, data: Union[bytes, BinaryIO], 
                         config: ImportConfig) -> List[Dict[str, Any]]:
        """Import from XML format"""
        try:
            if isinstance(data, bytes):
                xml_str = data.decode('utf-8')
            else:
                xml_str = data.read().decode('utf-8')
            
            # Parse XML
            root = ET.fromstring(xml_str)
            
            items = []
            # Find items container
            items_container = root.find('items')
            if items_container is None:
                items_container = root
            
            # Parse items
            for item_elem in items_container.findall('item'):
                item = {}
                for field in item_elem:
                    item[field.tag] = field.text
                items.append(item)
            
            return items
        except Exception as e:
            raise Exception(f"XML import failed: {str(e)}")
    
    async def _import_yaml(self, data: Union[bytes, BinaryIO], 
                          config: ImportConfig) -> List[Dict[str, Any]]:
        """Import from YAML format"""
        try:
            if isinstance(data, bytes):
                yaml_str = data.decode('utf-8')
            else:
                yaml_str = data.read().decode('utf-8')
            
            items = yaml.safe_load(yaml_str)
            
            if not isinstance(items, list):
                items = [items]
            
            return items
        except Exception as e:
            raise Exception(f"YAML import failed: {str(e)}")
    
    async def _import_zip(self, data: Union[bytes, BinaryIO], 
                         config: ImportConfig) -> List[Dict[str, Any]]:
        """Import from ZIP archive"""
        try:
            if isinstance(data, bytes):
                zip_data = io.BytesIO(data)
            else:
                zip_data = data
            
            all_items = []
            
            with zipfile.ZipFile(zip_data, 'r') as zf:
                # Try to find and import JSON first (most complete format)
                for filename in zf.namelist():
                    if filename.endswith('.json') and not filename.startswith('metadata'):
                        json_data = zf.read(filename)
                        items = await self._import_json(json_data, config)
                        all_items.extend(items)
                        break
                else:
                    # Try CSV if no JSON found
                    for filename in zf.namelist():
                        if filename.endswith('.csv'):
                            csv_data = zf.read(filename)
                            items = await self._import_csv(csv_data, config)
                            all_items.extend(items)
                            break
            
            return all_items
        except Exception as e:
            raise Exception(f"ZIP import failed: {str(e)}")

# Global instances
exporter = DataExporter()
importer = DataImporter()