"""
Test configuration for document classifier tests
"""
import pytest

# Override the global autouse fixture for our tests
@pytest.fixture(autouse=False)
def mock_ollama():
    """Disable the global mock_ollama fixture for these tests"""
    pass