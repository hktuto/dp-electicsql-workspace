#!/bin/bash

# Full Database Reset Script
# Drops all tables, regenerates schema, migrates, restarts Electric, and seeds

set -e

echo "🗑️  Dropping all tables in PostgreSQL..."

# Drop all tables including migrations (using psql via docker)
docker exec -i docpal-postgres psql -U docpal -d docpal << 'EOF'
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Disable triggers
    SET session_replication_role = 'replica';
    
    -- Drop all tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
    
    -- Re-enable triggers
    SET session_replication_role = 'origin';
END $$;
EOF

echo "✅ All tables dropped"

echo ""
echo "📝 Generating migrations..."
pnpm db:generate

echo ""
echo "🚀 Running migrations..."
pnpm db:migrate

echo ""
echo "🔄 Restarting Electric SQL container..."
docker restart docpal-electric

# Wait for Electric to be ready
echo "⏳ Waiting for Electric to be ready..."
sleep 3

echo ""
echo "🌱 Seeding database..."
curl -s -X POST http://localhost:3000/api/dev/seed -H 'x-dev-secret: docpal-dev-secret' | jq .

echo ""
echo "✅ Full reset complete!"
echo ""
echo "⚠️  Remember to clear PGLite in browser:"
echo "   - Go to /dev/sync-test"
echo "   - Click 'Force Reset PGLite'"
echo "   - Or open DevTools > Application > IndexedDB > Delete all"

