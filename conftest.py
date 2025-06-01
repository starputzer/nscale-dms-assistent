"""
Pytest configuration for Digitale Akte Assistent
"""
import pytest
import asyncio
import sys
import os
from unittest.mock import MagicMock, patch

# Add the api directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

# Mock Ollama for tests
@pytest.fixture(autouse=True)
def mock_ollama():
    """Mock Ollama to avoid needing the actual service during tests"""
    with patch('api.server.ollama') as mock:
        mock.embeddings.return_value = [[0.1] * 768]  # Mock embedding
        mock.generate.return_value = {
            'response': 'This is a test response from the AI model.'
        }
        yield mock

# Mock file system operations
@pytest.fixture
def mock_filesystem(tmp_path):
    """Provide a temporary directory for file operations"""
    return tmp_path

# Mock database
@pytest.fixture
def mock_db():
    """Mock database for tests"""
    db = MagicMock()
    db.sessions = []
    db.users = [
        {"username": "admin", "password": "admin123", "role": "admin"},
        {"username": "user", "password": "user123", "role": "user"}
    ]
    db.messages = []
    return db

# Async event loop
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

# Test configuration
@pytest.fixture
def test_config():
    """Test configuration"""
    return {
        "TESTING": True,
        "DATABASE_URL": "sqlite:///:memory:",
        "SECRET_KEY": "test-secret-key",
        "ALGORITHM": "HS256",
        "ACCESS_TOKEN_EXPIRE_MINUTES": 30
    }

# Authentication fixtures
@pytest.fixture
def test_user():
    """Test user data"""
    return {
        "username": "testuser",
        "email": "test@example.com",
        "role": "user"
    }

@pytest.fixture
def test_admin():
    """Test admin data"""
    return {
        "username": "admin",
        "email": "admin@example.com",
        "role": "admin"
    }

@pytest.fixture
def auth_token(test_user):
    """Generate test authentication token"""
    from jose import jwt
    from datetime import datetime, timedelta
    
    expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode = {"sub": test_user["username"], "exp": expire}
    return jwt.encode(to_encode, "test-secret-key", algorithm="HS256")

# Session and message fixtures
@pytest.fixture
def test_session():
    """Test session data"""
    return {
        "id": "test-session-123",
        "title": "Test Session",
        "created_at": "2025-05-30T10:00:00Z",
        "updated_at": "2025-05-30T10:00:00Z",
        "user_id": "testuser"
    }

@pytest.fixture
def test_message():
    """Test message data"""
    return {
        "id": "test-message-456",
        "session_id": "test-session-123",
        "role": "user",
        "content": "Test message content",
        "created_at": "2025-05-30T10:01:00Z"
    }

# Document fixtures
@pytest.fixture
def test_document(tmp_path):
    """Test document file"""
    doc_path = tmp_path / "test_document.pdf"
    doc_path.write_bytes(b"PDF content here")
    return doc_path

# Performance monitoring fixtures
@pytest.fixture
def mock_telemetry():
    """Mock telemetry service"""
    telemetry = MagicMock()
    telemetry.track_event.return_value = None
    telemetry.track_metric.return_value = None
    return telemetry

# Feature toggle fixtures
@pytest.fixture
def mock_feature_toggles():
    """Mock feature toggles"""
    return {
        "new_chat_ui": True,
        "advanced_search": False,
        "beta_features": True
    }