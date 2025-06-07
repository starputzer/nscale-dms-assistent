#!/usr/bin/env python3
"""
Load documents from data/txt into the RAG system
"""

import os
import sys
sys.path.append(os.path.dirname(__file__))

from modules.rag.engine import RAGEngine
from modules.retrieval.document_store import DocumentStore
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_documents():
    """Load all documents from data/txt directory"""
    
    # Initialize RAG engine
    rag_engine = RAGEngine()
    
    # Directory containing documents
    doc_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'txt')
    
    if not os.path.exists(doc_dir):
        logger.error(f"Document directory not found: {doc_dir}")
        return
    
    # Load each document
    documents_loaded = 0
    
    for filename in os.listdir(doc_dir):
        filepath = os.path.join(doc_dir, filename)
        
        # Skip non-text files
        if not filename.endswith(('.txt', '.md')):
            continue
            
        try:
            logger.info(f"Loading document: {filename}")
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Use RAG engine to add documents
            rag_engine.add_documents([content], [filename])
            
            logger.info(f"Added document {filename}")
            documents_loaded += 1
            
        except Exception as e:
            logger.error(f"Error loading {filename}: {e}")
    
    logger.info(f"Successfully loaded {documents_loaded} documents")
    
    # Check if documents are indexed
    try:
        # Test a simple query
        results = rag_engine.retrieve("nscale", k=3)
        logger.info(f"Test query returned {len(results)} results")
    except Exception as e:
        logger.error(f"Error testing retrieval: {e}")

if __name__ == "__main__":
    load_documents()