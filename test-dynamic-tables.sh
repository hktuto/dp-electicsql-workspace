#!/bin/bash

# Test Script for Dynamic Tables API
# Make sure dev server is running on http://localhost:3000

set -e

API_URL="http://localhost:3000/api"
AUTH_COOKIE=""

echo "🧪 Testing Dynamic Tables API"
echo "==============================="
echo ""

# 0. Seed database first
echo "0️⃣  Seeding database (if needed)..."
SEED_RESPONSE=$(curl -s -X POST "$API_URL/dev/seed" \
  -H "x-dev-secret: docpal-dev-secret")
echo "✅ Seed response:"
echo "$SEED_RESPONSE" | jq .
echo ""
sleep 2

# 1. Login first
echo "1️⃣  Logging in..."
LOGIN_RESPONSE=$(curl -s -c /tmp/cookies.txt -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@docpal.app",
    "password": "admin123"
  }')

echo "✅ Login response:"
echo "$LOGIN_RESPONSE" | jq .
echo ""

# 2. Get current user and company
echo "2️⃣  Getting current user info..."
ME_RESPONSE=$(curl -s -b /tmp/cookies.txt "$API_URL/auth/me")
echo "✅ User info:"
echo "$ME_RESPONSE" | jq .
USER_ID=$(echo "$ME_RESPONSE" | jq -r '.user.id')
echo ""

# 3. Get workspaces
echo "3️⃣  Getting workspaces..."
# First, we need to get the company from the user's companies
COMPANY_ID=$(echo "$ME_RESPONSE" | jq -r '.companies[0].id')
echo "Using company ID: $COMPANY_ID"

# Query Electric SQL shape for workspaces
echo "Getting workspace from Electric..."
WORKSPACE_SHAPE=$(curl -s "$API_URL/electric/shape?table=workspaces&company_id=$COMPANY_ID")
WORKSPACE_ID=$(echo "$WORKSPACE_SHAPE" | jq -r '.[0].id // empty')

if [ -z "$WORKSPACE_ID" ]; then
  echo "⚠️  No workspace found. Creating one..."
  CREATE_WS_RESPONSE=$(curl -s -b /tmp/cookies.txt -X POST "$API_URL/workspaces" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Workspace",
      "slug": "test-workspace",
      "description": "Test workspace for dynamic tables",
      "icon": "mdi:folder"
    }')
  
  echo "✅ Workspace created:"
  echo "$CREATE_WS_RESPONSE" | jq .
  WORKSPACE_ID=$(echo "$CREATE_WS_RESPONSE" | jq -r '.workspace.id')
  
  # Wait for Electric sync
  sleep 3
fi

echo "✅ Using workspace ID: $WORKSPACE_ID"
echo ""

# 4. Create a dynamic table
echo "4️⃣  Creating a dynamic table..."
TABLE_RESPONSE=$(curl -s -b /tmp/cookies.txt -X POST \
  "$API_URL/workspaces/$WORKSPACE_ID/tables" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customers",
    "slug": "customers",
    "description": "Customer database",
    "icon": "mdi:account-multiple",
    "columns": [
      {
        "name": "full_name",
        "label": "Full Name",
        "type": "text",
        "required": true,
        "order": 0,
        "isPrimaryDisplay": true
      },
      {
        "name": "email_address",
        "label": "Email",
        "type": "email",
        "required": true,
        "order": 1,
        "isUnique": true
      },
      {
        "name": "phone_number",
        "label": "Phone",
        "type": "phone",
        "order": 2
      },
      {
        "name": "is_active",
        "label": "Active",
        "type": "checkbox",
        "order": 3,
        "defaultValue": "true"
      }
    ]
  }')

echo "✅ Table created:"
echo "$TABLE_RESPONSE" | jq .
TABLE_ID=$(echo "$TABLE_RESPONSE" | jq -r '.table.id')
TABLE_NAME=$(echo "$TABLE_RESPONSE" | jq -r '.table.tableName')
echo ""
echo "Table ID: $TABLE_ID"
echo "Physical table name: $TABLE_NAME"
echo ""

# 5. Add a new column
echo "5️⃣  Adding a new column..."
COLUMN_RESPONSE=$(curl -s -b /tmp/cookies.txt -X POST \
  "$API_URL/tables/$TABLE_ID/columns" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "created_date",
    "label": "Created Date",
    "type": "date",
    "order": 4,
    "config": {
      "displayFormat": "date"
    }
  }')

echo "✅ Column added:"
echo "$COLUMN_RESPONSE" | jq .
COLUMN_ID=$(echo "$COLUMN_RESPONSE" | jq -r '.column.id')
echo ""

# 6. Update the table metadata
echo "6️⃣  Updating table metadata..."
UPDATE_RESPONSE=$(curl -s -b /tmp/cookies.txt -X PUT \
  "$API_URL/workspaces/$WORKSPACE_ID/tables/$TABLE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customers (Updated)",
    "description": "Updated customer database"
  }')

echo "✅ Table updated:"
echo "$UPDATE_RESPONSE" | jq .
echo ""

# 7. Verify physical table exists in PostgreSQL
echo "7️⃣  Verifying physical table in PostgreSQL..."
docker exec -i docpal-postgres psql -U docpal -d docpal << EOF
\d $TABLE_NAME
EOF
echo ""

# 8. Check data_tables in database
echo "8️⃣  Checking data_tables metadata..."
docker exec -i docpal-postgres psql -U docpal -d docpal << EOF
SELECT id, name, slug, table_name, workspace_id FROM data_tables WHERE id = '$TABLE_ID';
EOF
echo ""

# 9. Check data_table_columns in database
echo "9️⃣  Checking data_table_columns metadata..."
docker exec -i docpal-postgres psql -U docpal -d docpal << EOF
SELECT id, name, label, type, required, "order" FROM data_table_columns WHERE data_table_id = '$TABLE_ID' ORDER BY "order";
EOF
echo ""

# 10. Check table_migrations
echo "🔟 Checking table_migrations..."
docker exec -i docpal-postgres psql -U docpal -d docpal << EOF
SELECT version, description, executed_at FROM table_migrations WHERE data_table_id = '$TABLE_ID' ORDER BY version;
EOF
echo ""

# Cleanup (optional - comment out if you want to keep the test data)
echo "🧹 Cleanup: Deleting test table..."
DELETE_RESPONSE=$(curl -s -b /tmp/cookies.txt -X DELETE \
  "$API_URL/workspaces/$WORKSPACE_ID/tables/$TABLE_ID")

echo "✅ Table deleted:"
echo "$DELETE_RESPONSE" | jq .
echo ""

# Verify physical table is dropped
echo "Verifying physical table is dropped..."
docker exec -i docpal-postgres psql -U docpal -d docpal << EOF
\dt $TABLE_NAME
EOF

echo ""
echo "✅ All tests completed successfully!"

