"""
Documentation API for nscale-assist
Provides REST endpoints for documentation access and management
"""

import os
import json
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
from functools import lru_cache
import asyncio
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks, Request
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field
from jose import jwt, JWTError

# Import from existing modules
from modules.core.config import Config
from modules.core.logging import LogManager
from modules.auth.user_model import UserManager
from api.routes_config import build_api_url, DOCUMENT_ROUTES

# Initialize components
config = Config()
logger = LogManager().get_logger("documentation_api")
user_manager = UserManager()

# Create router
router = APIRouter(prefix="/api/docs", tags=["documentation"])

# Rate limiting
class RateLimiter:
    def __init__(self, calls: int = 100, period: int = 60):
        self.calls = calls
        self.period = period
        self.calls_made = defaultdict(list)
    
    async def check_rate_limit(self, identifier: str) -> bool:
        now = datetime.now()
        cutoff = now - timedelta(seconds=self.period)
        
        # Clean old calls
        self.calls_made[identifier] = [
            call_time for call_time in self.calls_made[identifier]
            if call_time > cutoff
        ]
        
        if len(self.calls_made[identifier]) >= self.calls:
            return False
        
        self.calls_made[identifier].append(now)
        return True

rate_limiter = RateLimiter()

# Cache manager
class DocumentCache:
    def __init__(self, ttl: int = 300):  # 5 minutes TTL
        self.cache = {}
        self.ttl = ttl
    
    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            data, timestamp = self.cache[key]
            if datetime.now() - timestamp < timedelta(seconds=self.ttl):
                return data
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, value: Any):
        self.cache[key] = (value, datetime.now())
    
    def clear(self):
        self.cache.clear()

doc_cache = DocumentCache()

# Pydantic models
class DocumentMetadata(BaseModel):
    path: str
    title: str
    size: int
    modified: str
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    hash: Optional[str] = None

class DocumentContent(BaseModel):
    path: str
    content: str
    metadata: DocumentMetadata

class DocumentSearch(BaseModel):
    query: str
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    limit: int = Field(default=20, le=100)

class DocumentStats(BaseModel):
    total_documents: int
    total_size: int
    categories: Dict[str, int]
    last_updated: str
    most_recent_docs: List[DocumentMetadata]

class DocumentValidation(BaseModel):
    content: str
    filename: Optional[str] = None

class ValidationResult(BaseModel):
    valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)

class DocumentNode(BaseModel):
    id: str
    label: str
    category: str
    size: int

class DocumentEdge(BaseModel):
    source: str
    target: str
    weight: int = 1

class DocumentGraph(BaseModel):
    nodes: List[DocumentNode]
    edges: List[DocumentEdge]

# Authentication dependency
async def get_current_user(request: Request):
    """Extract and validate user from JWT token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, config.get("AUTH_SECRET_KEY"), algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check rate limit
        if not await rate_limiter.check_rate_limit(user_id):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        return {"user_id": user_id, "username": payload.get("username")}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Helper functions
def get_docs_directory() -> Path:
    """Get the documentation directory path"""
    return Path("/opt/nscale-assist/docs")

def calculate_file_hash(filepath: Path) -> str:
    """Calculate MD5 hash of a file"""
    hash_md5 = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def extract_metadata_from_file(filepath: Path) -> DocumentMetadata:
    """Extract metadata from a documentation file"""
    stat = filepath.stat()
    
    # Determine category from path
    category = None
    if "00_KONSOLIDIERTE_DOKUMENTATION" in str(filepath):
        parts = filepath.parts
        for i, part in enumerate(parts):
            if part == "00_KONSOLIDIERTE_DOKUMENTATION" and i + 1 < len(parts):
                category = parts[i + 1]
                break
    
    # Extract title from first heading or filename
    title = filepath.stem.replace("_", " ").title()
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            first_line = f.readline().strip()
            if first_line.startswith("#"):
                title = first_line.lstrip("#").strip()
    except:
        pass
    
    # Extract tags from content
    tags = []
    try:
        content = filepath.read_text(encoding="utf-8").lower()
        # Common technical tags
        tech_tags = ["typescript", "vue", "api", "authentication", "migration", "performance", "architecture"]
        tags = [tag for tag in tech_tags if tag in content]
    except:
        pass
    
    return DocumentMetadata(
        path=str(filepath.relative_to(get_docs_directory())),
        title=title,
        size=stat.st_size,
        modified=datetime.fromtimestamp(stat.st_mtime).isoformat(),
        category=category,
        tags=tags,
        hash=calculate_file_hash(filepath)
    )

def search_in_file(filepath: Path, query: str) -> bool:
    """Search for query in file content"""
    try:
        content = filepath.read_text(encoding="utf-8").lower()
        return query.lower() in content
    except:
        return False

def validate_document_content(content: str, filename: Optional[str] = None) -> ValidationResult:
    """Validate document content and structure"""
    errors = []
    warnings = []
    suggestions = []
    
    lines = content.split("\n")
    
    # Check for title
    if not lines or not lines[0].startswith("#"):
        errors.append("Document should start with a heading")
    
    # Check for proper markdown structure
    heading_levels = []
    for line in lines:
        if line.startswith("#"):
            level = len(line.split()[0])
            heading_levels.append(level)
    
    # Check heading hierarchy
    if heading_levels:
        for i in range(1, len(heading_levels)):
            if heading_levels[i] > heading_levels[i-1] + 1:
                warnings.append(f"Heading level jump detected at position {i}")
    
    # Check for common sections
    content_lower = content.lower()
    if "## overview" not in content_lower and "## überblick" not in content_lower:
        suggestions.append("Consider adding an Overview section")
    
    # Check for code blocks
    if "```" in content and content.count("```") % 2 != 0:
        errors.append("Unclosed code block detected")
    
    # Check for broken links
    import re
    link_pattern = r'\[([^\]]+)\]\(([^\)]+)\)'
    links = re.findall(link_pattern, content)
    for link_text, link_url in links:
        if link_url.startswith("/") or link_url.startswith("./"):
            # Check if local file exists
            if filename:
                base_path = Path(filename).parent
                link_path = base_path / link_url
                if not link_path.exists():
                    warnings.append(f"Broken link: {link_url}")
    
    # Check line length
    long_lines = [i for i, line in enumerate(lines) if len(line) > 120 and not line.startswith("http")]
    if long_lines:
        suggestions.append(f"Consider breaking long lines (found {len(long_lines)} lines > 120 chars)")
    
    return ValidationResult(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        suggestions=suggestions
    )

def build_document_graph() -> DocumentGraph:
    """Build a graph of document relationships"""
    nodes = []
    edges = []
    docs_dir = get_docs_directory()
    
    # First pass: collect all documents as nodes
    doc_map = {}
    for md_file in docs_dir.rglob("*.md"):
        if md_file.is_file():
            metadata = extract_metadata_from_file(md_file)
            node = DocumentNode(
                id=metadata.path,
                label=metadata.title,
                category=metadata.category or "uncategorized",
                size=metadata.size
            )
            nodes.append(node)
            doc_map[metadata.path] = node
    
    # Second pass: find relationships (links between documents)
    for md_file in docs_dir.rglob("*.md"):
        if md_file.is_file():
            try:
                content = md_file.read_text(encoding="utf-8")
                source_path = str(md_file.relative_to(docs_dir))
                
                # Find all markdown links
                import re
                link_pattern = r'\[([^\]]+)\]\(([^\)]+\.md)\)'
                links = re.findall(link_pattern, content)
                
                for link_text, link_url in links:
                    # Normalize link path
                    if link_url.startswith("/"):
                        target_path = link_url[1:]
                    elif link_url.startswith("./"):
                        target_path = str((md_file.parent / link_url[2:]).relative_to(docs_dir))
                    else:
                        target_path = str((md_file.parent / link_url).relative_to(docs_dir))
                    
                    if target_path in doc_map:
                        edges.append(DocumentEdge(
                            source=source_path,
                            target=target_path,
                            weight=1
                        ))
            except:
                continue
    
    return DocumentGraph(nodes=nodes, edges=edges)

# API Endpoints
@router.get("/", response_model=List[DocumentMetadata])
async def list_documents(
    category: Optional[str] = None,
    tag: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all documents with optional filtering"""
    cache_key = f"list_{category}_{tag}"
    cached = doc_cache.get(cache_key)
    if cached:
        return cached
    
    docs_dir = get_docs_directory()
    documents = []
    
    for md_file in docs_dir.rglob("*.md"):
        if md_file.is_file():
            metadata = extract_metadata_from_file(md_file)
            
            # Apply filters
            if category and metadata.category != category:
                continue
            if tag and tag not in metadata.tags:
                continue
            
            documents.append(metadata)
    
    # Sort by modified date (newest first)
    documents.sort(key=lambda x: x.modified, reverse=True)
    
    doc_cache.set(cache_key, documents)
    return documents

@router.get("/search", response_model=List[DocumentMetadata])
async def search_documents(
    q: str = Query(..., description="Search query"),
    category: Optional[str] = None,
    tags: Optional[List[str]] = Query(None),
    limit: int = Query(20, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Search documentation content"""
    if not q:
        raise HTTPException(status_code=400, detail="Search query required")
    
    cache_key = f"search_{q}_{category}_{tags}_{limit}"
    cached = doc_cache.get(cache_key)
    if cached:
        return cached
    
    docs_dir = get_docs_directory()
    results = []
    
    for md_file in docs_dir.rglob("*.md"):
        if md_file.is_file():
            metadata = extract_metadata_from_file(md_file)
            
            # Apply category filter
            if category and metadata.category != category:
                continue
            
            # Apply tag filter
            if tags and not any(tag in metadata.tags for tag in tags):
                continue
            
            # Search in file
            if search_in_file(md_file, q):
                results.append(metadata)
                
                if len(results) >= limit:
                    break
    
    doc_cache.set(cache_key, results)
    return results

@router.get("/stats", response_model=DocumentStats)
async def get_documentation_stats(current_user: dict = Depends(get_current_user)):
    """Get documentation statistics"""
    cache_key = "stats"
    cached = doc_cache.get(cache_key)
    if cached:
        return cached
    
    docs_dir = get_docs_directory()
    total_size = 0
    categories = defaultdict(int)
    documents = []
    
    for md_file in docs_dir.rglob("*.md"):
        if md_file.is_file():
            metadata = extract_metadata_from_file(md_file)
            total_size += metadata.size
            categories[metadata.category or "uncategorized"] += 1
            documents.append(metadata)
    
    # Sort by modified date
    documents.sort(key=lambda x: x.modified, reverse=True)
    
    stats = DocumentStats(
        total_documents=len(documents),
        total_size=total_size,
        categories=dict(categories),
        last_updated=documents[0].modified if documents else datetime.now().isoformat(),
        most_recent_docs=documents[:5]
    )
    
    doc_cache.set(cache_key, stats)
    return stats

@router.get("/health")
async def health_check(current_user: dict = Depends(get_current_user)):
    """Check documentation system health"""
    docs_dir = get_docs_directory()
    issues = []
    
    # Check if docs directory exists
    if not docs_dir.exists():
        issues.append("Documentation directory not found")
    
    # Check for broken links
    broken_links = 0
    for md_file in docs_dir.rglob("*.md"):
        if md_file.is_file():
            try:
                content = md_file.read_text(encoding="utf-8")
                import re
                link_pattern = r'\[([^\]]+)\]\(([^\)]+\.md)\)'
                links = re.findall(link_pattern, content)
                
                for link_text, link_url in links:
                    if link_url.startswith("http"):
                        continue
                    
                    link_path = md_file.parent / link_url
                    if not link_path.exists():
                        broken_links += 1
            except:
                issues.append(f"Could not read file: {md_file}")
    
    if broken_links > 0:
        issues.append(f"Found {broken_links} broken links")
    
    return {
        "status": "healthy" if not issues else "unhealthy",
        "issues": issues,
        "checked_at": datetime.now().isoformat()
    }

@router.post("/validate", response_model=ValidationResult)
async def validate_document(
    validation: DocumentValidation,
    current_user: dict = Depends(get_current_user)
):
    """Validate document content and structure"""
    return validate_document_content(validation.content, validation.filename)

@router.get("/graph", response_model=DocumentGraph)
async def get_document_graph(current_user: dict = Depends(get_current_user)):
    """Get document dependency graph"""
    cache_key = "graph"
    cached = doc_cache.get(cache_key)
    if cached:
        return cached
    
    graph = build_document_graph()
    doc_cache.set(cache_key, graph)
    return graph

@router.get("/{path:path}")
async def get_document(
    path: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific document content"""
    cache_key = f"doc_{path}"
    cached = doc_cache.get(cache_key)
    if cached:
        return FileResponse(cached)
    
    docs_dir = get_docs_directory()
    file_path = docs_dir / path
    
    # Security: ensure path doesn't escape docs directory
    try:
        file_path = file_path.resolve()
        docs_dir = docs_dir.resolve()
        if not str(file_path).startswith(str(docs_dir)):
            raise HTTPException(status_code=403, detail="Access denied")
    except:
        raise HTTPException(status_code=403, detail="Invalid path")
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not file_path.suffix == ".md":
        raise HTTPException(status_code=400, detail="Only markdown files are supported")
    
    doc_cache.set(cache_key, str(file_path))
    return FileResponse(file_path, media_type="text/markdown")

# Cache management endpoint (admin only)
@router.post("/cache/clear")
async def clear_cache(
    current_user: dict = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Clear documentation cache (admin only)"""
    # Check if user is admin
    user = user_manager.get_user(current_user["username"])
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    doc_cache.clear()
    
    # Rebuild cache in background
    background_tasks.add_task(rebuild_cache)
    
    return {"message": "Cache cleared successfully"}

async def rebuild_cache():
    """Rebuild documentation cache in background"""
    try:
        # Pre-populate common queries
        docs_dir = get_docs_directory()
        
        # Cache document list
        documents = []
        for md_file in docs_dir.rglob("*.md"):
            if md_file.is_file():
                metadata = extract_metadata_from_file(md_file)
                documents.append(metadata)
        
        doc_cache.set("list_None_None", documents)
        
        # Cache stats
        await get_documentation_stats({"user_id": "system", "username": "system"})
        
        # Cache graph
        graph = build_document_graph()
        doc_cache.set("graph", graph)
        
        logger.info("Documentation cache rebuilt successfully")
    except Exception as e:
        logger.error(f"Error rebuilding cache: {e}")

# Export router for integration
__all__ = ["router"]