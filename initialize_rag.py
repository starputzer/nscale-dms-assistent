#!/usr/bin/env python3
"""
Initialize RAG system and load documents
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(__file__))

from modules.rag.engine import RAGEngine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def initialize_rag():
    """Initialize the RAG engine and load documents"""
    try:
        logger.info("Initializing RAG engine...")
        rag_engine = RAGEngine()
        
        # Initialize the engine (this loads documents)
        success = await rag_engine.initialize()
        
        if success:
            logger.info("✅ RAG engine initialized successfully!")
            
            # Test retrieval
            results = rag_engine.retrieve("nscale", k=3)
            logger.info(f"Test query 'nscale' returned {len(results)} results")
            
            for i, result in enumerate(results[:3]):
                logger.info(f"Result {i+1}: {result.get('file', 'unknown')} - Score: {result.get('score', 0):.3f}")
        else:
            logger.error("❌ Failed to initialize RAG engine")
            
    except Exception as e:
        logger.error(f"Error during initialization: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(initialize_rag())