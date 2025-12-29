# Phase 0.0: Infrastructure Setup

## Goals

- Setup database schema with NuxtHub (Drizzle ORM)
- Generate migrations and apply to local PostgreSQL
- Create a dummy table to test Electric SQL sync and change events
- Create seeding scripts/endpoints for dummy data
- Create reset script to drop all tables and reseed
- Setup Electric SQL shared worker with change event broadcasting
- Implement schema versioning for PGLite migration handling

---

## Tasks

- [x] Create dummy `test_items` table schema for sync testing
- [x] Update Electric SQL worker with change event support
- [x] Create `/api/dev/seed` endpoint for seeding dummy data
- [x] Create `/api/dev/reset` endpoint to drop and reseed
- [x] Create Electric SQL composable for frontend usage
- [x] Create navigation wrapper composable (useAppRouter)
- [x] Implement schema versioning in Electric worker
- [x] Create `/api/schema/version` endpoint to get current schema version
- [x] Create `/api/electric/[...shape]` proxy for Electric shapes
- [x] Create `/dev/sync-test` page for testing sync
- [x] Generate and run migrations to local PostgreSQL
- [x] Test sync and change events end-to-end
- [x] Test schema version mismatch triggers PGLite clear
- [x] Direct Electric connection for live updates

---

## Database Schema

### Dummy Test Table

```typescript
// server/db/schema/test-items.ts
import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core'

export const testItems = pgTable('test_items', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

---

## Schema Versioning Strategy

### How It Works

1. Server exposes current schema version via `/api/schema/version`
2. Electric worker stores schema version in IndexedDB (alongside PGLite data)
3. On worker init, compare local version with server version
4. If mismatch: delete PGLite database and re-sync from scratch
5. Store new version after successful sync

### Schema Version Format

```typescript
// Semantic versioning or timestamp-based
const SCHEMA_VERSION = '0.0.1'  // or '20251229_001'
```

### Worker Flow with Versioning

```
1. Worker starts
2. Fetch /api/schema/version
3. Compare with localStorage('pglite_schema_version')
4. If different:
   - Delete IndexedDB database 'docpal-electric'
   - Clear localStorage version
5. Initialize PGLite
6. Sync shapes
7. Store schema version in localStorage
```

### API Endpoint

```typescript
// GET /api/schema/version
{
  version: '0.0.1',
  hash: 'abc123',  // Optional: hash of schema for precise detection
  tables: ['test_items', 'users', ...]  // Optional: list of tables
}
```

---

## Electric SQL Worker Enhancement

### Change Event Types

```typescript
interface DataChangeEvent {
  type: 'DATA_CHANGE'
  shapeName: string
  tableName: string
  changes: {
    insert: any[]
    update: Array<{ old: any; new: any }>
    delete: any[]
  }
}

interface SchemaResetEvent {
  type: 'SCHEMA_RESET'
  reason: 'version_mismatch' | 'manual_reset'
  oldVersion: string | null
  newVersion: string
}
```

### Worker Flow

1. Check schema version (clear if mismatch)
2. Initialize PGLite
3. Subscribe to shapes
4. Track current state in memory
5. On shape update, diff with previous state
6. Broadcast change event with insert/update/delete arrays
7. Update stored state

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schema/version` | Get current schema version |
| POST | `/api/dev/seed` | Seed dummy data |
| POST | `/api/dev/reset` | Drop all tables and reseed |
| POST | `/api/test-items` | Create test item |
| PUT | `/api/test-items/:id` | Update test item |
| DELETE | `/api/test-items/:id` | Delete test item |

---

## Frontend Components

| Component | Description |
|-----------|-------------|
| `/app/workers/electric-sync.worker.ts` | SharedWorker with schema versioning |
| `/app/composables/useElectricSync.ts` | Composable to interact with Electric worker |
| `/app/composables/useAppRouter.ts` | Navigation wrapper for dock/URL mode |

---

## File Structure

```
server/
  db/
    schema/
      test-items.ts         <- NuxtHub auto-scans
  api/
    schema/
      version.get.ts        <- Schema version endpoint
    dev/
      seed.post.ts          <- Seed endpoint
      reset.post.ts         <- Reset endpoint
    test-items/
      index.post.ts         <- Create test item
      [id].put.ts           <- Update test item
      [id].delete.ts        <- Delete test item

app/
  workers/
    electric-sync.worker.ts <- With schema versioning
  composables/
    useElectricSync.ts      <- Electric worker composable
    useAppRouter.ts         <- Navigation wrapper
```

---

## Completion Criteria

- [x] Test items schema created
- [x] API endpoints for CRUD operations
- [x] Electric worker with change events
- [x] useElectricSync composable
- [x] useAppRouter composable
- [x] `pnpm db:generate` creates migrations
- [x] `pnpm db:migrate` applies to local PostgreSQL
- [x] Schema version endpoint works
- [x] Electric SQL syncs `test_items` to PGLite
- [x] Change events broadcast insert/update/delete
- [x] Schema mismatch triggers PGLite clear and re-sync
- [x] Seed endpoint populates test data
- [x] Reset endpoint clears and reseeds
- [x] Cross-tab sync works via SharedWorker

## ✅ Phase 0.0 Complete!
