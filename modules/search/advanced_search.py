import logging
import re
import asyncio
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import json
from collections import defaultdict

logger = logging.getLogger(__name__)

class SearchOperator(Enum):
    AND = "AND"
    OR = "OR"
    NOT = "NOT"
    NEAR = "NEAR"  # Words within N positions
    EXACT = "EXACT"  # Exact phrase
    WILDCARD = "WILDCARD"  # Pattern matching
    FUZZY = "FUZZY"  # Fuzzy matching
    RANGE = "RANGE"  # Numeric/date range

class SearchField(Enum):
    CONTENT = "content"
    TITLE = "title"
    AUTHOR = "author"
    DATE = "date"
    TYPE = "type"
    TAGS = "tags"
    METADATA = "metadata"
    ALL = "all"

@dataclass
class SearchFilter:
    """Advanced search filter"""
    field: SearchField
    operator: str  # =, !=, <, >, <=, >=, contains, starts_with, ends_with
    value: Any
    
    def matches(self, document: Dict[str, Any]) -> bool:
        """Check if document matches this filter"""
        field_value = self._get_field_value(document)
        
        if field_value is None:
            return False
        
        if self.operator == '=':
            return field_value == self.value
        elif self.operator == '!=':
            return field_value != self.value
        elif self.operator == '<':
            return field_value < self.value
        elif self.operator == '>':
            return field_value > self.value
        elif self.operator == '<=':
            return field_value <= self.value
        elif self.operator == '>=':
            return field_value >= self.value
        elif self.operator == 'contains':
            return self.value.lower() in str(field_value).lower()
        elif self.operator == 'starts_with':
            return str(field_value).lower().startswith(self.value.lower())
        elif self.operator == 'ends_with':
            return str(field_value).lower().endswith(self.value.lower())
        elif self.operator == 'in':
            return field_value in self.value
        elif self.operator == 'regex':
            return bool(re.search(self.value, str(field_value)))
        
        return False
    
    def _get_field_value(self, document: Dict[str, Any]) -> Any:
        """Extract field value from document"""
        if self.field == SearchField.ALL:
            # Search in all text fields
            return ' '.join(str(v) for v in document.values() if isinstance(v, (str, int, float)))
        
        field_map = {
            SearchField.CONTENT: 'content',
            SearchField.TITLE: 'title',
            SearchField.AUTHOR: 'author',
            SearchField.DATE: 'date',
            SearchField.TYPE: 'type',
            SearchField.TAGS: 'tags',
            SearchField.METADATA: 'metadata'
        }
        
        field_name = field_map.get(self.field)
        if not field_name:
            return None
        
        # Handle nested fields
        if '.' in field_name:
            parts = field_name.split('.')
            value = document
            for part in parts:
                if isinstance(value, dict) and part in value:
                    value = value[part]
                else:
                    return None
            return value
        
        return document.get(field_name)

@dataclass
class SearchTerm:
    """Individual search term"""
    text: str
    operator: SearchOperator = SearchOperator.AND
    field: SearchField = SearchField.ALL
    boost: float = 1.0  # Relevance boost factor
    fuzzy_distance: int = 0  # For fuzzy matching
    proximity_distance: int = 5  # For NEAR operator

@dataclass
class SearchQuery:
    """Advanced search query"""
    terms: List[SearchTerm] = field(default_factory=list)
    filters: List[SearchFilter] = field(default_factory=list)
    sort_by: Optional[str] = None
    sort_order: str = 'desc'  # asc or desc
    limit: int = 100
    offset: int = 0
    highlight: bool = True
    facets: List[str] = field(default_factory=list)  # Fields to generate facets for
    
    @classmethod
    def parse(cls, query_string: str) -> 'SearchQuery':
        """Parse advanced query string into SearchQuery object"""
        parser = QueryParser()
        return parser.parse(query_string)

@dataclass
class SearchResult:
    """Search result item"""
    id: str
    score: float
    document: Dict[str, Any]
    highlights: Dict[str, List[str]] = field(default_factory=dict)
    matched_terms: List[str] = field(default_factory=list)

@dataclass
class SearchResponse:
    """Complete search response"""
    query: SearchQuery
    total: int
    results: List[SearchResult]
    facets: Dict[str, Dict[str, int]] = field(default_factory=dict)
    suggestions: List[str] = field(default_factory=list)
    execution_time_ms: float = 0

class QueryParser:
    """Parse advanced search query strings"""
    
    def parse(self, query_string: str) -> SearchQuery:
        """Parse query string into SearchQuery object"""
        query = SearchQuery()
        
        # Extract filters (field:value or field:operator:value)
        filter_pattern = r'(\w+):(=|!=|<|>|<=|>=|contains|starts_with|ends_with)?:?([^\s]+)'
        filters = re.findall(filter_pattern, query_string)
        
        for field_name, operator, value in filters:
            try:
                field = SearchField[field_name.upper()]
                query.filters.append(SearchFilter(
                    field=field,
                    operator=operator or '=',
                    value=self._parse_value(value)
                ))
                # Remove filter from query string
                query_string = query_string.replace(f"{field_name}:{operator}:{value}", "")
                query_string = query_string.replace(f"{field_name}:{value}", "")
            except KeyError:
                pass  # Invalid field, treat as search term
        
        # Extract quoted phrases
        phrases = re.findall(r'"([^"]+)"', query_string)
        for phrase in phrases:
            query.terms.append(SearchTerm(
                text=phrase,
                operator=SearchOperator.EXACT
            ))
            query_string = query_string.replace(f'"{phrase}"', '')
        
        # Extract operators and terms
        tokens = query_string.split()
        i = 0
        while i < len(tokens):
            token = tokens[i]
            
            if token.upper() in ['AND', 'OR', 'NOT']:
                # Operator
                if i + 1 < len(tokens):
                    query.terms.append(SearchTerm(
                        text=tokens[i + 1],
                        operator=SearchOperator[token.upper()]
                    ))
                    i += 2
                else:
                    i += 1
            elif token.startswith('+'):
                # Required term
                query.terms.append(SearchTerm(
                    text=token[1:],
                    operator=SearchOperator.AND,
                    boost=2.0
                ))
                i += 1
            elif token.startswith('-'):
                # Excluded term
                query.terms.append(SearchTerm(
                    text=token[1:],
                    operator=SearchOperator.NOT
                ))
                i += 1
            elif '*' in token or '?' in token:
                # Wildcard
                query.terms.append(SearchTerm(
                    text=token,
                    operator=SearchOperator.WILDCARD
                ))
                i += 1
            elif token.endswith('~'):
                # Fuzzy search
                query.terms.append(SearchTerm(
                    text=token[:-1],
                    operator=SearchOperator.FUZZY,
                    fuzzy_distance=2
                ))
                i += 1
            else:
                # Regular term
                query.terms.append(SearchTerm(
                    text=token,
                    operator=SearchOperator.AND
                ))
                i += 1
        
        return query
    
    def _parse_value(self, value: str) -> Any:
        """Parse value string into appropriate type"""
        # Try to parse as number
        try:
            if '.' in value:
                return float(value)
            return int(value)
        except ValueError:
            pass
        
        # Try to parse as date
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            pass
        
        # Try to parse as boolean
        if value.lower() in ['true', 'false']:
            return value.lower() == 'true'
        
        # Return as string
        return value

class AdvancedSearchEngine:
    """Advanced search engine with multiple operators and features"""
    
    def __init__(self):
        # Search indices for different entity types
        self.indices: Dict[str, List[Dict[str, Any]]] = {
            'documents': [],
            'users': [],
            'sessions': [],
            'feedback': []
        }
        
        # Search configuration
        self.config = {
            'min_word_length': 2,
            'stop_words': {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'},
            'stemming_enabled': True,
            'synonyms': {
                'doc': ['document', 'file'],
                'user': ['person', 'account'],
                'admin': ['administrator', 'superuser']
            }
        }
        
        # Search statistics
        self.stats = {
            'total_searches': 0,
            'avg_response_time': 0,
            'popular_terms': defaultdict(int)
        }
    
    async def search(self, index: str, query: Union[str, SearchQuery]) -> SearchResponse:
        """Perform advanced search"""
        start_time = datetime.now()
        
        # Parse query if string
        if isinstance(query, str):
            query = SearchQuery.parse(query)
        
        # Get documents from index
        documents = self.indices.get(index, [])
        
        # Apply filters
        filtered_docs = self._apply_filters(documents, query.filters)
        
        # Score documents
        scored_results = []
        for doc in filtered_docs:
            score, matched_terms = self._score_document(doc, query.terms)
            if score > 0:
                result = SearchResult(
                    id=doc.get('id', ''),
                    score=score,
                    document=doc,
                    matched_terms=matched_terms
                )
                
                # Add highlights if requested
                if query.highlight:
                    result.highlights = self._generate_highlights(doc, query.terms)
                
                scored_results.append(result)
        
        # Sort results
        if query.sort_by:
            scored_results.sort(
                key=lambda r: r.document.get(query.sort_by, ''),
                reverse=(query.sort_order == 'desc')
            )
        else:
            # Sort by relevance score
            scored_results.sort(key=lambda r: r.score, reverse=True)
        
        # Apply pagination
        total = len(scored_results)
        paginated_results = scored_results[query.offset:query.offset + query.limit]
        
        # Generate facets
        facets = {}
        if query.facets:
            facets = self._generate_facets(scored_results, query.facets)
        
        # Generate suggestions
        suggestions = self._generate_suggestions(query.terms, documents)
        
        # Update statistics
        execution_time = (datetime.now() - start_time).total_seconds() * 1000
        self._update_statistics(query, execution_time)
        
        return SearchResponse(
            query=query,
            total=total,
            results=paginated_results,
            facets=facets,
            suggestions=suggestions,
            execution_time_ms=execution_time
        )
    
    def _apply_filters(self, documents: List[Dict[str, Any]], 
                      filters: List[SearchFilter]) -> List[Dict[str, Any]]:
        """Apply filters to documents"""
        if not filters:
            return documents
        
        filtered = []
        for doc in documents:
            if all(f.matches(doc) for f in filters):
                filtered.append(doc)
        
        return filtered
    
    def _score_document(self, document: Dict[str, Any], 
                       terms: List[SearchTerm]) -> Tuple[float, List[str]]:
        """Score document against search terms"""
        if not terms:
            return 1.0, []
        
        total_score = 0.0
        matched_terms = []
        
        for term in terms:
            term_score = 0.0
            
            # Get searchable text
            if term.field == SearchField.ALL:
                text = ' '.join(str(v) for v in document.values() 
                              if isinstance(v, (str, int, float)))
            else:
                text = str(document.get(term.field.value, ''))
            
            text_lower = text.lower()
            term_text_lower = term.text.lower()
            
            # Apply operator
            if term.operator == SearchOperator.EXACT:
                if term_text_lower in text_lower:
                    term_score = 10.0
                    matched_terms.append(term.text)
            
            elif term.operator == SearchOperator.WILDCARD:
                pattern = term.text.replace('*', '.*').replace('?', '.')
                if re.search(pattern, text, re.IGNORECASE):
                    term_score = 8.0
                    matched_terms.append(term.text)
            
            elif term.operator == SearchOperator.FUZZY:
                # Simple fuzzy matching using edit distance
                words = text_lower.split()
                for word in words:
                    if self._fuzzy_match(word, term_text_lower, term.fuzzy_distance):
                        term_score = 6.0
                        matched_terms.append(term.text)
                        break
            
            elif term.operator == SearchOperator.NOT:
                if term_text_lower not in text_lower:
                    term_score = 1.0
                else:
                    return 0.0, []  # Exclude document
            
            else:  # AND, OR
                # Count occurrences
                count = text_lower.count(term_text_lower)
                if count > 0:
                    term_score = min(count, 5)  # Cap at 5
                    matched_terms.append(term.text)
                elif term.operator == SearchOperator.AND:
                    return 0.0, []  # Required term not found
            
            # Apply boost
            term_score *= term.boost
            
            if term.operator == SearchOperator.OR:
                total_score = max(total_score, term_score)
            else:
                total_score += term_score
        
        return total_score, matched_terms
    
    def _fuzzy_match(self, word1: str, word2: str, max_distance: int) -> bool:
        """Simple fuzzy matching using edit distance"""
        if abs(len(word1) - len(word2)) > max_distance:
            return False
        
        # Simple character difference count
        distance = sum(c1 != c2 for c1, c2 in zip(word1, word2))
        distance += abs(len(word1) - len(word2))
        
        return distance <= max_distance
    
    def _generate_highlights(self, document: Dict[str, Any], 
                           terms: List[SearchTerm]) -> Dict[str, List[str]]:
        """Generate highlighted snippets"""
        highlights = {}
        
        for field, value in document.items():
            if not isinstance(value, str):
                continue
            
            snippets = []
            for term in terms:
                if term.operator == SearchOperator.NOT:
                    continue
                
                # Find term occurrences
                pattern = re.escape(term.text)
                matches = list(re.finditer(pattern, value, re.IGNORECASE))
                
                for match in matches[:3]:  # Max 3 highlights per term
                    start = max(0, match.start() - 50)
                    end = min(len(value), match.end() + 50)
                    
                    snippet = value[start:end]
                    if start > 0:
                        snippet = '...' + snippet
                    if end < len(value):
                        snippet = snippet + '...'
                    
                    # Highlight the match
                    snippet = snippet.replace(
                        match.group(),
                        f'<mark>{match.group()}</mark>'
                    )
                    
                    snippets.append(snippet)
            
            if snippets:
                highlights[field] = snippets
        
        return highlights
    
    def _generate_facets(self, results: List[SearchResult], 
                        facet_fields: List[str]) -> Dict[str, Dict[str, int]]:
        """Generate faceted search results"""
        facets = {}
        
        for field in facet_fields:
            field_values = defaultdict(int)
            
            for result in results:
                value = result.document.get(field)
                if value:
                    if isinstance(value, list):
                        for v in value:
                            field_values[str(v)] += 1
                    else:
                        field_values[str(value)] += 1
            
            # Sort by count and limit to top 10
            sorted_values = sorted(
                field_values.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]
            
            facets[field] = dict(sorted_values)
        
        return facets
    
    def _generate_suggestions(self, terms: List[SearchTerm], 
                            documents: List[Dict[str, Any]]) -> List[str]:
        """Generate search suggestions"""
        suggestions = []
        
        # Simple suggestion: find similar terms in documents
        all_words = set()
        for doc in documents[:100]:  # Sample first 100 docs
            text = ' '.join(str(v) for v in doc.values() 
                          if isinstance(v, (str, int, float)))
            words = re.findall(r'\w+', text.lower())
            all_words.update(words)
        
        for term in terms:
            term_lower = term.text.lower()
            
            # Find words that start with the term
            for word in all_words:
                if word.startswith(term_lower) and word != term_lower:
                    suggestions.append(word)
                    if len(suggestions) >= 5:
                        break
        
        return suggestions[:5]
    
    def _update_statistics(self, query: SearchQuery, execution_time: float):
        """Update search statistics"""
        self.stats['total_searches'] += 1
        
        # Update average response time
        current_avg = self.stats['avg_response_time']
        total = self.stats['total_searches']
        self.stats['avg_response_time'] = (
            (current_avg * (total - 1) + execution_time) / total
        )
        
        # Track popular terms
        for term in query.terms:
            self.stats['popular_terms'][term.text.lower()] += 1
    
    def index_document(self, index: str, document: Dict[str, Any]):
        """Add document to search index"""
        if index not in self.indices:
            self.indices[index] = []
        
        # Ensure document has an ID
        if 'id' not in document:
            import uuid
            document['id'] = str(uuid.uuid4())
        
        # Add timestamp if not present
        if 'indexed_at' not in document:
            document['indexed_at'] = datetime.now().isoformat()
        
        self.indices[index].append(document)
    
    def delete_document(self, index: str, doc_id: str) -> bool:
        """Remove document from index"""
        if index not in self.indices:
            return False
        
        original_length = len(self.indices[index])
        self.indices[index] = [
            doc for doc in self.indices[index]
            if doc.get('id') != doc_id
        ]
        
        return len(self.indices[index]) < original_length
    
    def get_search_statistics(self) -> Dict[str, Any]:
        """Get search engine statistics"""
        return {
            'total_searches': self.stats['total_searches'],
            'avg_response_time_ms': self.stats['avg_response_time'],
            'indices': {
                name: len(docs) for name, docs in self.indices.items()
            },
            'popular_terms': dict(
                sorted(
                    self.stats['popular_terms'].items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:20]
            )
        }

# Global search engine instance
advanced_search = AdvancedSearchEngine()