# Architecture Decision Records (ADR)

## ADR-001: Denormalize Component References in ComponentNode

**Date:** 2026-01-01  
**Status:** ✅ Accepted  
**Deciders:** User, AI Assistant

---

### Context

We have two types:
1. **ComponentSchema** - Defines component capabilities (stored in registry/DB)
2. **ComponentNode** - Instance of component in page tree (stored in workspace_pages)

**Question:** Should ComponentNode store `renderComponent` and `editComponent` names, or just reference `componentId` and look them up?

---

### Decision

**Store `renderComponent` and `editComponent` directly in ComponentNode** (denormalized).

```typescript
export interface ComponentNode {
  componentId: string           // Reference for schema lookup
  componentVersion: number
  
  // ✅ DENORMALIZED (stored in node)
  renderComponent: string       
  editComponent?: string
  
  // ... rest of fields
}
```

---

### Rationale

#### **Pros of Denormalization:**

1. **Backend handles migration** ⭐
   - When component schema changes, backend migrates all pages
   - Updates `renderComponent` and `editComponent` during migration
   - Frontend receives ready-to-render data

2. **Frontend is simpler** ⭐
   - No schema lookup needed
   - Just: `<component :is="node.renderComponent" />`
   - Faster rendering (no registry lookups)

3. **Clear separation of concerns**
   - Backend: Source of truth, handles migrations
   - Frontend: Dumb renderer, trusts backend

4. **Better performance**
   - No registry lookup for every component
   - Especially important for deep trees (100+ components)

5. **Easier caching**
   - Page JSON contains everything needed to render
   - Can cache entire page without registry dependency

#### **Cons of Denormalization:**

1. **Data duplication** ⚠️
   - Same component name stored in many nodes
   - Larger JSON payload (~10% increase)

2. **Potential inconsistency** ⚠️
   - If migration fails, nodes might have wrong component names
   - Mitigated by: Validation on save, migration tests

3. **Schema updates require page updates** ⚠️
   - If component is renamed, all pages must update
   - Mitigated by: Background migration job

---

### Comparison: Normalized vs Denormalized

#### **Option A: Normalized (Schema Lookup)**

```typescript
// ComponentNode (normalized)
{
  componentId: "workspaceList",
  componentVersion: 2,
  instanceId: "ws-1",
  // NO renderComponent stored
  props: {}
}

// Frontend must do:
const schema = registry.get(node.componentId)
const component = schema.renderComponent  // Extra lookup!
```

**Flow:**
1. Load page JSON from DB
2. For each node, lookup schema in registry
3. Get renderComponent from schema
4. Render

#### **Option B: Denormalized (Direct Reference)** ✅ **CHOSEN**

```typescript
// ComponentNode (denormalized)
{
  componentId: "workspaceList",
  componentVersion: 2,
  instanceId: "ws-1",
  renderComponent: "WorkspaceList",  // ✅ Direct reference
  editComponent: "WorkspaceListEdit",
  props: {}
}

// Frontend just uses it:
<component :is="node.renderComponent" />
```

**Flow:**
1. Load page JSON from DB (already migrated by backend)
2. Render directly

---

### Implementation Details

#### **Backend Responsibilities:**

1. **On Page Save:**
   ```typescript
   // server/api/workspaces/[id]/pages/[pageId].put.ts
   
   async function savePage(pageId: string, rootNode: ComponentNode) {
     // 1. Migrate to latest versions
     const migrated = migrateNode(rootNode)
     
     // 2. Ensure renderComponent/editComponent are correct
     const validated = validateAndPopulateComponents(migrated)
     
     // 3. Save to DB
     await db.update(workspacePages)
       .set({ rootNode: JSON.stringify(validated) })
       .where(eq(workspacePages.id, pageId))
   }
   ```

2. **On Page Load:**
   ```typescript
   // server/api/workspaces/[id]/pages/[pageId].get.ts
   
   async function loadPage(pageId: string) {
     const page = await db.query.workspacePages.findFirst(...)
     const rootNode = JSON.parse(page.rootNode)
     
     // Optional: Validate components still exist
     validateComponentsExist(rootNode)
     
     return { ...page, rootNode }
   }
   ```

3. **Migration Function:**
   ```typescript
   function migrateNode(node: ComponentNode): ComponentNode {
     const schema = getSchemaById(node.componentId)
     
     if (node.componentVersion < schema.version) {
       // Apply migrations
       const migrated = applyMigrations(node, schema.migrations)
       
       // Update component references
       migrated.renderComponent = schema.renderComponent
       migrated.editComponent = schema.editComponent
       
       return migrated
     }
     
     return node
   }
   ```

#### **Frontend Responsibilities:**

1. **Simple Rendering:**
   ```vue
   <!-- Just render what backend gave us -->
   <component :is="node.renderComponent" v-bind="node.props">
     <!-- slots -->
   </component>
   ```

2. **No Schema Lookups:** (except for edit mode UI like component picker)

3. **Trust Backend:** Assume data is valid and migrated

---

### Migration Strategy

When a component is renamed or restructured:

1. **Update ComponentSchema:**
   ```typescript
   {
     id: "workspaceList",
     version: 3,  // Bumped
     versionName: "2.0.0",
     renderComponent: "WorkspaceListV2",  // NEW NAME
     editComponent: "WorkspaceListV2Edit",
     migrations: [{
       fromVersion: 2,
       toVersion: 3,
       migrate: (node) => ({
         ...node,
         renderComponent: "WorkspaceListV2",  // UPDATE
         editComponent: "WorkspaceListV2Edit"
       })
     }]
   }
   ```

2. **Run Background Migration:**
   ```bash
   pnpm nuxt task run migrate-components
   ```

3. **All Pages Updated:** `renderComponent` now points to new component

---

### Alternatives Considered

#### **Alternative 1: Hybrid Approach**
- Store `componentId` for reference
- Cache schema lookups in frontend
- **Rejected:** More complex, doesn't solve main issue

#### **Alternative 2: Component Map in Page**
- Store schema map at page level
- Look up from page-local map
- **Rejected:** Still requires lookups, adds complexity

#### **Alternative 3: Code Splitting**
- Dynamically import components
- Load only what's needed
- **Not Rejected:** Can be added later on top of current approach

---

### Consequences

#### **Positive:**
- ✅ Backend is single source of truth
- ✅ Frontend is simpler and faster
- ✅ Clear separation of concerns
- ✅ Migration happens server-side
- ✅ Better performance

#### **Negative:**
- ⚠️ Larger JSON payload (~10% more)
- ⚠️ Need robust migration testing
- ⚠️ Schema changes require page updates

#### **Neutral:**
- Registry still exists for edit mode UI (component picker)
- Backend has more responsibility (but that's okay)

---

### Notes

- This decision aligns with "backend validates, frontend renders" principle
- Similar to how many CMS systems work (Contentful, Strapi, etc.)
- Prioritizes runtime performance over storage efficiency
- Makes sense for your single-repo architecture

---

### Related Decisions

- **ADR-002:** Component versioning strategy (integer + versionName)
- **ADR-003:** Runtime vs background migration (TBD)
- **ADR-004:** Props expression syntax (TBD)

---

### Review Date

**Next Review:** After Phase 3.4.2 (POC testing complete)

---

## Questions for Future Consideration

1. Should we cache component schemas in frontend anyway? (for validation)
2. How to handle component deletion? (mark as deprecated?)
3. Should we version the entire page schema too?
4. How to handle A/B testing with different component versions?

