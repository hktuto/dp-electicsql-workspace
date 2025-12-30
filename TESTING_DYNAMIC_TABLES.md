# Testing Dynamic Tables API

## Prerequisites

### 1. Reset Database (Apply New Schema)

Since you're having Docker permission issues, try one of these:

**Option A: Use the API reset endpoint**
```bash
curl -X POST http://localhost:3000/api/dev/reset -H 'x-dev-secret: docpal-dev-secret'
```

**Option B: Manual PostgreSQL migration** (if dev server is running)
```bash
# Already done: pnpm db:migrate

# Just seed the database
curl -X POST http://localhost:3000/api/dev/seed -H 'x-dev-secret: docpal-dev-secret'
```

**Option C: Fix Docker permissions** (permanent solution)
```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Apply group changes (or logout/login)
newgrp docker

# Now you can run without sudo
pnpm db:reset
```

### 2. Verify Dev Server is Running
```bash
pnpm dev
```

Server should be running on `http://localhost:3000`

---

## Running the Test Script

Once database is seeded:

```bash
./test-dynamic-tables.sh
```

---

## Manual Testing (Alternative)

If the script doesn't work, test manually:

### Step 1: Login
```bash
curl -c /tmp/cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "super@docpal.com",
    "password": "password"
  }'
```

### Step 2: Get User Info
```bash
curl -b /tmp/cookies.txt http://localhost:3000/api/auth/me
```

Copy the `workspace_id` from the response.

### Step 3: Create a Dynamic Table
```bash
WORKSPACE_ID="<paste-workspace-id-here>"

curl -b /tmp/cookies.txt -X POST \
  "http://localhost:3000/api/workspaces/$WORKSPACE_ID/tables" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customers",
    "slug": "test-customers",
    "description": "Test table",
    "icon": "mdi:account",
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
        "name": "email",
        "label": "Email",
        "type": "email",
        "required": true,
        "order": 1,
        "isUnique": true
      }
    ]
  }'
```

### Step 4: Verify Physical Table in PostgreSQL
```bash
# From the response above, copy the "tableName" (e.g., dt_abc1234)
TABLE_NAME="<paste-table-name-here>"

docker exec -i docpal-postgres psql -U docpal -d docpal -c "\d $TABLE_NAME"
```

You should see the table structure with columns:
- `id` (UUID, PRIMARY KEY)
- `created_by` (UUID)
- `updated_by` (UUID)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `full_name` (VARCHAR, NOT NULL)
- `email` (VARCHAR, NOT NULL, UNIQUE)

### Step 5: Check Metadata Tables
```bash
# Check data_tables
docker exec -i docpal-postgres psql -U docpal -d docpal -c \
  "SELECT id, name, slug, table_name FROM data_tables;"

# Check data_table_columns
docker exec -i docpal-postgres psql -U docpal -d docpal -c \
  "SELECT name, label, type, required FROM data_table_columns ORDER BY \"order\";"

# Check table_migrations
docker exec -i docpal-postgres psql -U docpal -d docpal -c \
  "SELECT version, description FROM table_migrations ORDER BY version;"
```

### Step 6: Add a Column
```bash
TABLE_ID="<paste-table-id-here>"

curl -b /tmp/cookies.txt -X POST \
  "http://localhost:3000/api/tables/$TABLE_ID/columns" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "phone",
    "label": "Phone Number",
    "type": "phone",
    "order": 2
  }'
```

Then verify with `\d $TABLE_NAME` again - should see the new `phone` column!

### Step 7: Delete the Table
```bash
curl -b /tmp/cookies.txt -X DELETE \
  "http://localhost:3000/api/workspaces/$WORKSPACE_ID/tables/$TABLE_ID"
```

Verify table is dropped:
```bash
docker exec -i docpal-postgres psql -U docpal -d docpal -c "\dt $TABLE_NAME"
# Should show: Did not find any relation named "dt_xxxxx"
```

---

## What Success Looks Like

✅ Physical table `dt_xxxxxxx` created in PostgreSQL  
✅ Metadata in `data_tables`, `data_table_columns` tables  
✅ Migration history in `table_migrations` table  
✅ Columns can be added via ALTER TABLE  
✅ Table deletion removes both physical table and metadata  

---

## Troubleshooting

### "Invalid email or password"
- Database not seeded yet
- Run: `curl -X POST http://localhost:3000/api/dev/seed -H 'x-dev-secret: docpal-dev-secret'`

### "No workspace found"
- No workspaces exist yet
- Create one via the UI at `/workspaces` after logging in

### "Table not found in synced tables"
- Database schema not updated
- Run: `pnpm db:migrate` (already done)
- Or reset: Use API reset endpoint

### Docker Permission Denied
- Add user to docker group: `sudo usermod -aG docker $USER`
- Then `newgrp docker` or logout/login


