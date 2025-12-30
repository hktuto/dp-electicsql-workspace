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

# Check if we actually seeded
WAS_SEEDED=$(echo "$SEED_RESPONSE" | jq -r '.seeded')
if [ "$WAS_SEEDED" = "true" ]; then
  echo "⏳ Waiting for Electric SQL to sync seeded data..."
  sleep 5
else
  echo "ℹ️  Database already seeded, continuing..."
  sleep 1
fi
echo ""

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
# Get all workspaces from Electric SQL (it filters by user's access automatically)
echo "Getting workspaces from Electric..."
WORKSPACE_SHAPE=$(curl -s "$API_URL/electric/shape?table=workspaces")
echo "Workspaces response:"
echo "$WORKSPACE_SHAPE" | jq .
echo ""

WORKSPACE_ID=$(echo "$WORKSPACE_SHAPE" | jq -r 'if type == "array" then .[0].id else empty end')
COMPANY_ID=$(echo "$WORKSPACE_SHAPE" | jq -r 'if type == "array" then .[0].company_id else empty end')

if [ -z "$WORKSPACE_ID" ] || [ "$WORKSPACE_ID" = "null" ]; then
  echo "⚠️  No workspace found. Creating one..."
  
  # Get company from company_members
  COMPANY_MEMBERS=$(curl -s "$API_URL/electric/shape?table=company_members")
  echo "Company members response:"
  echo "$COMPANY_MEMBERS" | jq .
  COMPANY_ID=$(echo "$COMPANY_MEMBERS" | jq -r 'if type == "array" then .[0].company_id else empty end')
  
  if [ -z "$COMPANY_ID" ] || [ "$COMPANY_ID" = "null" ]; then
    # Fallback: get from companies table
    echo "Trying companies table..."
    COMPANIES=$(curl -s "$API_URL/electric/shape?table=companies")
    echo "Companies response:"
    echo "$COMPANIES" | jq .
    COMPANY_ID=$(echo "$COMPANIES" | jq -r 'if type == "array" then .[0].id else empty end')
  fi
  
  if [ -z "$COMPANY_ID" ] || [ "$COMPANY_ID" = "null" ]; then
    echo "❌ No company found. Cannot create workspace."
    exit 1
  fi
  
  echo "Using company ID for workspace creation: $COMPANY_ID"
  
  CREATE_WS_RESPONSE=$(curl -s -b /tmp/cookies.txt -X POST "$API_URL/workspaces" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Test Workspace\",
      \"companyId\": \"$COMPANY_ID\",
      \"description\": \"Test workspace for dynamic tables\",
      \"icon\": \"mdi:folder\"
    }")
  
  echo "✅ Workspace creation response:"
  echo "$CREATE_WS_RESPONSE" | jq .
  WORKSPACE_ID=$(echo "$CREATE_WS_RESPONSE" | jq -r '.workspace.id')
  COMPANY_ID=$(echo "$CREATE_WS_RESPONSE" | jq -r '.workspace.companyId')
  
  # Wait for Electric sync
  echo "⏳ Waiting for Electric sync..."
  sleep 3
fi

echo "✅ Using workspace ID: $WORKSPACE_ID"
echo "✅ Using company ID: $COMPANY_ID"
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

