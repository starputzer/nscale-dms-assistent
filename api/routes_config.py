"""
Shared API Routes Configuration for Backend

This module mirrors the TypeScript configuration to ensure
consistency between frontend and backend routes.
"""

# API Version - Change this in one place to update all routes
API_VERSION = 'v1'

# Base API path without version
API_BASE = '/api'

# Full API base with version
API_BASE_VERSIONED = f'{API_BASE}/{API_VERSION}'


class AuthRoutes:
    """Authentication Routes"""
    LOGIN = '/login'
    LOGOUT = '/logout'
    REFRESH = '/refresh'
    USER = '/user'
    VERIFY = '/verify'


class SessionRoutes:
    """Session Routes"""
    LIST = '/sessions'
    CREATE = '/sessions'
    ASK = '/ask'
    
    @staticmethod
    def get(id: str) -> str:
        return f'/sessions/{id}'
    
    @staticmethod
    def update(id: str) -> str:
        return f'/sessions/{id}'
    
    @staticmethod
    def delete(id: str) -> str:
        return f'/sessions/{id}'
    
    @staticmethod
    def messages(id: str) -> str:
        return f'/sessions/{id}/messages'
    
    @staticmethod
    def stream(id: str) -> str:
        return f'/sessions/{id}/stream'


class AdminUserRoutes:
    """Admin User Management Routes"""
    LIST = '/admin/users'
    CREATE = '/admin/users'
    COUNT = '/admin/users/count'
    STATS = '/admin/users/stats'
    ACTIVE = '/admin/users/active'
    
    @staticmethod
    def get(id: str) -> str:
        return f'/admin/users/{id}'
    
    @staticmethod
    def update(id: str) -> str:
        return f'/admin/users/{id}'
    
    @staticmethod
    def delete(id: str) -> str:
        return f'/admin/users/{id}'
    
    @staticmethod
    def update_role(id: str) -> str:
        return f'/admin/users/{id}/role'
    
    @staticmethod
    def lock(id: str) -> str:
        return f'/admin/users/{id}/lock'
    
    @staticmethod
    def unlock(id: str) -> str:
        return f'/admin/users/{id}/unlock'


class AdminFeedbackRoutes:
    """Admin Feedback Management Routes"""
    LIST = '/admin/feedback'
    STATS = '/admin/feedback/stats'
    NEGATIVE = '/admin/feedback/negative'
    EXPORT = '/admin/feedback/export'
    FILTER = '/admin/feedback/filter'
    
    @staticmethod
    def get(id: str) -> str:
        return f'/admin/feedback/{id}'
    
    @staticmethod
    def update(id: str) -> str:
        return f'/admin/feedback/{id}'
    
    @staticmethod
    def delete(id: str) -> str:
        return f'/admin/feedback/{id}'


class AdminFeatureRoutes:
    """Admin Feature Toggle Routes"""
    LIST = '/admin/feature-toggles'
    CREATE = '/admin/feature-toggles'
    STATS = '/admin/feature-toggles/stats'
    
    @staticmethod
    def get(id: str) -> str:
        return f'/admin/feature-toggles/{id}'
    
    @staticmethod
    def update(id: str) -> str:
        return f'/admin/feature-toggles/{id}'
    
    @staticmethod
    def delete(id: str) -> str:
        return f'/admin/feature-toggles/{id}'


class AdminSystemRoutes:
    """Admin System Management Routes"""
    INFO = '/admin/system'
    STATS = '/admin/system/stats'
    CHECK = '/admin/system/check'
    ACTIONS = '/admin/system/actions'
    CLEAR_CACHE = '/admin/clear-cache'
    CLEAR_EMBEDDING_CACHE = '/admin/clear-embedding-cache'
    REINDEX = '/admin/reindex'


class AdminMotdRoutes:
    """Admin MOTD Management Routes"""
    GET = '/admin/motd'
    UPDATE = '/admin/motd'
    RELOAD = '/admin/motd/reload'


class AdminDocConverterRoutes:
    """Admin Document Converter Routes"""
    STATUS = '/admin/doc-converter/status'
    JOBS = '/admin/doc-converter/jobs'
    SETTINGS = '/admin/doc-converter/settings'


class AdminRoutes:
    """All Admin Routes"""
    USERS = AdminUserRoutes
    FEEDBACK = AdminFeedbackRoutes
    FEATURES = AdminFeatureRoutes
    SYSTEM = AdminSystemRoutes
    MOTD = AdminMotdRoutes
    DOC_CONVERTER = AdminDocConverterRoutes


class DocumentRoutes:
    """Document Routes"""
    UPLOAD = '/documents/upload'
    CONVERT = '/documents/convert'
    LIST = '/documents'
    
    @staticmethod
    def get(id: str) -> str:
        return f'/documents/{id}'
    
    @staticmethod
    def delete(id: str) -> str:
        return f'/documents/{id}'


class FeedbackRoutes:
    """Feedback Routes (non-admin)"""
    SUBMIT = '/feedback'


class SystemRoutes:
    """System Routes (non-admin)"""
    HEALTH = '/health'
    INFO = '/info'
    MOTD = '/motd'


class APIRoutes:
    """All API Routes"""
    AUTH = AuthRoutes
    SESSION = SessionRoutes
    ADMIN = AdminRoutes
    DOCUMENT = DocumentRoutes
    FEEDBACK = FeedbackRoutes
    SYSTEM = SystemRoutes


def build_api_url(route: str, include_version: bool = True) -> str:
    """Helper function to build full API URL"""
    if include_version:
        return f'{API_BASE_VERSIONED}{route}'
    return f'{API_BASE}{route}'


def build_full_url(base_url: str, route: str, include_version: bool = True) -> str:
    """Helper function to build full URL with base URL"""
    api_path = build_api_url(route, include_version)
    # Remove trailing slash from base_url and ensure api_path starts with /
    clean_base_url = base_url.rstrip('/')
    clean_api_path = api_path if api_path.startswith('/') else '/' + api_path
    return f'{clean_base_url}{clean_api_path}'


# Export convenience variables
AUTH_ROUTES = AuthRoutes
SESSION_ROUTES = SessionRoutes
ADMIN_ROUTES = AdminRoutes
DOCUMENT_ROUTES = DocumentRoutes
FEEDBACK_ROUTES = FeedbackRoutes
SYSTEM_ROUTES = SystemRoutes
API_ROUTES = APIRoutes