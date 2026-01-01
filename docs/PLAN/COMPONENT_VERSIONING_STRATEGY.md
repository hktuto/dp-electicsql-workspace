# Component Versioning & Migration Strategy (Single Repo)

## Context

**Challenge:** In a single monorepo where frontend and backend deploy together:
- Frontend code (components) and backend (DB) are in sync
- But **database has old page data** created with previous component versions
- Need to handle component schema evolution without breaking existing pages

---

## The Problem Illustrated

```
Day 1: Deploy v1.0
- Users create 100 pages with WorkspaceList v1
- WorkspaceList uses prop: "workspaces"

Day 30: Deploy v2.0  
- WorkspaceList v2 changes prop to: "items"
- All 100 existing pages in DB still use "workspaces"
- 💥 Pages break unless we handle migration
```

---

## Recommended Strategy: **Hybrid Approach**

### **Phase 1: Runtime Migration (MVP - Now)**

**How it works:**
1. Deploy new code with updated components
2. Pages in DB keep old structure
3. On page load, automatically migrate in memory
4. Don't save back to DB yet

**Benefits:**
- ✅ Zero downtime
- ✅ Safe (doesn't touch DB)
- ✅ Easy rollback (just deploy old code)
- ✅ No migration scripts to run
- ✅ Fast to implement

**Trade-offs:**
- ⚠️ Small performance hit on page load
- ⚠️ DB data stays "dirty"
- ⚠️ Can't query by new prop names in DB

**Implementation:**
```typescript
// layers/dynamicPage/app/composables/useDynamicRender.ts

export const useDynamicRenderProvider = (initState: ComponentNode) => {
  const componentState = useComponentState()
  const migration = useComponentMigration()
  
  // AUTO-MIGRATE on load (Phase 1)
  componentState.value = migration.migrateNode(initState)
  
  // ... rest of code
}
```

---

### **Phase 2: Migrate on Save (Production)**

**How it works:**
1. User opens page in edit mode
2. Runtime migration happens
3. When user saves, migrated version goes to DB
4. DB gradually becomes clean

**Benefits:**
- ✅ DB data becomes up-to-date over time
- ✅ No performance hit after migration
- ✅ User-validated (saved by actual users)

**Trade-offs:**
- ⚠️ Only migrates edited pages
- ⚠️ Unused pages stay old forever

**Implementation:**
```typescript
// server/api/workspaces/[id]/pages/[pageId].put.ts

export default defineEventHandler(async (event) => {
  const { pageId } = event.context.params
  const { rootNode } = await readBody(event)
  
  // Migration happens on frontend already
  // Just validate and save
  await db.update(workspacePages)
    .set({ 
      rootNode: JSON.stringify(rootNode),
      updatedAt: new Date()
    })
    .where(eq(workspacePages.id, pageId))
    
  return { success: true }
})
```

---

### **Phase 3: Background Migration Job (Scale)**

**How it works:**
1. Deploy new code
2. Run async task to migrate all pages in DB
3. Monitor progress
4. Old pages get cleaned up

**Benefits:**
- ✅ All pages get migrated
- ✅ DB is clean
- ✅ Can schedule during low traffic

**Trade-offs:**
- ⚠️ More complex
- ⚠️ Need to handle failures
- ⚠️ Potential lock issues

**Implementation:**
```typescript
// server/tasks/migrate-components.ts

export default defineTask({
  meta: {
    name: 'migrate-components',
    description: 'Migrate all pages to latest component versions'
  },
  
  async run({ payload }) {
    const { dryRun = true } = payload || {}
    
    // Get all pages
    const pages = await db
      .select()
      .from(workspacePages)
      .where(eq(workspacePages.isActive, true))
    
    const results = {
      total: pages.length,
      migrated: 0,
      skipped: 0,
      errors: []
    }
    
    for (const page of pages) {
      try {
        const rootNode = JSON.parse(page.rootNode)
        
        // Check if needs migration
        if (!pageNeedsMigration(rootNode)) {
          results.skipped++
          continue
        }
        
        // Migrate
        const migratedNode = migrateNode(rootNode)
        
        if (dryRun) {
          console.log(`[DRY RUN] Would migrate page ${page.id}`)
        } else {
          // Save to DB
          await db.update(workspacePages)
            .set({ 
              rootNode: JSON.stringify(migratedNode),
              updatedAt: new Date()
            })
            .where(eq(workspacePages.id, page.id))
          
          console.log(`✓ Migrated page ${page.id}`)
        }
        
        results.migrated++
        
      } catch (error) {
        console.error(`✗ Failed to migrate page ${page.id}:`, error)
        results.errors.push({ pageId: page.id, error: String(error) })
      }
    }
    
    return results
  }
})
```

**Run it:**
```bash
# Dry run first
pnpm nuxt task run migrate-components --payload '{"dryRun": true}'

# Actually migrate
pnpm nuxt task run migrate-components --payload '{"dryRun": false}'
```

---

## Release Workflow

### **Standard Component Update (Non-Breaking)**

**Example:** Add optional prop, add new feature

```typescript
// v1 -> v2: Add optional "viewMode" prop
{
  fromVersion: 1,
  toVersion: 2,
  description: "Added optional viewMode prop (list|grid)",
  breaking: false,
  migrate: (node) => ({
    ...node,
    props: {
      ...node.props,
      viewMode: node.props?.viewMode || "list"  // Add default
    }
  })
}
```

**Release Steps:**
1. ✅ Update component code
2. ✅ Bump version: `version: 2, versionName: "1.1.0"`
3. ✅ Add migration function
4. ✅ Test with old pages locally
5. ✅ Deploy (runtime migration handles it)
6. ✅ Monitor logs for migration warnings
7. ⏸️ (Optional) Run background job after 1 week

---

### **Breaking Component Update**

**Example:** Rename prop, change prop type, remove feature

```typescript
// v1 -> v2: Rename "workspaces" to "items"
{
  fromVersion: 1,
  toVersion: 2,
  description: "BREAKING: Renamed 'workspaces' prop to 'items'",
  breaking: true,
  migrate: (node) => {
    const newProps = { ...node.props }
    
    // Rename prop
    if (newProps.workspaces) {
      newProps.items = newProps.workspaces
      delete newProps.workspaces
    }
    
    return {
      ...node,
      props: newProps
    }
  }
}
```

**Release Steps:**
1. ✅ Update component code
2. ✅ Bump major version: `version: 2, versionName: "2.0.0"`
3. ✅ Add migration function
4. ✅ Test migration thoroughly
5. ✅ Add `breaking: true` flag
6. ✅ Update docs with breaking change notice
7. ✅ Deploy
8. ✅ Monitor closely
9. ⚠️ Consider running background migration sooner

---

### **Deprecating a Component**

```typescript
export const componentList = {
  "oldWorkspaceList": {
    id: "oldWorkspaceList",
    name: "Workspace List (OLD)",
    icon: "📋",
    version: 3,
    versionName: "1.5.0",
    deprecated: true,
    deprecationMessage: "Use 'newWorkspaceList' instead. This will be removed in v2.0",
    // ... rest of schema
  },
  
  "newWorkspaceList": {
    id: "newWorkspaceList",
    name: "Workspace List",
    icon: "📋",
    version: 1,
    versionName: "2.0.0",
    // ... new schema
  }
}
```

**Process:**
1. ✅ Create new component with new ID
2. ✅ Mark old component as deprecated
3. ✅ Hide from component picker
4. ✅ Show warning in edit mode
5. ⏸️ Wait 2-3 releases
6. ⏸️ Provide migration tool to convert pages
7. ⏸️ Remove old component

---

## Version Bump Guidelines

### **Semantic Versioning (for versionName)**

- **Patch (1.0.0 → 1.0.1):** Bug fixes, no migration needed
- **Minor (1.0.0 → 1.1.0):** New optional features, backward compatible
- **Major (1.0.0 → 2.0.0):** Breaking changes, migration required

### **Integer Version (for version field)**

- Just increment by 1 for any change that needs migration
- `version: 1` → `version: 2` → `version: 3`
- Doesn't follow semantic versioning
- Used for DB queries and migration logic

**Example:**
```typescript
// Release 1.0.0 (Initial)
version: 1
versionName: "1.0.0"

// Release 1.1.0 (Add optional prop)
version: 2
versionName: "1.1.0"

// Release 1.2.0 (Add another optional prop)
version: 3
versionName: "1.2.0"

// Release 2.0.0 (Breaking change)
version: 4
versionName: "2.0.0"
```

---

## Migration Verification

### **Pre-Deploy Checklist**

```typescript
// scripts/verify-migrations.ts

/**
 * Verify all migrations are valid before deployment
 */
export async function verifyMigrations() {
  const errors: string[] = []
  
  for (const [id, schema] of Object.entries(componentList)) {
    // Check version monotonicity
    if (schema.migrations) {
      let currentVersion = 1
      
      for (const migration of schema.migrations) {
        if (migration.fromVersion !== currentVersion) {
          errors.push(
            `${id}: Migration gap detected. ` +
            `Expected fromVersion ${currentVersion}, got ${migration.fromVersion}`
          )
        }
        currentVersion = migration.toVersion
      }
      
      if (currentVersion !== schema.version) {
        errors.push(
          `${id}: Latest migration ends at v${currentVersion}, ` +
          `but schema version is v${schema.version}`
        )
      }
    }
    
    // Test migrations with mock data
    if (schema.migrations && schema.migrations.length > 0) {
      try {
        const testNode: ComponentNode = {
          componentId: id,
          componentVersion: 1,
          instanceId: 'test',
          props: {}, // Use some test data
          slots: {}
        }
        
        // Try to migrate
        const migrated = migrateNode(testNode)
        
        if (migrated.componentVersion !== schema.version) {
          errors.push(
            `${id}: Migration test failed. ` +
            `Expected v${schema.version}, got v${migrated.componentVersion}`
          )
        }
      } catch (error) {
        errors.push(`${id}: Migration test threw error: ${error}`)
      }
    }
  }
  
  return errors
}

// Run in CI/CD
if (import.meta.main) {
  const errors = await verifyMigrations()
  
  if (errors.length > 0) {
    console.error('❌ Migration verification failed:')
    errors.forEach(err => console.error(`  - ${err}`))
    process.exit(1)
  } else {
    console.log('✅ All migrations verified')
  }
}
```

**Add to CI/CD:**
```yaml
# .github/workflows/deploy.yml

- name: Verify Component Migrations
  run: pnpm tsx scripts/verify-migrations.ts
```

---

## Monitoring & Alerts

### **Track Migration Events**

```typescript
// layers/dynamicPage/app/composables/useComponentMigration.ts

export function useComponentMigration() {
  function migrateNode(node: ComponentNode): ComponentNode {
    // ... existing code ...
    
    // Log migration event for monitoring
    if (migrations.length > 0) {
      // Send to analytics/monitoring
      logMigrationEvent({
        componentId: node.componentId,
        fromVersion: node.componentVersion,
        toVersion: schema.version,
        migrationsApplied: migrations.length,
        breaking: migrations.some(m => m.breaking),
        timestamp: new Date().toISOString()
      })
    }
    
    return migratedNode
  }
}

function logMigrationEvent(event: MigrationEvent) {
  // Option 1: Console (dev)
  console.log('[Migration]', event)
  
  // Option 2: Send to backend (production)
  if (process.env.NODE_ENV === 'production') {
    $fetch('/api/analytics/migration', {
      method: 'POST',
      body: event
    }).catch(err => console.error('Failed to log migration:', err))
  }
}
```

### **Dashboard Metrics**

Track:
- Pages migrated per day
- Components with most migrations
- Breaking vs non-breaking changes
- Migration failures
- Time spent in migration

---

## Database Schema (Future)

When you move to DB, add migration tracking:

```sql
CREATE TABLE component_schemas (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  version_name TEXT NOT NULL,
  schema JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE component_migrations (
  id SERIAL PRIMARY KEY,
  component_id TEXT NOT NULL,
  from_version INTEGER NOT NULL,
  to_version INTEGER NOT NULL,
  migration_fn TEXT NOT NULL,  -- Serialized function
  breaking BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track which pages have been migrated
CREATE TABLE page_migrations (
  page_id UUID NOT NULL REFERENCES workspace_pages(id),
  component_id TEXT NOT NULL,
  from_version INTEGER NOT NULL,
  to_version INTEGER NOT NULL,
  migrated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (page_id, component_id, from_version, to_version)
);
```

---

## Summary: What to Do NOW

### **Week 1: Set Up Foundation**
1. ✅ Integer version + versionName added to schema
2. ✅ Migration interface defined
3. ✅ Runtime migration implemented
4. ✅ Test with one component migration

### **Week 2-4: Production Ready**
5. ⏸️ Add verification script
6. ⏸️ Add to CI/CD pipeline
7. ⏸️ Add monitoring/logging
8. ⏸️ Document versioning guidelines

### **Month 2+: Scale**
9. ⏸️ Implement migrate-on-save
10. ⏸️ Build background migration task
11. ⏸️ Add migration dashboard
12. ⏸️ Build automated migration generator

---

## FAQ

**Q: What if migration fails?**
A: Component shows error state in edit mode with "Migrate" button. User can manually fix or rollback.

**Q: Can we skip versions?**
A: No. Migrations must be sequential (1→2→3). This ensures consistency.

**Q: How to test migrations locally?**
A: Create test pages with old data, run migration, verify output.

**Q: When to remove old migrations?**
A: After background job migrates all pages AND you wait 2-3 releases for safety.

**Q: What about nested components?**
A: Migrations are recursive - children get migrated too.

**Q: Performance impact?**
A: Minimal. Migrations are in-memory and fast. Biggest impact is deserializing JSON.

---

## Recommendation

**For your single repo, use this approach:**

1. **Now:** Runtime migration (Phase 1)
2. **Production:** Add migrate-on-save (Phase 2)  
3. **Scale:** Background job (Phase 3)
4. **Always:** Verification in CI/CD

This gives you:
- ✅ Safety (rollback-friendly)
- ✅ Zero downtime
- ✅ Gradual migration
- ✅ Full control
- ✅ Good DX

**Start simple, scale as needed.**

