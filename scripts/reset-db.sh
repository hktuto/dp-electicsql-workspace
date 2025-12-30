#!/bin/bash

# Full Database Reset Script
# Drops all tables, regenerates schema, migrates, restarts Electric, and seeds

set -e

echo "🛑 Stopping Electric SQL container first..."
docker stop docpal-electric 2>/dev/null || true

echo ""
echo "🗑️  Dropping all tables and clearing Electric state in PostgreSQL..."

# Drop all tables first
docker exec -i docpal-postgres psql -U docpal -d docpal << 'EOF'
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Disable triggers
    SET session_replication_role = 'replica';
    
    -- Drop all tables in public schema (except PostGIS system tables)
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'spatial_ref_sys') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
    
    -- Re-enable triggers
    SET session_replication_role = 'origin';
END $$;
EOF

echo "✅ Tables dropped"

# Drop replication slots (must be outside DO block/transaction)
echo "🔄 Dropping Electric replication slots..."
docker exec -i docpal-postgres psql -U docpal -d docpal << 'EOF' || true
SELECT pg_drop_replication_slot(slot_name) 
FROM pg_replication_slots 
WHERE slot_name LIKE 'electric%';
EOF

# Drop publications
echo "🔄 Dropping Electric publications..."
docker exec -i docpal-postgres psql -U docpal -d docpal << 'EOF' || true
DROP PUBLICATION IF EXISTS electric_publication_default;
DROP PUBLICATION IF EXISTS electric_publication;
EOF

# Also drop the drizzle migration table to force re-migration
echo "🔄 Dropping migration tracking tables..."
docker exec -i docpal-postgres psql -U docpal -d docpal << 'EOF' || true
DROP TABLE IF EXISTS __drizzle_migrations CASCADE;
DROP TABLE IF EXISTS drizzle_migrations CASCADE;
DROP TABLE IF EXISTS _hub_migrations CASCADE;
EOF

# Show remaining state for debugging
echo ""
echo "📊 Remaining PostgreSQL state:"
docker exec -i docpal-postgres psql -U docpal -d docpal << 'EOF'
SELECT 'Replication slots:' as info;
SELECT slot_name, active FROM pg_replication_slots;
SELECT 'Publications:' as info;
SELECT pubname FROM pg_publication;
SELECT 'Tables:' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'spatial_ref_sys';
EOF

echo "✅ All tables and Electric state cleaned"

echo ""
echo "📝 Generating migrations..."
pnpm db:generate

echo ""
echo "🚀 Running migrations..."
pnpm db:migrate

echo ""
echo "⚡ Enabling Electric SQL publication..."
docker exec -i docpal-postgres psql -U docpal -d docpal << 'EOF'
-- Enable Electric SQL sync for all tables
DROP PUBLICATION IF EXISTS electric_publication;
CREATE PUBLICATION electric_publication FOR TABLE 
  users,
  companies,
  company_members,
  company_invites,
  workspaces;
SELECT 'Electric publication created for tables:' as info;
SELECT tablename FROM pg_publication_tables WHERE pubname = 'electric_publication';
EOF

echo ""
echo "🔄 Starting Electric SQL container fresh..."
docker start docpal-electric

# Wait for Electric to be ready (it needs to recreate replication slots)
echo "⏳ Waiting for Electric to be ready..."
sleep 5

# Check Electric health
echo "🔍 Checking Electric health..."
curl -s http://localhost:30000/v1/health || echo "Electric may still be initializing..."

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

