"""
RAG Settings Comprehensive API Endpoints
Manages RAG system configuration and settings
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import os

from modules.core.logging import LogManager
from modules.core.auth_dependency import get_current_user, get_admin_user as require_admin
from modules.core.config import Config
from modules.core.db import DBManager

# Initialize components
logger = LogManager.setup_logging(__name__)

db_manager = DBManager()

router = APIRouter()

# Pydantic models
class MetadataField(BaseModel):
    name: str
    type: str  # string, number, date, boolean

class RAGSettings(BaseModel):
    # Model Configuration
    embeddingModel: str
    rerankerModel: str
    vectorDimensions: int
    
    # Retrieval Settings
    topK: int
    similarityThreshold: float
    hybridSearch: bool
    hybridAlpha: float
    
    # Chunking Settings
    chunkSize: int
    chunkOverlap: int
    chunkingStrategy: str
    preserveContext: bool
    
    # Performance Settings
    cacheEnabled: bool
    cacheTTL: int
    batchSize: int
    maxConcurrency: int
    
    # Quality Settings
    minQualityScore: int
    duplicateDetection: bool
    autoCorrection: bool
    contextEnrichment: bool
    
    # Advanced Settings
    customPromptTemplate: str
    metadataFields: List[MetadataField]

class SettingsUpdateResult(BaseModel):
    success: bool
    message: str
    applied_at: datetime

class PresetInfo(BaseModel):
    id: str
    name: str
    description: str
    settings: Dict[str, Any]

class PerformanceMetrics(BaseModel):
    avg_query_time_ms: float
    avg_embedding_time_ms: float
    cache_hit_rate: float
    total_queries_today: int
    total_embeddings_generated: int
    index_size_mb: float
    last_reindex_date: Optional[datetime]

class ModelInfo(BaseModel):
    model_id: str
    model_name: str
    description: str
    dimensions: int
    performance_score: float
    accuracy_score: float
    is_available: bool

# Default settings
DEFAULT_SETTINGS = {
    "embeddingModel": "sentence-transformers/all-MiniLM-L6-v2",
    "rerankerModel": "none",
    "vectorDimensions": 384,
    "topK": 10,
    "similarityThreshold": 0.7,
    "hybridSearch": True,
    "hybridAlpha": 0.5,
    "chunkSize": 1000,
    "chunkOverlap": 200,
    "chunkingStrategy": "semantic",
    "preserveContext": True,
    "cacheEnabled": True,
    "cacheTTL": 60,
    "batchSize": 10,
    "maxConcurrency": 4,
    "minQualityScore": 70,
    "duplicateDetection": True,
    "autoCorrection": True,
    "contextEnrichment": True,
    "customPromptTemplate": "",
    "metadataFields": [
        {"name": "author", "type": "string"},
        {"name": "created_date", "type": "date"},
        {"name": "category", "type": "string"}
    ]
}

# Helper functions
def load_settings_from_file() -> Dict[str, Any]:
    """Load settings from configuration file"""
    settings_file = "data/rag_settings.json"
    if os.path.exists(settings_file):
        try:
            with open(settings_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading settings file: {e}")
    return DEFAULT_SETTINGS.copy()

def save_settings_to_file(settings: Dict[str, Any]):
    """Save settings to configuration file"""
    settings_file = "data/rag_settings.json"
    os.makedirs("data", exist_ok=True)
    try:
        with open(settings_file, 'w') as f:
            json.dump(settings, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving settings file: {e}")
        raise

def validate_settings(settings: RAGSettings) -> List[str]:
    """Validate settings and return list of warnings"""
    warnings = []
    
    # Validate vector dimensions
    if settings.vectorDimensions not in [128, 256, 384, 512, 768, 1024]:
        warnings.append("Vector dimensions should be a power of 2 between 128 and 1024")
    
    # Validate chunk settings
    if settings.chunkOverlap >= settings.chunkSize:
        warnings.append("Chunk overlap should be less than chunk size")
    
    # Validate similarity threshold
    if settings.similarityThreshold < 0 or settings.similarityThreshold > 1:
        warnings.append("Similarity threshold should be between 0 and 1")
    
    # Validate hybrid alpha
    if settings.hybridSearch and (settings.hybridAlpha < 0 or settings.hybridAlpha > 1):
        warnings.append("Hybrid alpha should be between 0 and 1")
    
    return warnings

# Endpoints
@router.get("/settings", response_model=RAGSettings)
async def get_rag_settings(user: Dict[str, Any] = Depends(require_admin)):
    """Get current RAG settings"""
    try:
        settings = load_settings_from_file()
        return RAGSettings(**settings)
    except Exception as e:
        logger.error(f"Error getting RAG settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/settings", response_model=SettingsUpdateResult)
async def update_rag_settings(settings: RAGSettings, user: Dict[str, Any] = Depends(require_admin)):
    """Update RAG settings"""
    try:
        # Validate settings
        warnings = validate_settings(settings)
        if warnings:
            logger.warning(f"Settings validation warnings: {warnings}")
        
        # Save settings
        settings_dict = settings.dict()
        save_settings_to_file(settings_dict)
        
        # Apply settings to RAG engine if available
        try:
            from modules.rag.engine import RAGEngine
            rag_engine = RAGEngine()
            rag_engine.update_settings(settings_dict)
            logger.info("RAG engine settings updated")
        except Exception as e:
            logger.warning(f"Could not update RAG engine settings: {e}")
        
        return SettingsUpdateResult(
            success=True,
            message="Settings updated successfully" + (f" (Warnings: {', '.join(warnings)})" if warnings else ""),
            applied_at=datetime.now()
        )
    except Exception as e:
        logger.error(f"Error updating RAG settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/presets", response_model=List[PresetInfo])
async def get_presets(user: Dict[str, Any] = Depends(require_admin)):
    """Get available presets"""
    presets = [
        {
            "id": "fast",
            "name": "Schnell",
            "description": "Optimiert für schnelle Antwortzeiten",
            "settings": {
                "embeddingModel": "sentence-transformers/all-MiniLM-L6-v2",
                "topK": 5,
                "chunkSize": 500,
                "cacheEnabled": True,
                "batchSize": 20,
                "maxConcurrency": 6
            }
        },
        {
            "id": "balanced",
            "name": "Ausgewogen",
            "description": "Balance zwischen Geschwindigkeit und Genauigkeit",
            "settings": {
                "embeddingModel": "sentence-transformers/all-mpnet-base-v2",
                "topK": 10,
                "chunkSize": 1000,
                "cacheEnabled": True,
                "batchSize": 10,
                "maxConcurrency": 4
            }
        },
        {
            "id": "accurate",
            "name": "Präzise",
            "description": "Maximale Genauigkeit und Relevanz",
            "settings": {
                "embeddingModel": "sentence-transformers/all-roberta-large-v1",
                "rerankerModel": "cross-encoder/ms-marco-MiniLM-L-12-v2",
                "topK": 20,
                "chunkSize": 1500,
                "contextEnrichment": True,
                "batchSize": 5,
                "maxConcurrency": 2
            }
        }
    ]
    
    return [PresetInfo(**preset) for preset in presets]

@router.post("/apply-preset/{preset_id}", response_model=SettingsUpdateResult)
async def apply_preset(preset_id: str, user: Dict[str, Any] = Depends(require_admin)):
    """Apply a preset configuration"""
    try:
        # Get presets
        presets = await get_presets(_)
        preset = next((p for p in presets if p.id == preset_id), None)
        
        if not preset:
            raise HTTPException(status_code=404, detail="Preset not found")
        
        # Load current settings
        current_settings = load_settings_from_file()
        
        # Apply preset settings
        for key, value in preset.settings.items():
            if key in current_settings:
                current_settings[key] = value
        
        # Save updated settings
        save_settings_to_file(current_settings)
        
        # Apply to RAG engine
        try:
            from modules.rag.engine import RAGEngine
            rag_engine = RAGEngine()
            rag_engine.update_settings(current_settings)
        except Exception as e:
            logger.warning(f"Could not update RAG engine settings: {e}")
        
        return SettingsUpdateResult(
            success=True,
            message=f"Preset '{preset.name}' applied successfully",
            applied_at=datetime.now()
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying preset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance", response_model=PerformanceMetrics)
async def get_performance_metrics(user: Dict[str, Any] = Depends(require_admin)):
    """Get RAG system performance metrics"""
    try:
        # Calculate metrics (mock data for now)
        # In a real system, these would come from monitoring/logging
        return PerformanceMetrics(
            avg_query_time_ms=150.5,
            avg_embedding_time_ms=25.3,
            cache_hit_rate=0.78,
            total_queries_today=1234,
            total_embeddings_generated=456,
            index_size_mb=125.6,
            last_reindex_date=datetime.now()
        )
    except Exception as e:
        logger.error(f"Error getting performance metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available-models", response_model=List[ModelInfo])
async def get_available_models(user: Dict[str, Any] = Depends(require_admin)):
    """Get list of available embedding and reranker models"""
    models = [
        # Embedding models
        {
            "model_id": "sentence-transformers/all-MiniLM-L6-v2",
            "model_name": "all-MiniLM-L6-v2",
            "description": "Schnelles, kompaktes Modell für allgemeine Zwecke",
            "dimensions": 384,
            "performance_score": 0.9,
            "accuracy_score": 0.7,
            "is_available": True
        },
        {
            "model_id": "sentence-transformers/all-mpnet-base-v2",
            "model_name": "all-mpnet-base-v2",
            "description": "Ausgewogenes Modell mit guter Genauigkeit",
            "dimensions": 768,
            "performance_score": 0.7,
            "accuracy_score": 0.85,
            "is_available": True
        },
        {
            "model_id": "sentence-transformers/all-roberta-large-v1",
            "model_name": "all-roberta-large-v1",
            "description": "Hochpräzises Modell für anspruchsvolle Aufgaben",
            "dimensions": 1024,
            "performance_score": 0.5,
            "accuracy_score": 0.95,
            "is_available": True
        },
        # Reranker models
        {
            "model_id": "cross-encoder/ms-marco-MiniLM-L-6-v2",
            "model_name": "ms-marco-MiniLM-L-6-v2",
            "description": "Schneller Cross-Encoder für Reranking",
            "dimensions": 0,
            "performance_score": 0.8,
            "accuracy_score": 0.8,
            "is_available": True
        },
        {
            "model_id": "cross-encoder/ms-marco-MiniLM-L-12-v2",
            "model_name": "ms-marco-MiniLM-L-12-v2",
            "description": "Präziser Cross-Encoder für Reranking",
            "dimensions": 0,
            "performance_score": 0.6,
            "accuracy_score": 0.9,
            "is_available": True
        }
    ]
    
    return [ModelInfo(**model) for model in models]

@router.post("/test-settings", response_model=Dict[str, Any])
async def test_settings(settings: RAGSettings, test_query: str = "Test query", user: Dict[str, Any] = Depends(require_admin)):
    """Test RAG settings with a sample query"""
    try:
        # Mock test results
        # In a real system, this would actually test the settings
        results = {
            "query": test_query,
            "processing_time_ms": 125.5,
            "chunks_retrieved": settings.topK,
            "avg_similarity_score": 0.82,
            "reranking_applied": settings.rerankerModel != "none",
            "cache_used": settings.cacheEnabled,
            "test_successful": True,
            "sample_results": [
                {
                    "chunk": "Dies ist ein Beispiel-Chunk aus der Wissensdatenbank...",
                    "similarity": 0.89,
                    "metadata": {"source": "manual.pdf", "page": 42}
                },
                {
                    "chunk": "Ein weiterer relevanter Textabschnitt...",
                    "similarity": 0.75,
                    "metadata": {"source": "faq.docx", "section": "Installation"}
                }
            ]
        }
        
        return results
    except Exception as e:
        logger.error(f"Error testing settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset-to-defaults", response_model=SettingsUpdateResult)
async def reset_to_defaults(user: Dict[str, Any] = Depends(require_admin)):
    """Reset all settings to defaults"""
    try:
        save_settings_to_file(DEFAULT_SETTINGS)
        
        # Apply to RAG engine
        try:
            from modules.rag.engine import RAGEngine
            rag_engine = RAGEngine()
            rag_engine.update_settings(DEFAULT_SETTINGS)
        except Exception as e:
            logger.warning(f"Could not update RAG engine settings: {e}")
        
        return SettingsUpdateResult(
            success=True,
            message="Settings reset to defaults",
            applied_at=datetime.now()
        )
    except Exception as e:
        logger.error(f"Error resetting to defaults: {e}")
        raise HTTPException(status_code=500, detail=str(e))