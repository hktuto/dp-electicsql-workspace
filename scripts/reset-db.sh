#!/bin/bash

# Full Database Reset Script
# Drops all tables, regenerates schema, migrates, restarts Electric, and seeds

set -e

echo "🗑️  Dropping all application tables in PostgreSQL..."

# Drop specific application tables (avoiding PostGIS system tables)
docker exec -i docpal-postgres psql -U docpal -d docpal << 'EOF'
DROP TABLE IF EXISTS company_invites CASCADE;
DROP TABLE IF EXISTS company_members CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS test_items CASCADE;
DROP TABLE IF EXISTS _hub_migrations CASCADE;
DROP PUBLICATION IF EXISTS electric_publication;
DROP PUBLICATION IF EXISTS electric_publication_default;
EOF

echo "✅ All application tables dropped"

echo ""
echo "📝 Generating migrations..."
pnpm db:generate

echo ""
echo "🚀 Applying migrations to PostgreSQL..."
# Apply Drizzle-generated migrations
for file in server/db/migrations/postgresql/*.sql; do
  if [ -f "$file" ]; then
    echo "  Applying $(basename $file)..."
    docker exec -i docpal-postgres psql -U docpal -d docpal < "$file"
  fi
done

# Apply custom migrations
for file in server/db/custom-migrations/*.sql; do
  if [ -f "$file" ]; then
    echo "  Applying $(basename $file)..."
    docker exec -i docpal-postgres psql -U docpal -d docpal < "$file"
  fi
done

echo ""
echo "📋 Marking migrations as applied in NuxtHub..."
# Mark all migrations as applied so NuxtHub doesn't try to re-apply them
for file in server/db/migrations/postgresql/*.sql; do
  if [ -f "$file" ]; then
    migration_name=$(basename "$file" .sql)
    npx nuxt db mark-as-migrated "$migration_name" 2>/dev/null || true
  fi
done

for file in server/db/custom-migrations/*.sql; do
  if [ -f "$file" ]; then
    migration_name=$(basename "$file" .sql)
    npx nuxt db mark-as-migrated "$migration_name" 2>/dev/null || true
  fi
done

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

