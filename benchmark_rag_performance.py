#!/usr/bin/env python3
"""
RAG Performance Benchmark Script
Analyzes current RAG implementation performance including:
- Chunking efficiency
- Embedding performance
- Retrieval accuracy and speed
- End-to-end query performance
"""

import asyncio
import time
import json
import sys
import os
import statistics
from pathlib import Path
from typing import List, Dict, Any, Tuple

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from modules.core.config import Config
from modules.core.logging import LogManager
from modules.retrieval.document_store import DocumentStore
from modules.retrieval.embedding import EmbeddingManager
from modules.rag.engine import RAGEngine

logger = LogManager.setup_logging(__name__)

class RAGBenchmark:
    def __init__(self):
        self.doc_store = DocumentStore()
        self.embedding_manager = EmbeddingManager()
        self.rag_engine = RAGEngine()
        self.results = {
            'document_stats': {},
            'chunking_analysis': {},
            'embedding_performance': {},
            'retrieval_performance': {},
            'end_to_end_performance': {},
            'optimization_recommendations': []
        }
    
    async def run_full_benchmark(self):
        """Run complete benchmark suite"""
        logger.info("Starting RAG Performance Benchmark...")
        
        # 1. Document and Chunking Analysis
        logger.info("1. Analyzing documents and chunking...")
        self.analyze_documents_and_chunks()
        
        # 2. Embedding Performance
        logger.info("2. Testing embedding performance...")
        await self.test_embedding_performance()
        
        # 3. Retrieval Performance
        logger.info("3. Testing retrieval performance...")
        self.test_retrieval_performance()
        
        # 4. End-to-End Performance
        logger.info("4. Testing end-to-end performance...")
        await self.test_end_to_end_performance()
        
        # 5. Generate Recommendations
        logger.info("5. Generating optimization recommendations...")
        self.generate_recommendations()
        
        return self.results
    
    def analyze_documents_and_chunks(self):
        """Analyze document structure and chunking efficiency"""
        start_time = time.time()
        
        # Load documents
        self.doc_store.load_documents()
        
        # Get statistics
        stats = self.doc_store.get_document_stats()
        chunks = self.doc_store.get_chunks()
        
        # Analyze chunk distribution
        chunk_sizes = [len(chunk['text']) for chunk in chunks]
        chunk_types = {}
        for chunk in chunks:
            chunk_type = chunk.get('type', 'unknown')
            chunk_types[chunk_type] = chunk_types.get(chunk_type, 0) + 1
        
        # Analyze overlap and redundancy
        unique_texts = set()
        redundant_chunks = 0
        for chunk in chunks:
            text_hash = hash(chunk['text'])
            if text_hash in unique_texts:
                redundant_chunks += 1
            else:
                unique_texts.add(text_hash)
        
        self.results['document_stats'] = stats
        self.results['chunking_analysis'] = {
            'total_chunks': len(chunks),
            'chunk_types': chunk_types,
            'chunk_size_stats': {
                'min': min(chunk_sizes) if chunk_sizes else 0,
                'max': max(chunk_sizes) if chunk_sizes else 0,
                'mean': statistics.mean(chunk_sizes) if chunk_sizes else 0,
                'median': statistics.median(chunk_sizes) if chunk_sizes else 0,
                'std_dev': statistics.stdev(chunk_sizes) if len(chunk_sizes) > 1 else 0
            },
            'redundant_chunks': redundant_chunks,
            'load_time': time.time() - start_time,
            'configured_chunk_size': Config.CHUNK_SIZE,
            'configured_overlap': Config.CHUNK_OVERLAP
        }
    
    async def test_embedding_performance(self):
        """Test embedding generation and search performance"""
        # Initialize embeddings
        start_time = time.time()
        self.embedding_manager.initialize()
        init_time = time.time() - start_time
        
        # Process chunks
        chunks = self.doc_store.get_chunks()
        start_time = time.time()
        success = self.embedding_manager.process_chunks(chunks)
        process_time = time.time() - start_time
        
        # Test search performance with various queries
        test_queries = [
            "Wie lege ich eine neue Akte an?",
            "Was ist nscale?",
            "Wie kann ich Dokumente suchen?",
            "Berechtigungen vergeben",
            "Installation von nscale",
            "Fehler beim Login",
            "PDF Dokument hochladen",
            "Workflow erstellen"
        ]
        
        search_times = []
        search_results = []
        
        for query in test_queries:
            start_time = time.time()
            results = self.embedding_manager.search(query, top_k=10)
            search_time = time.time() - start_time
            search_times.append(search_time)
            search_results.append({
                'query': query,
                'time': search_time,
                'results_count': len(results),
                'top_score': results[0]['score'] if results else 0
            })
        
        self.results['embedding_performance'] = {
            'model_init_time': init_time,
            'chunk_processing_time': process_time,
            'chunks_per_second': len(chunks) / process_time if process_time > 0 else 0,
            'search_performance': {
                'min_time': min(search_times),
                'max_time': max(search_times),
                'mean_time': statistics.mean(search_times),
                'queries_tested': len(test_queries),
                'individual_results': search_results
            },
            'embedding_model': 'BAAI/bge-m3',
            'device': self.embedding_manager.device,
            'semantic_weight': Config.SEMANTIC_WEIGHT
        }
    
    def test_retrieval_performance(self):
        """Test retrieval accuracy and relevance"""
        # Test queries with expected documents
        test_cases = [
            {
                'query': 'Wie erstelle ich eine neue Akte?',
                'expected_file': 'nscale-handbuch.md',
                'keywords': ['Akte', 'anlegen', 'erstellen', 'neu']
            },
            {
                'query': 'Installation von nscale',
                'expected_file': 'nscale-installationsprobleme.md',
                'keywords': ['Installation', 'installieren', 'Setup']
            },
            {
                'query': 'Berechtigungen und Rollen',
                'expected_file': 'nscale-berechtigungen.md',
                'keywords': ['Berechtigungen', 'Rollen', 'Rechte']
            }
        ]
        
        retrieval_results = []
        
        for test_case in test_cases:
            results = self.embedding_manager.search(test_case['query'], top_k=5)
            
            # Check if expected file is in top results
            files_retrieved = [r['file'] for r in results]
            expected_found = test_case['expected_file'] in files_retrieved
            expected_position = files_retrieved.index(test_case['expected_file']) + 1 if expected_found else -1
            
            # Check keyword coverage
            all_text = ' '.join([r['text'] for r in results])
            keywords_found = sum(1 for keyword in test_case['keywords'] if keyword.lower() in all_text.lower())
            
            retrieval_results.append({
                'query': test_case['query'],
                'expected_file_found': expected_found,
                'expected_file_position': expected_position,
                'keywords_coverage': keywords_found / len(test_case['keywords']),
                'top_files': files_retrieved[:3]
            })
        
        self.results['retrieval_performance'] = {
            'test_cases': len(test_cases),
            'accuracy': sum(1 for r in retrieval_results if r['expected_file_found']) / len(test_cases),
            'average_position': statistics.mean([r['expected_file_position'] for r in retrieval_results if r['expected_file_position'] > 0]),
            'keyword_coverage': statistics.mean([r['keywords_coverage'] for r in retrieval_results]),
            'detailed_results': retrieval_results,
            'top_k_configured': Config.TOP_K
        }
    
    async def test_end_to_end_performance(self):
        """Test complete RAG pipeline performance"""
        # Initialize RAG engine
        start_time = time.time()
        await self.rag_engine.initialize()
        init_time = time.time() - start_time
        
        # Test various query types
        test_queries = [
            {'query': 'Was ist nscale?', 'type': 'definition'},
            {'query': 'Wie lege ich eine neue Akte an?', 'type': 'how-to'},
            {'query': 'Welche Berechtigungen gibt es?', 'type': 'list'},
            {'query': 'Fehler beim PDF Upload beheben', 'type': 'troubleshooting'},
            {'query': 'Systemanforderungen für nscale', 'type': 'technical'}
        ]
        
        query_results = []
        
        for test_query in test_queries:
            start_time = time.time()
            result = await self.rag_engine.answer_question(test_query['query'])
            response_time = time.time() - start_time
            
            query_results.append({
                'query': test_query['query'],
                'type': test_query['type'],
                'response_time': response_time,
                'success': result['success'],
                'answer_length': len(result.get('answer', '')),
                'chunks_used': len(result.get('chunks', [])),
                'sources': result.get('sources', [])
            })
        
        # Test streaming performance
        streaming_test = await self._test_streaming_performance()
        
        self.results['end_to_end_performance'] = {
            'rag_init_time': init_time,
            'query_performance': {
                'queries_tested': len(test_queries),
                'success_rate': sum(1 for r in query_results if r['success']) / len(test_queries),
                'average_response_time': statistics.mean([r['response_time'] for r in query_results]),
                'min_response_time': min([r['response_time'] for r in query_results]),
                'max_response_time': max([r['response_time'] for r in query_results]),
                'average_answer_length': statistics.mean([r['answer_length'] for r in query_results]),
                'average_chunks_used': statistics.mean([r['chunks_used'] for r in query_results])
            },
            'detailed_results': query_results,
            'streaming_performance': streaming_test,
            'llm_config': {
                'model': Config.MODEL_NAME,
                'context_size': Config.LLM_CONTEXT_SIZE,
                'max_tokens': Config.LLM_MAX_TOKENS,
                'timeout': Config.LLM_TIMEOUT
            }
        }
    
    async def _test_streaming_performance(self):
        """Test streaming response performance"""
        test_query = "Erkläre mir die Grundlagen von nscale"
        
        start_time = time.time()
        first_token_time = None
        token_count = 0
        
        async for chunk in self.rag_engine.stream_answer_chunks(test_query):
            if first_token_time is None:
                first_token_time = time.time() - start_time
            
            try:
                data = json.loads(chunk)
                if 'response' in data:
                    token_count += 1
            except:
                pass
        
        total_time = time.time() - start_time
        
        return {
            'time_to_first_token': first_token_time,
            'total_streaming_time': total_time,
            'tokens_received': token_count,
            'tokens_per_second': token_count / total_time if total_time > 0 else 0
        }
    
    def generate_recommendations(self):
        """Generate optimization recommendations based on benchmark results"""
        recommendations = []
        
        # Chunking recommendations
        chunk_analysis = self.results['chunking_analysis']
        if chunk_analysis['chunk_size_stats']['std_dev'] > 300:
            recommendations.append({
                'category': 'Chunking',
                'issue': 'High variance in chunk sizes',
                'impact': 'Inconsistent retrieval quality',
                'recommendation': 'Implement adaptive chunking based on document structure',
                'priority': 'High'
            })
        
        if chunk_analysis['redundant_chunks'] > 0:
            recommendations.append({
                'category': 'Chunking',
                'issue': f"{chunk_analysis['redundant_chunks']} redundant chunks detected",
                'impact': 'Wasted computation and storage',
                'recommendation': 'Implement deduplication in chunking process',
                'priority': 'Medium'
            })
        
        # Embedding recommendations
        embedding_perf = self.results['embedding_performance']
        if embedding_perf['chunks_per_second'] < 10:
            recommendations.append({
                'category': 'Embedding',
                'issue': 'Slow embedding generation',
                'impact': 'Long initialization times',
                'recommendation': 'Consider batch processing optimization or GPU acceleration',
                'priority': 'High'
            })
        
        if embedding_perf['search_performance']['mean_time'] > 0.1:
            recommendations.append({
                'category': 'Retrieval',
                'issue': 'Slow search performance',
                'impact': 'Poor user experience',
                'recommendation': 'Implement vector index (FAISS/Annoy) for faster similarity search',
                'priority': 'High'
            })
        
        # Retrieval recommendations
        retrieval_perf = self.results['retrieval_performance']
        if retrieval_perf['accuracy'] < 0.8:
            recommendations.append({
                'category': 'Retrieval',
                'issue': 'Low retrieval accuracy',
                'impact': 'Incorrect or irrelevant answers',
                'recommendation': 'Fine-tune embedding model or adjust semantic weight',
                'priority': 'Critical'
            })
        
        # End-to-end recommendations
        e2e_perf = self.results['end_to_end_performance']
        if e2e_perf['query_performance']['average_response_time'] > 5:
            recommendations.append({
                'category': 'Performance',
                'issue': 'High average response time',
                'impact': 'Poor user experience',
                'recommendation': 'Implement response caching and query optimization',
                'priority': 'High'
            })
        
        # Model-specific recommendations
        if e2e_perf['llm_config']['model'] == 'llama3-nscale':
            recommendations.append({
                'category': 'Model',
                'issue': 'Using general-purpose model',
                'impact': 'Suboptimal domain-specific performance',
                'recommendation': 'Consider fine-tuning on nscale documentation',
                'priority': 'Medium'
            })
        
        self.results['optimization_recommendations'] = recommendations

async def main():
    """Run the benchmark and save results"""
    benchmark = RAGBenchmark()
    
    logger.info("Starting comprehensive RAG performance benchmark...")
    start_time = time.time()
    
    try:
        results = await benchmark.run_full_benchmark()
        
        # Save results
        output_file = Path(__file__).parent / 'benchmark_results.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        total_time = time.time() - start_time
        
        # Print summary
        print("\n" + "="*60)
        print("RAG PERFORMANCE BENCHMARK SUMMARY")
        print("="*60)
        print(f"\nTotal benchmark time: {total_time:.2f} seconds")
        print(f"\nDocuments analyzed: {results['document_stats']['document_count']}")
        print(f"Total chunks: {results['chunking_analysis']['total_chunks']}")
        print(f"Average chunk size: {results['chunking_analysis']['chunk_size_stats']['mean']:.0f} characters")
        print(f"\nEmbedding performance:")
        print(f"  - Chunks per second: {results['embedding_performance']['chunks_per_second']:.2f}")
        print(f"  - Average search time: {results['embedding_performance']['search_performance']['mean_time']:.3f}s")
        print(f"\nRetrieval accuracy: {results['retrieval_performance']['accuracy']*100:.1f}%")
        print(f"\nEnd-to-end performance:")
        print(f"  - Average response time: {results['end_to_end_performance']['query_performance']['average_response_time']:.2f}s")
        print(f"  - Success rate: {results['end_to_end_performance']['query_performance']['success_rate']*100:.1f}%")
        
        print(f"\n{len(results['optimization_recommendations'])} optimization recommendations generated")
        print("\nTop recommendations:")
        for rec in sorted(results['optimization_recommendations'], 
                         key=lambda x: {'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3}[x['priority']])[:3]:
            print(f"  - [{rec['priority']}] {rec['category']}: {rec['recommendation']}")
        
        print(f"\nFull results saved to: {output_file}")
        
    except Exception as e:
        logger.error(f"Benchmark failed: {e}", exc_info=True)
        raise

if __name__ == "__main__":
    asyncio.run(main())