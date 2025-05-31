"""
Comprehensive test suite for the Digitale Akte Assistent API
"""
import pytest
import asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import json
from datetime import datetime

# Import the FastAPI app
import sys
sys.path.append('./api')
from server import app

# Test client
client = TestClient(app)

class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_health_check(self):
        """Test basic health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "version" in data
    
    def test_readiness_check(self):
        """Test readiness endpoint"""
        response = client.get("/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["ready"] == True
        assert "services" in data

class TestAuthenticationEndpoints:
    """Test authentication endpoints"""
    
    def test_login_success(self):
        """Test successful login"""
        response = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = client.post("/api/auth/login", json={
            "username": "invalid",
            "password": "wrong"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_logout(self):
        """Test logout endpoint"""
        # First login
        login_response = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = login_response.json()["access_token"]
        
        # Then logout
        response = client.post("/api/auth/logout", 
            headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
    
    def test_protected_endpoint_without_auth(self):
        """Test accessing protected endpoint without authentication"""
        response = client.get("/api/auth/me")
        assert response.status_code == 401

class TestChatEndpoints:
    """Test chat/conversation endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_session(self, auth_headers):
        """Test creating a new chat session"""
        response = client.post("/api/sessions", 
            headers=auth_headers,
            json={"title": "Test Session"})
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == "Test Session"
        assert "created_at" in data
    
    def test_list_sessions(self, auth_headers):
        """Test listing chat sessions"""
        response = client.get("/api/sessions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_send_message(self, auth_headers):
        """Test sending a message"""
        # Create session first
        session_response = client.post("/api/sessions", 
            headers=auth_headers,
            json={"title": "Test Session"})
        session_id = session_response.json()["id"]
        
        # Send message
        response = client.post(f"/api/sessions/{session_id}/messages",
            headers=auth_headers,
            json={"content": "Hello, test message"})
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["content"] == "Hello, test message"
    
    @patch('api.server.generate_response')
    def test_chat_completion(self, mock_generate, auth_headers):
        """Test chat completion endpoint"""
        mock_generate.return_value = "This is a test response"
        
        response = client.post("/api/chat/completions",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "Hello"}],
                "stream": False
            })
        assert response.status_code == 200
        data = response.json()
        assert "choices" in data
        assert len(data["choices"]) > 0

class TestDocumentEndpoints:
    """Test document conversion endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_upload_document(self, auth_headers, tmp_path):
        """Test document upload"""
        # Create a test file
        test_file = tmp_path / "test.txt"
        test_file.write_text("Test content")
        
        with open(test_file, "rb") as f:
            response = client.post("/api/documents/upload",
                headers=auth_headers,
                files={"file": ("test.txt", f, "text/plain")})
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["filename"] == "test.txt"
    
    def test_list_documents(self, auth_headers):
        """Test listing documents"""
        response = client.get("/api/documents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_document_conversion_status(self, auth_headers):
        """Test checking document conversion status"""
        # This would need a real document ID
        response = client.get("/api/documents/test-id/status", 
            headers=auth_headers)
        # Expect 404 for non-existent document
        assert response.status_code in [404, 200]

class TestAdminEndpoints:
    """Test admin endpoints"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin authentication headers"""
        response = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_admin_stats(self, admin_headers):
        """Test admin statistics endpoint"""
        response = client.get("/api/admin/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_sessions" in data
        assert "total_messages" in data
    
    def test_admin_users_list(self, admin_headers):
        """Test listing users as admin"""
        response = client.get("/api/admin/users", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_admin_system_settings(self, admin_headers):
        """Test system settings endpoint"""
        response = client.get("/api/admin/settings", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

class TestBatchEndpoints:
    """Test batch processing endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_batch_request(self, auth_headers):
        """Test batch API request"""
        batch_request = {
            "requests": [
                {
                    "method": "GET",
                    "path": "/api/sessions",
                    "id": "req1"
                },
                {
                    "method": "GET",
                    "path": "/api/documents",
                    "id": "req2"
                }
            ]
        }
        
        response = client.post("/api/batch", 
            headers=auth_headers,
            json=batch_request)
        assert response.status_code == 200
        data = response.json()
        assert "responses" in data
        assert len(data["responses"]) == 2

class TestErrorHandling:
    """Test error handling"""
    
    def test_404_endpoint(self):
        """Test 404 error for non-existent endpoint"""
        response = client.get("/api/nonexistent")
        assert response.status_code == 404
    
    def test_invalid_json(self):
        """Test handling of invalid JSON"""
        response = client.post("/api/auth/login", 
            data="invalid json",
            headers={"Content-Type": "application/json"})
        assert response.status_code == 422
    
    def test_method_not_allowed(self):
        """Test method not allowed error"""
        response = client.patch("/api/health")
        assert response.status_code == 405

class TestStreamingEndpoints:
    """Test streaming endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @patch('api.server.generate_streaming_response')
    def test_streaming_chat(self, mock_stream, auth_headers):
        """Test streaming chat response"""
        async def mock_generator():
            yield "data: {\"content\": \"Hello\"}\n\n"
            yield "data: {\"content\": \" World\"}\n\n"
            yield "data: [DONE]\n\n"
        
        mock_stream.return_value = mock_generator()
        
        response = client.post("/api/chat/completions",
            headers=auth_headers,
            json={
                "messages": [{"role": "user", "content": "Hello"}],
                "stream": True
            })
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream"

class TestValidation:
    """Test input validation"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_empty_message(self, auth_headers):
        """Test sending empty message"""
        response = client.post("/api/chat/completions",
            headers=auth_headers,
            json={
                "messages": [],
                "stream": False
            })
        assert response.status_code == 422
    
    def test_invalid_session_id(self, auth_headers):
        """Test invalid session ID format"""
        response = client.get("/api/sessions/invalid-uuid/messages",
            headers=auth_headers)
        assert response.status_code in [400, 404]
    
    def test_missing_required_fields(self, auth_headers):
        """Test missing required fields"""
        response = client.post("/api/sessions",
            headers=auth_headers,
            json={})  # Missing title
        assert response.status_code == 422

class TestPerformance:
    """Test performance-related endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_telemetry_endpoint(self, auth_headers):
        """Test telemetry data submission"""
        telemetry_data = {
            "events": [
                {
                    "type": "page_view",
                    "timestamp": datetime.now().isoformat(),
                    "data": {"page": "/chat"}
                }
            ]
        }
        
        response = client.post("/api/telemetry",
            headers=auth_headers,
            json=telemetry_data)
        assert response.status_code == 200
    
    def test_performance_metrics(self, auth_headers):
        """Test performance metrics endpoint"""
        response = client.get("/api/admin/metrics",
            headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "response_times" in data
        assert "error_rates" in data

# Run tests with coverage
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=api", "--cov-report=html", "--cov-report=term"])