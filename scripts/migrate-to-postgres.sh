#!/bin/bash
set -e

echo "🔄 SQLite to PostgreSQL Migration Script"
echo "========================================"

# Configuration
SQLITE_DB_USERS="../data/db/users.db"
SQLITE_DB_DOCS="../data/db/doc_converter.db"
SQLITE_DB_KNOWLEDGE="../data/knowledge_base.db"
POSTGRES_HOST="${DB_HOST:-localhost}"
POSTGRES_PORT="${DB_PORT:-5432}"
POSTGRES_DB="${DB_NAME:-nscale_assist}"
POSTGRES_USER="${DB_USER:-nscale_user}"
POSTGRES_PASSWORD="${DB_PASSWORD}"

# Check if password is set
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "❌ Error: DB_PASSWORD environment variable not set"
    echo "Usage: DB_PASSWORD=yourpassword ./migrate-to-postgres.sh"
    exit 1
fi

# Check if pgloader is installed
if ! command -v pgloader &> /dev/null; then
    echo "📦 Installing pgloader..."
    sudo apt-get update
    sudo apt-get install -y pgloader
fi

# Create backup directory
BACKUP_DIR="./migration_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backups..."
cp "$SQLITE_DB_USERS" "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  Users DB not found"
cp "$SQLITE_DB_DOCS" "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  Docs DB not found"
cp "$SQLITE_DB_KNOWLEDGE" "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  Knowledge DB not found"

# Create pgloader configuration for users database
cat > "$BACKUP_DIR/migrate_users.load" << EOF
LOAD DATABASE
    FROM sqlite://$SQLITE_DB_USERS
    INTO postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB

WITH include drop, create tables, create indexes, reset sequences

SET work_mem to '16MB', maintenance_work_mem to '512 MB'

CAST type datetime to timestamptz drop default drop not null using sqlite-timestamp-to-timestamp,
     type integer to integer drop typemod

BEFORE LOAD DO
\$\$ 
BEGIN
    -- Ensure schemas exist
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE SCHEMA IF NOT EXISTS chat;
END;
\$\$

ALTER SCHEMA 'main' RENAME TO 'temp'

ALTER TABLE NAMES MATCHING 'users' SET SCHEMA 'auth'
ALTER TABLE NAMES MATCHING ~/chat_.*/ SET SCHEMA 'chat'
ALTER TABLE NAMES MATCHING 'message_feedback' SET SCHEMA 'chat'

AFTER LOAD DO
\$\$
BEGIN
    -- Update sequences
    SELECT setval('auth.users_id_seq', COALESCE((SELECT MAX(id) FROM auth.users), 0) + 1);
    SELECT setval('chat.chat_sessions_id_seq', COALESCE((SELECT MAX(id) FROM chat.chat_sessions), 0) + 1);
    SELECT setval('chat.chat_messages_id_seq', COALESCE((SELECT MAX(id) FROM chat.chat_messages), 0) + 1);
    
    -- Add any missing columns
    ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE chat.chat_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE chat.chat_messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
END;
\$\$;
EOF

# Create pgloader configuration for documents database
cat > "$BACKUP_DIR/migrate_docs.load" << EOF
LOAD DATABASE
    FROM sqlite://$SQLITE_DB_DOCS
    INTO postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB

WITH include drop, create tables, create indexes, reset sequences

SET work_mem to '16MB', maintenance_work_mem to '512 MB'

BEFORE LOAD DO
\$\$
BEGIN
    CREATE SCHEMA IF NOT EXISTS documents;
END;
\$\$

ALTER SCHEMA 'main' RENAME TO 'documents'

AFTER LOAD DO
\$\$
BEGIN
    -- Update sequences
    SELECT setval('documents.conversion_queue_id_seq', COALESCE((SELECT MAX(id) FROM documents.conversion_queue), 0) + 1);
    SELECT setval('documents.conversion_history_id_seq', COALESCE((SELECT MAX(id) FROM documents.conversion_history), 0) + 1);
END;
\$\$;
EOF

# Create pgloader configuration for knowledge database
cat > "$BACKUP_DIR/migrate_knowledge.load" << EOF
LOAD DATABASE
    FROM sqlite://$SQLITE_DB_KNOWLEDGE
    INTO postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB

WITH include drop, create tables, create indexes, reset sequences

SET work_mem to '16MB', maintenance_work_mem to '512 MB'

BEFORE LOAD DO
\$\$
BEGIN
    CREATE SCHEMA IF NOT EXISTS rag;
END;
\$\$

ALTER SCHEMA 'main' RENAME TO 'rag'

AFTER LOAD DO
\$\$
BEGIN
    -- Add vector column for embeddings if not exists
    ALTER TABLE rag.knowledge_base ADD COLUMN IF NOT EXISTS embedding vector(768);
END;
\$\$;
EOF

# Run migrations
echo "🚀 Starting migration..."

if [ -f "$SQLITE_DB_USERS" ]; then
    echo "📊 Migrating users database..."
    pgloader "$BACKUP_DIR/migrate_users.load"
fi

if [ -f "$SQLITE_DB_DOCS" ]; then
    echo "📄 Migrating documents database..."
    pgloader "$BACKUP_DIR/migrate_docs.load"
fi

if [ -f "$SQLITE_DB_KNOWLEDGE" ]; then
    echo "🧠 Migrating knowledge database..."
    pgloader "$BACKUP_DIR/migrate_knowledge.load"
fi

echo "✅ Migration completed!"
echo "📁 Backups saved in: $BACKUP_DIR"

# Test connection
echo "🔍 Testing PostgreSQL connection..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "\dt *.*" | head -20

echo "
🎉 Migration successful!

Next steps:
1. Update your application configuration to use PostgreSQL
2. Test the application thoroughly
3. Keep the SQLite backups in $BACKUP_DIR until you're confident
4. Update DATABASE_URL in your environment

PostgreSQL connection string:
postgresql://$POSTGRES_USER:[PASSWORD]@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB
"