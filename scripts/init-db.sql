-- PostgreSQL initialization script for nscale-assist
-- Creates necessary tables and indexes for production

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "vector"; -- For embeddings (if using pgvector)

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS chat;
CREATE SCHEMA IF NOT EXISTS documents;
CREATE SCHEMA IF NOT EXISTS rag;

-- Users table
CREATE TABLE IF NOT EXISTS auth.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'guest')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_users_role ON auth.users(role);
CREATE INDEX idx_users_active ON auth.users(is_active);

-- Sessions table
CREATE TABLE IF NOT EXISTS chat.sessions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'Neue Unterhaltung',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_sessions_user_id ON chat.sessions(user_id);
CREATE INDEX idx_sessions_uuid ON chat.sessions(uuid);
CREATE INDEX idx_sessions_created_at ON chat.sessions(created_at DESC);

-- Messages table
CREATE TABLE IF NOT EXISTS chat.messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES chat.sessions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_user BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(768) -- For semantic search
);

CREATE INDEX idx_messages_session_id ON chat.messages(session_id);
CREATE INDEX idx_messages_created_at ON chat.messages(created_at);
CREATE INDEX idx_messages_embedding ON chat.messages USING ivfflat (embedding vector_cosine_ops);

-- Message feedback table
CREATE TABLE IF NOT EXISTS chat.message_feedback (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES chat.messages(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES chat.sessions(id) ON DELETE CASCADE,
    is_positive BOOLEAN NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_feedback_message_id ON chat.message_feedback(message_id);
CREATE INDEX idx_feedback_user_id ON chat.message_feedback(user_id);

-- Documents table
CREATE TABLE IF NOT EXISTS documents.documents (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER REFERENCES auth.users(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    file_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_documents_user_id ON documents.documents(user_id);
CREATE INDEX idx_documents_status ON documents.documents(status);
CREATE INDEX idx_documents_created_at ON documents.documents(created_at DESC);

-- Document chunks for RAG
CREATE TABLE IF NOT EXISTS rag.document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents.documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chunks_document_id ON rag.document_chunks(document_id);
CREATE INDEX idx_chunks_embedding ON rag.document_chunks USING ivfflat (embedding vector_cosine_ops);

-- Knowledge base entries
CREATE TABLE IF NOT EXISTS rag.knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    source VARCHAR(255),
    embedding vector(768),
    quality_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_knowledge_category ON rag.knowledge_base(category);
CREATE INDEX idx_knowledge_embedding ON rag.knowledge_base USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_knowledge_text_search ON rag.knowledge_base USING gin(to_tsvector('german', content));

-- Background jobs table
CREATE TABLE IF NOT EXISTS public.background_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress FLOAT DEFAULT 0.0,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    result JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_status ON public.background_jobs(status);
CREATE INDEX idx_jobs_created_at ON public.background_jobs(created_at DESC);

-- System configuration table
CREATE TABLE IF NOT EXISTS public.system_config (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Feature toggles table
CREATE TABLE IF NOT EXISTS public.feature_toggles (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT false,
    category VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON chat.sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_updated_at BEFORE UPDATE ON rag.knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_config_updated_at BEFORE UPDATE ON public.system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_toggles_updated_at BEFORE UPDATE ON public.feature_toggles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123 - CHANGE THIS!)
INSERT INTO auth.users (email, username, password_hash, role) 
VALUES ('admin@nscale-assist.com', 'admin', '$2b$12$YourHashedPasswordHere', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert default feature toggles
INSERT INTO public.feature_toggles (id, name, description, enabled, category) VALUES
    ('rag-system', 'RAG System', 'Retrieval-Augmented Generation System', true, 'core'),
    ('document-converter', 'Document Converter', 'Document conversion and processing', true, 'documents'),
    ('admin-panel', 'Admin Panel', 'Administrative interface', true, 'admin'),
    ('background-processing', 'Background Processing', 'Asynchronous job processing', true, 'system')
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA auth TO nscale_user;
GRANT ALL PRIVILEGES ON SCHEMA chat TO nscale_user;
GRANT ALL PRIVILEGES ON SCHEMA documents TO nscale_user;
GRANT ALL PRIVILEGES ON SCHEMA rag TO nscale_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO nscale_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA chat TO nscale_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA documents TO nscale_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA rag TO nscale_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO nscale_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA chat TO nscale_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA documents TO nscale_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA rag TO nscale_user;