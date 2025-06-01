# Documentation API

The Documentation API provides RESTful endpoints for accessing and managing the nscale-assist documentation.

## Features

- **List Documents**: Browse all documentation files with metadata
- **Search**: Full-text search across all documentation
- **Statistics**: Get insights about documentation coverage
- **Health Check**: Monitor documentation system health
- **Validation**: Validate markdown document structure
- **Dependency Graph**: Visualize document relationships
- **Caching**: Built-in caching for improved performance
- **Rate Limiting**: Protect against API abuse
- **Authentication**: JWT-based authentication required

## Endpoints

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### GET /api/docs/
List all documents with optional filtering by category or tag.

**Query Parameters:**
- `category` (optional): Filter by category
- `tag` (optional): Filter by tag

**Response:**
```json
[
  {
    "path": "00_KONSOLIDIERTE_DOKUMENTATION/00_INDEX.md",
    "title": "Documentation Index",
    "size": 2048,
    "modified": "2025-01-20T10:30:00",
    "category": "00_KONSOLIDIERTE_DOKUMENTATION",
    "tags": ["index", "documentation"],
    "hash": "abc123..."
  }
]
```

### GET /api/docs/search
Search documentation content.

**Query Parameters:**
- `q` (required): Search query
- `category` (optional): Filter by category
- `tags` (optional): Filter by tags (comma-separated)
- `limit` (optional, default=20, max=100): Maximum results

**Response:**
```json
[
  {
    "path": "path/to/doc.md",
    "title": "Document Title",
    "size": 1024,
    "modified": "2025-01-20T10:30:00",
    "category": "category",
    "tags": ["tag1", "tag2"],
    "hash": "def456..."
  }
]
```

### GET /api/docs/stats
Get documentation statistics.

**Response:**
```json
{
  "total_documents": 42,
  "total_size": 1048576,
  "categories": {
    "00_KONSOLIDIERTE_DOKUMENTATION": 10,
    "01_MIGRATION": 5,
    "02_ARCHITEKTUR": 8
  },
  "last_updated": "2025-01-20T10:30:00",
  "most_recent_docs": [...]
}
```

### GET /api/docs/health
Check documentation system health.

**Response:**
```json
{
  "status": "healthy",
  "issues": [],
  "checked_at": "2025-01-20T10:30:00"
}
```

### POST /api/docs/validate
Validate a document's content and structure.

**Request Body:**
```json
{
  "content": "# Document\n\n## Section\n\nContent...",
  "filename": "optional-filename.md"
}
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": ["Heading level jump detected at position 3"],
  "suggestions": ["Consider adding an Overview section"]
}
```

### GET /api/docs/graph
Get document dependency graph showing relationships between documents.

**Response:**
```json
{
  "nodes": [
    {
      "id": "path/to/doc.md",
      "label": "Document Title",
      "category": "category",
      "size": 1024
    }
  ],
  "edges": [
    {
      "source": "doc1.md",
      "target": "doc2.md",
      "weight": 1
    }
  ]
}
```

### GET /api/docs/{path}
Get a specific document by its path.

**Parameters:**
- `path`: Document path relative to docs directory

**Response:**
Returns the markdown file content with `Content-Type: text/markdown`

### POST /api/docs/cache/clear
Clear the documentation cache (admin only).

**Response:**
```json
{
  "message": "Cache cleared successfully"
}
```

## Authentication

The API uses JWT tokens for authentication. To authenticate:

1. Login via `/api/auth/login` with your credentials
2. Include the token in all API requests:
   ```
   Authorization: Bearer <your-token>
   ```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- Default: 100 requests per minute per user
- Rate limit information is tracked per authenticated user

## Caching

The API implements caching to improve performance:
- Default TTL: 5 minutes
- Cache can be cleared by admins via the `/api/docs/cache/clear` endpoint
- Cache is automatically rebuilt in the background after clearing

## Error Responses

All error responses follow this format:
```json
{
  "detail": "Error message"
}
```

Common HTTP status codes:
- `401`: Authentication required or invalid token
- `403`: Forbidden (insufficient permissions)
- `404`: Document not found
- `429`: Rate limit exceeded
- `500`: Internal server error

## Integration

The Documentation API integrates with the existing nscale-assist system:
- Uses the same authentication system
- Shares configuration with the main application
- Logs to the same logging system
- Follows the same API versioning scheme

## Testing

Run the test suite:
```bash
python /opt/nscale-assist/app/test_documentation_api.py
```

The test suite covers all endpoints and common use cases.

## Performance Considerations

- Documents are cached for 5 minutes by default
- Large documentation sets may take time to index initially
- The graph endpoint can be resource-intensive for large documentation sets
- Consider using pagination for large result sets

## Security

- All endpoints require authentication
- Path traversal attacks are prevented
- Only markdown files can be accessed
- Admin-only endpoints require admin role