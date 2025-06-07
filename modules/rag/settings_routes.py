"""
RAG Settings Routes
Endpoints for managing RAG system configuration
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["rag-settings"])


# Pydantic models for request/response
class ModelConfig(BaseModel):
    """Model configuration"""
    name: str
    provider: str
    max_tokens: int = 4096
    temperature: float = 0.7


class EmbeddingConfig(BaseModel):
    """Embedding configuration"""
    model: str
    dimension: int
    provider: str


class RetrievalConfig(BaseModel):
    """Retrieval configuration"""
    chunk_size: int = 512
    chunk_overlap: int = 50
    top_k: int = 5
    similarity_threshold: float = 0.7
    rerank_enabled: bool = True


class ProcessingConfig(BaseModel):
    """Document processing configuration"""
    ocr_enabled: bool = True
    language_detection: bool = True
    metadata_extraction: bool = True
    auto_categorization: bool = False


class RAGSettings(BaseModel):
    """Complete RAG settings"""
    model: ModelConfig
    embedding: EmbeddingConfig
    retrieval: RetrievalConfig
    processing: ProcessingConfig
    cache_enabled: bool = True
    debug_mode: bool = False
    last_updated: Optional[datetime] = None


class RAGPreset(BaseModel):
    """RAG configuration preset"""
    id: str
    name: str
    description: str
    settings: RAGSettings
    is_default: bool = False


class UpdateSettingsRequest(BaseModel):
    """Request model for updating settings"""
    model: Optional[ModelConfig] = None
    embedding: Optional[EmbeddingConfig] = None
    retrieval: Optional[RetrievalConfig] = None
    processing: Optional[ProcessingConfig] = None
    cache_enabled: Optional[bool] = None
    debug_mode: Optional[bool] = None


class ApplyPresetRequest(BaseModel):
    """Request model for applying a preset"""
    preset_id: str


class AvailableModel(BaseModel):
    """Available model information"""
    id: str
    name: str
    provider: str
    type: str  # "llm", "embedding", or "reranker"
    max_tokens: Optional[int] = None
    dimension: Optional[int] = None
    description: str
    recommended: bool = False


# Mock data for current settings - reflecting actual installed models
current_settings = RAGSettings(
    model=ModelConfig(
        name="mistral:7b-instruct",
        provider="ollama",
        max_tokens=4096,
        temperature=0.7
    ),
    embedding=EmbeddingConfig(
        model="BAAI/bge-m3",
        dimension=1024,
        provider="local"
    ),
    retrieval=RetrievalConfig(
        chunk_size=512,
        chunk_overlap=50,
        top_k=5,
        similarity_threshold=0.7,
        rerank_enabled=True
    ),
    processing=ProcessingConfig(
        ocr_enabled=True,
        language_detection=True,
        metadata_extraction=True,
        auto_categorization=False
    ),
    cache_enabled=True,
    debug_mode=False,
    last_updated=datetime.now()
)

# Presets using actual installed models
presets = [
    RAGPreset(
        id="high-accuracy",
        name="High Accuracy",
        description="Optimized for accuracy with larger context and reranking",
        settings=RAGSettings(
            model=ModelConfig(
                name="mistral:7b-instruct",
                provider="ollama",
                max_tokens=8192,
                temperature=0.3
            ),
            embedding=EmbeddingConfig(
                model="BAAI/bge-m3",
                dimension=1024,
                provider="local"
            ),
            retrieval=RetrievalConfig(
                chunk_size=1024,
                chunk_overlap=100,
                top_k=10,
                similarity_threshold=0.6,
                rerank_enabled=True
            ),
            processing=ProcessingConfig(
                ocr_enabled=True,
                language_detection=True,
                metadata_extraction=True,
                auto_categorization=True
            ),
            cache_enabled=True,
            debug_mode=False
        ),
        is_default=False
    ),
    RAGPreset(
        id="fast-response",
        name="Fast Response",
        description="Optimized for speed with lightweight embeddings",
        settings=RAGSettings(
            model=ModelConfig(
                name="mistral:7b-instruct",
                provider="ollama",
                max_tokens=2048,
                temperature=0.7
            ),
            embedding=EmbeddingConfig(
                model="paraphrase-MiniLM-L3-v2",
                dimension=384,
                provider="local"
            ),
            retrieval=RetrievalConfig(
                chunk_size=256,
                chunk_overlap=25,
                top_k=3,
                similarity_threshold=0.8,
                rerank_enabled=False
            ),
            processing=ProcessingConfig(
                ocr_enabled=False,
                language_detection=False,
                metadata_extraction=True,
                auto_categorization=False
            ),
            cache_enabled=True,
            debug_mode=False
        ),
        is_default=False
    ),
    RAGPreset(
        id="balanced",
        name="Balanced",
        description="Balanced configuration for general use",
        settings=current_settings,
        is_default=True
    )
]

# Available models - reflecting actual installed models
available_models = [
    # LLM Models (via Ollama)
    AvailableModel(
        id="mistral:7b-instruct",
        name="Mistral 7B Instruct",
        provider="ollama",
        type="llm",
        max_tokens=4096,
        description="Optimized instruction-following model, currently in use",
        recommended=True
    ),
    AvailableModel(
        id="llama3:8b-instruct-q4_1",
        name="Llama 3 8B Instruct (Q4)",
        provider="ollama",
        type="llm",
        max_tokens=8192,
        description="Latest Llama model with enhanced capabilities",
        recommended=False
    ),
    AvailableModel(
        id="mistral:7b",
        name="Mistral 7B Base",
        provider="ollama",
        type="llm",
        max_tokens=4096,
        description="Base Mistral model for general tasks",
        recommended=False
    ),
    # Embedding Models (local)
    AvailableModel(
        id="BAAI/bge-m3",
        name="BGE-M3",
        provider="local",
        type="embedding",
        dimension=1024,
        description="State-of-the-art multilingual embeddings, currently in use",
        recommended=True
    ),
    AvailableModel(
        id="paraphrase-MiniLM-L3-v2",
        name="MiniLM L3 v2",
        provider="local",
        type="embedding",
        dimension=384,
        description="Fast, lightweight embedding model (fallback)",
        recommended=False
    ),
    AvailableModel(
        id="paraphrase-multilingual-MiniLM-L12-v2",
        name="Multilingual MiniLM L12 v2",
        provider="local",
        type="embedding",
        dimension=384,
        description="Multilingual embeddings for diverse content",
        recommended=False
    ),
    # Reranker Models
    AvailableModel(
        id="cross-encoder/ms-marco-MiniLM-L-6-v2",
        name="MS Marco MiniLM L6 v2",
        provider="local",
        type="reranker",
        dimension=None,
        description="Cross-encoder for result reranking, currently in use",
        recommended=True
    )
]


@router.get("/settings", response_model=RAGSettings)
async def get_rag_settings():
    """Get current RAG settings"""
    try:
        logger.info("Fetching current RAG settings")
        return current_settings
    except Exception as e:
        logger.error(f"Error fetching RAG settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch RAG settings")


@router.get("/presets", response_model=List[RAGPreset])
async def get_rag_presets():
    """Get available RAG configuration presets"""
    try:
        logger.info("Fetching RAG presets")
        return presets
    except Exception as e:
        logger.error(f"Error fetching RAG presets: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch RAG presets")


@router.get("/available-models", response_model=List[AvailableModel])
async def get_available_models(
    model_type: Optional[str] = Query(None, description="Filter by model type ('llm', 'embedding', or 'reranker')")
):
    """
    Get list of available models
    
    Args:
        model_type: Filter by model type ('llm', 'embedding', or 'reranker')
    """
    try:
        logger.info(f"Fetching available models (type: {model_type})")
        
        if model_type:
            if model_type not in ["llm", "embedding", "reranker"]:
                raise HTTPException(
                    status_code=400, 
                    detail="Invalid model type. Must be 'llm', 'embedding', or 'reranker'"
                )
            filtered_models = [m for m in available_models if m.type == model_type]
            return filtered_models
        
        return available_models
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching available models: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch available models")


@router.put("/settings", response_model=RAGSettings)
async def update_rag_settings(
    settings: UpdateSettingsRequest
):
    """Update RAG settings"""
    try:
        logger.info("Updating RAG settings")
        
        # Update only provided fields
        if settings.model is not None:
            current_settings.model = settings.model
        if settings.embedding is not None:
            current_settings.embedding = settings.embedding
        if settings.retrieval is not None:
            current_settings.retrieval = settings.retrieval
        if settings.processing is not None:
            current_settings.processing = settings.processing
        if settings.cache_enabled is not None:
            current_settings.cache_enabled = settings.cache_enabled
        if settings.debug_mode is not None:
            current_settings.debug_mode = settings.debug_mode
        
        current_settings.last_updated = datetime.now()
        
        logger.info("RAG settings updated successfully")
        return current_settings
    except Exception as e:
        logger.error(f"Error updating RAG settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update RAG settings")


@router.post("/apply-preset", response_model=RAGSettings)
async def apply_preset(
    request: ApplyPresetRequest
):
    """Apply a preset configuration"""
    try:
        logger.info(f"Applying preset: {request.preset_id}")
        
        # Find the preset
        preset = next((p for p in presets if p.id == request.preset_id), None)
        if not preset:
            raise HTTPException(status_code=404, detail=f"Preset '{request.preset_id}' not found")
        
        # Apply preset settings
        global current_settings
        current_settings = preset.settings.model_copy(deep=True)
        current_settings.last_updated = datetime.now()
        
        logger.info(f"Preset '{preset.name}' applied successfully")
        return current_settings
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying preset: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to apply preset")


# Health check endpoint
@router.get("/health")
async def health_check():
    """Check RAG settings service health"""
    return {
        "status": "healthy",
        "service": "rag-settings",
        "timestamp": datetime.now().isoformat()
    }


# Performance metrics endpoint
@router.get("/performance")
async def get_performance_metrics():
    """Get RAG system performance metrics"""
    try:
        logger.info("Getting RAG performance metrics")
        
        # Mock performance data
        performance_data = {
            "query_performance": {
                "average_response_time_ms": 185,
                "p95_response_time_ms": 250,
                "p99_response_time_ms": 350,
                "queries_per_second": 45.2,
                "total_queries_24h": 3912384
            },
            "retrieval_metrics": {
                "average_chunks_retrieved": 5.2,
                "average_relevance_score": 0.87,
                "cache_hit_rate": 0.73,
                "vector_search_time_ms": 12
            },
            "system_resources": {
                "cpu_usage_percent": 23.5,
                "memory_usage_mb": 512,
                "vector_db_size_mb": 1024,
                "index_size_mb": 256
            },
            "quality_metrics": {
                "user_satisfaction_score": 0.92,
                "answer_accuracy_score": 0.88,
                "hallucination_rate": 0.02,
                "context_relevance_score": 0.91
            }
        }
        
        return {
            "success": True,
            "data": performance_data,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting performance metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get performance metrics")