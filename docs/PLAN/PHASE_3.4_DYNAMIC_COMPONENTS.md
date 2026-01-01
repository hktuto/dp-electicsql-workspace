# Phase 3.4: Dynamic Component System

## Overview

Build a dynamic component rendering system that allows components to be defined, stored, and rendered from configuration. This phase lays the foundation for future AI-assisted app building while improving current code organization.

**Timing:** Perfect moment - we're already refactoring all components due to Electric SQL sync pattern changes.

---

## Goals

### Phase 3.4.1: Foundation (Do NOW) ⭐
- Database schema for component definitions
- Component metadata system (props, events, hooks)
- Component registry and discovery
- Dynamic renderer with security
- Refactor existing components with metadata

### Phase 3.4.2: Dynamic Pages (3-6 months)
- Page definition storage
- Runtime page composition
- Provider injection system
- Custom event handlers (sandboxed)

### Phase 3.4.3: Builder UI (6-12 months)
- Visual page builder
- Component marketplace
- AI-assisted building

---

## Architecture

### Component Types

```typescript
// Base types for all components
type ComponentType = 'component' | 'container' | 'provider'

// Component metadata (stored in DB + exported from .vue files)
interface ComponentMeta {
  id: string                    // Unique identifier (e.g., 'workspace-detail')
  name: string                  // Display name
  type: ComponentType
  description: string           // For AI/humans to understand usage
  category: string              // For organization (e.g., 'workspace', 'table', 'form')
  
  // Schema definitions (JSON Schema)
  props?: JSONSchema            // Prop types and validation
  events?: JSONSchema           // Emitted events
  slots?: JSONSchema            // Available slots
  exposes?: JSONSchema          // Exposed methods/refs (for providers)
  
  // Requirements
  requiredProviders?: string[]  // Provider IDs needed
  requiredParent?: string[]     // Valid parent component IDs
  
}

// Page tree node (stored in DB)
interface PageNode {
  id: string
  componentId: string           // References ComponentMeta.id
  
  // Configuration
  props?: Record<string, any>
  eventHandlers?: Record<string, string>  // Safe expression strings
  customStyle?: Record<string, any>
  
  // Tree structure
  children?: PageNode[]
}

// Page definition (stored in DB)
interface PageDefinition {
  id: string
  workspaceId: string
  name: string
  urlPattern: string            // Regex pattern to match URL
  
  // Root configuration
  rootNode: PageNode
  
  // Global page settings
  providers?: string[]          // Provider component IDs to inject
  globalFunctions?: Record<string, string>  // Safe expression strings
  customCSS?: string
}
```

---

## Database Schema

### `ui_components` Table

```sql
CREATE TABLE ui_components (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('component', 'container', 'provider')),
  description TEXT,
  category TEXT,
  
  -- JSON Schema definitions
  props_schema JSONB,
  events_schema JSONB,
  slots_schema JSONB,
  exposes_schema JSONB,
  
  -- Requirements
  required_providers TEXT[],
  required_parent TEXT[],
  
  -- Metadata
  is_system BOOLEAN DEFAULT false,  -- System components (can't be deleted)
  is_public BOOLEAN DEFAULT false,  -- Available to all workspaces
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ui_components_category ON ui_components(category);
CREATE INDEX idx_ui_components_type ON ui_components(type);
```

### `workspace_pages` Table

```sql
CREATE TABLE workspace_pages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url_pattern TEXT NOT NULL,
  
  -- Page tree (JSONB for now, could normalize later)
  root_node JSONB NOT NULL,
  
  -- Global settings
  providers TEXT[],
  global_functions JSONB,
  custom_css TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(workspace_id, url_pattern)
);

CREATE INDEX idx_workspace_pages_workspace ON workspace_pages(workspace_id);
```

---

## Implementation Steps

### Step 1: Component Metadata System

**Goal:** Make existing components "discoverable" and type-safe.

```typescript
// layers/workspace/app/components/workspace/Detail.global.vue

// Export component metadata (NEW)
export const componentMeta: ComponentMeta = {
  id: 'workspace-detail',
  name: 'Workspace Detail',
  type: 'component',
  description: 'Displays workspace details and content',
  category: 'workspace',
  
  props: {
    type: 'object',
    properties: {
      slug: { 
        type: 'string', 
        description: 'Workspace slug' 
      }
    },
    required: ['slug']
  },
  
  events: {
    type: 'object',
    properties: {
      'workspace-loaded': {
        description: 'Emitted when workspace data is loaded',
        payload: { type: 'object' }
      }
    }
  },
  
  requiredProviders: ['company-context'],
  
  componentPath: 'layers/workspace/app/components/workspace/Detail.global.vue'
}

// Existing component code...
```

**Auto-discovery script:** Scan all `.global.vue` files and populate `ui_components` table.

---

### Step 2: Component Registry

**Goal:** Runtime component lookup and validation.

```typescript
// app/composables/useComponentRegistry.ts

interface ComponentRegistry {
  [componentId: string]: {
    meta: ComponentMeta
    component: Component  // Vue component
  }
}

export function useComponentRegistry() {
  const registry = useState<ComponentRegistry>('componentRegistry', () => ({}))
  
  // Register a component
  const register = (meta: ComponentMeta, component: Component) => {
    registry.value[meta.id] = { meta, component }
  }
  
  // Get component by ID
  const get = (componentId: string) => {
    return registry.value[componentId]
  }
  
  // Validate component usage
  const validate = (node: PageNode, parentContext?: string[]) => {
    const comp = get(node.componentId)
    if (!comp) throw new Error(`Component not found: ${node.componentId}`)
    
    // Validate props against schema
    if (comp.meta.props) {
      // Use Ajv or similar JSON Schema validator
    }
    
    // Check required providers
    // Check parent constraints
    
    return true
  }
  
  // Auto-register all global components
  const autoRegister = () => {
    // Scan all .global.vue files
    // Extract componentMeta exports
    // Register each one
  }
  
  return { registry, register, get, validate, autoRegister }
}
```

---

### Step 3: Dynamic Component Renderer

**Goal:** Safely render component trees from configuration.

```vue
<!-- app/components/DynamicRenderer.vue -->

<script setup lang="ts">
import type { PageNode } from '#shared/types/dynamic-page'

interface Props {
  node: PageNode
  context?: Record<string, any>  // Injected context from providers
}

const props = defineProps<Props>()
const registry = useComponentRegistry()

// Get component from registry
const componentDef = computed(() => {
  const def = registry.get(props.node.componentId)
  if (!def) {
    console.error(`Component not found: ${props.node.componentId}`)
    return null
  }
  return def
})

// Validate and bind props
const boundProps = computed(() => {
  if (!componentDef.value) return {}
  
  // Merge static props + dynamic context
  const merged = { ...props.node.props }
  
  // TODO: Evaluate safe expressions (e.g., props.slug could be "{{route.params.slug}}")
  // Use a safe evaluator, NOT eval()
  
  return merged
})

// Event handlers (safe evaluation)
const boundEvents = computed(() => {
  if (!props.node.eventHandlers) return {}
  
  const handlers: Record<string, Function> = {}
  
  for (const [event, expression] of Object.entries(props.node.eventHandlers)) {
    handlers[event] = (...args: any[]) => {
      // TODO: Safely evaluate expression with context
      // Use JSONLogic or custom safe evaluator
      console.log(`Event ${event}:`, args)
    }
  }
  
  return handlers
})
</script>

<template>
  <component
    v-if="componentDef"
    :is="componentDef.component"
    v-bind="boundProps"
    v-on="boundEvents"
    :style="node.customStyle"
  >
    <!-- Recursively render children -->
    <template v-if="node.children?.length">
      <DynamicRenderer
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :context="context"
      />
    </template>
  </component>
  
  <div v-else class="component-error">
    Component not found: {{ node.componentId }}
  </div>
</template>
```

---

### Step 4: Safe Expression Evaluator

**Critical:** Never use `eval()` or `new Function()` with user input.

**Options:**
1. **JSONLogic** - Safe, declarative logic
2. **Expression parser** - Custom AST parser with whitelist
3. **Template strings only** - No logic, just variable substitution

**Recommended: JSONLogic for Phase 1**

```typescript
// app/utils/safeEvaluator.ts
import jsonLogic from 'json-logic-js'

export function evaluateExpression(
  expression: any,  // JSONLogic expression
  context: Record<string, any>
): any {
  try {
    return jsonLogic.apply(expression, context)
  } catch (err) {
    console.error('Expression evaluation error:', err)
    return undefined
  }
}

// Example usage:
// expression: { "var": "route.params.slug" }
// context: { route: { params: { slug: "my-workspace" } } }
// result: "my-workspace"
```

---

## Refactoring Strategy

### For Each Component Layer:

1. **Add metadata export** to each `.global.vue` file
2. **Define prop schemas** using JSON Schema
3. **Document events** with payload schemas
4. **Register on startup** in layer's plugin

### Example Migration:

**Before:**
```vue
<!-- WorkspaceDetail.global.vue -->
<script setup lang="ts">
const props = defineProps<{ slug: string }>()
// ... component code
</script>
```

**After:**
```vue
<!-- WorkspaceDetail.global.vue -->
<script setup lang="ts">
// Metadata export
export const componentMeta: ComponentMeta = {
  id: 'workspace-detail',
  // ... (shown above)
}

// Same component code
const props = defineProps<{ slug: string }>()
// ...
</script>
```

No functional changes to components, just adding metadata.

---

## Benefits of Doing This NOW

1. **Already refactoring** - No wasted effort
2. **Better architecture** - Cleaner, more maintainable components
3. **Type safety** - JSON Schema validation at runtime
4. **Future-proof** - Foundation for AI building
5. **Documentation** - Components self-document
6. **Testing** - Easier to generate test cases from schemas
7. **Dogfooding** - We use our own system

---

## What NOT to Build Yet

### Skip for now:
- ❌ Visual page builder UI
- ❌ Drag-and-drop editor
- ❌ Component marketplace
- ❌ Custom event handler editor
- ❌ AI integration

### Why:
- Still learning what abstractions work
- Need to validate with real usage
- Phase 3.4.1 provides foundation without commitment

---

## Testing Strategy

### Phase 3.4.1:
1. **Hardcoded usage** - Define page trees in code, render dynamically
2. **Validate existing pages** - Ensure all current pages work with new system
3. **Component metadata** - Verify all components have valid schemas

### Phase 3.4.2:
1. **DB-loaded pages** - Store one test page in DB, load and render
2. **Custom props** - Test dynamic prop binding
3. **Event handlers** - Test safe expression evaluation

---

## Migration Path

### Week 1: Infrastructure
- Create DB schema
- Build component registry
- Build dynamic renderer
- Add safe evaluator

### Week 2-3: Refactor Components
- Add metadata to all global components
- Test with hardcoded page trees
- Verify existing pages still work

### Week 4: Integration
- Update Dockview to use registry
- Update routing to use dynamic renderer (optional)
- Add component sync (Electric SQL)

---

## Success Criteria

### Phase 3.4.1 Complete When:
- ✅ All global components have metadata
- ✅ Component registry auto-discovers components
- ✅ Dynamic renderer can render hardcoded page trees
- ✅ All existing pages work (no regressions)
- ✅ Safe expression evaluator works for basic cases
- ✅ DB schema is in place (even if not used yet)

---

## Implementation Order (Revised - Iterative Approach)

### Step 1: Component Inventory & Prioritization

#### Existing Components (Already Built)
| Component | Type | Props | Status | Notes |
|-----------|------|-------|--------|-------|
| `HomePage` | component | - | ✅ Exists | Simple, good for testing |
| `WorkspaceList` | component | - | ✅ Exists | List view |
| `WorkspaceDetail` | component | `slug` | ✅ Exists | Has props, good test case |
| `WorkspaceSettings` | component | `slug` | ✅ Exists | Complex form |
| `DataTableList` | component | `workspaceId` | ✅ Exists | List view |
| `DataTableSettings` | component | `tableId` | ✅ Exists | Complex form |
| `CompanySettings` | component | `slug` | ✅ Exists | Settings page |

#### Planned Components (To Build)
| Component | Type | Props | Priority | Phase |
|-----------|------|-------|----------|-------|
| `UserHome` | component | - | 🔴 High | Phase 4 |
| `TableView` | component | `workspaceId`, `tableId` | 🔴 High | Phase 4 |
| `TableSettings` | component | `workspaceId`, `tableId` | 🟡 Medium | Phase 4 |
| `FolderView` | component | `workspaceId`, `folderId` | 🟡 Medium | Phase 5 |
| `FolderSettings` | component | `workspaceId`, `folderId` | 🟡 Medium | Phase 5 |
| `ViewDetail` | component | `workspaceId`, `viewId` | 🟢 Low | Phase 5 |
| `ViewSettings` | component | `workspaceId`, `viewId` | 🟢 Low | Phase 5 |
| `DashboardView` | component | `workspaceId`, `dashboardId` | 🟢 Low | Phase 6 |
| `DashboardSettings` | component | `workspaceId`, `dashboardId` | 🟢 Low | Phase 6 |
| `ChatList` | component | - | 🟢 Low | Future |
| `ChatDetail` | component | `chatId` | 🟢 Low | Future |
| `PublicView` | component | `viewId` | 🟢 Low | Future |
| `PublicDashboard` | component | `dashboardId` | 🟢 Low | Future |
| `NotFound` | component | - | 🟡 Medium | Now |

#### Container/Provider Components (To Design)
| Component | Type | Purpose | Priority |
|-----------|------|---------|----------|
| `PageContainer` | container | Root page wrapper | 🔴 High |
| `GridLayout` | container | Grid layout system | 🟡 Medium |
| `TabContainer` | container | Tab groups | 🟡 Medium |
| `SplitPanel` | container | Resizable panels | 🟢 Low |
| `WorkspaceProvider` | provider | Workspace context | 🔴 High |
| `CompanyProvider` | provider | Company context | 🔴 High |
| `FormProvider` | provider | Form state | 🟡 Medium |
| `ThemeProvider` | provider | Theme context | 🟢 Low |

---

### Step 2: Build Minimum Test Components (Week 1)

**Goal:** Get dynamic rendering working with simplest possible components.

**Approach:** Use local JSON registry (no database yet!)

**Test Set (3 components):**
1. **`SimpleCard`** - Basic component
   - Props: `title`, `content`
   - No events, no providers
   - Pure display component

2. **`InteractiveButton`** - Component with events
   - Props: `label`, `type`
   - Events: `@click`
   - Test event handling

3. **`WorkspaceDetail`** - Real existing component
   - Props: `slug`
   - Events: `@workspace-loaded`
   - Providers: `CompanyProvider`
   - Full integration test

**Deliverables:**
- [ ] Create TypeScript types (`ComponentMeta`, `PageNode`) ✅
- [ ] Create `SimpleCard.global.vue` with metadata export
- [ ] Create `InteractiveButton.global.vue` with metadata export
- [ ] Add metadata to `WorkspaceDetail.global.vue`
- [ ] Create local JSON registry (`app/data/component-registry.json`)
- [ ] Create test page definition (`app/data/test-page.json`)
- [ ] Basic component registry loader (reads from JSON)

---

### Step 3: Build & Test Dynamic Renderer (Week 1-2)

**Goal:** Prove dynamic rendering works with props, events, children.

**Deliverables:**
- [ ] `DynamicRenderer.vue` component
- [ ] Hardcoded test page tree (JSON)
- [ ] Test rendering all 3 test components
- [ ] Test prop binding
- [ ] Test event emission
- [ ] Test nested children
- [ ] Test provider injection (basic)

**Test Page Structure:**
```typescript
const testPage: PageNode = {
  id: 'root',
  componentId: 'PageContainer',
  children: [
    {
      id: 'card-1',
      componentId: 'SimpleCard',
      props: { title: 'Test', content: 'Hello World' }
    },
    {
      id: 'button-1',
      componentId: 'InteractiveButton',
      props: { label: 'Click Me', type: 'primary' },
      eventHandlers: { click: '{ "log": "Button clicked!" }' }
    },
    {
      id: 'workspace-1',
      componentId: 'WorkspaceDetail',
      props: { slug: 'test-workspace' }
    }
  ]
}
```

---

### Step 4: Validate & Move to Database (Week 2-3)

**Goal:** Once schema is validated with JSON, migrate to database.

**Prerequisites:**
- Dynamic renderer works perfectly with JSON
- Component metadata schema is stable
- Page node structure is validated
- No major design changes needed

**Deliverables:**
- [ ] Finalize component metadata schema
- [ ] Create DB migration (`ui_components`, `workspace_pages`)
- [ ] Create seed script (uses JSON files to populate DB)
- [ ] API endpoints:
  - `GET /api/workspaces/:id/pages`
  - `POST /api/workspaces/:id/pages`
  - `PUT /api/workspaces/:id/pages/:pageId`
  - `DELETE /api/workspaces/:id/pages/:pageId`
- [ ] `usePageDefinition()` composable (loads from DB)
- [ ] Migrate test page from JSON to DB
- [ ] Test DB-loaded pages work identically

---

### Step 5: Page Routing Integration (Week 3)

**Goal:** Dynamic pages work with URL routing.

**Challenges to Solve:**
1. **Route matching** - How to match dynamic `urlPattern` to current route?
2. **Param extraction** - How to pass route params as props?
3. **Fallback** - Static pages vs dynamic pages priority?

**Proposed Solution:**

```typescript
// app/pages/workspaces/[slug]/dynamic/[...path].vue
// Catch-all route for dynamic pages

<script setup lang="ts">
const route = useRoute()
const pageLoader = usePageDefinition()

// Find matching page by URL pattern
const pageDef = await pageLoader.findByUrl(route.fullPath)

// Extract params from URL
const pageContext = {
  route: {
    params: route.params,
    query: route.query,
    path: route.path
  }
}
</script>

<template>
  <DynamicRenderer 
    v-if="pageDef" 
    :node="pageDef.rootNode" 
    :context="pageContext" 
  />
  <NotFound v-else />
</template>
```

**Alternative:** Keep using `useAppRouter` pattern, add dynamic page lookup.

**Deliverables:**
- [ ] Design routing strategy
- [ ] Implement page loader
- [ ] Test URL → Page mapping
- [ ] Test param passing
- [ ] Handle 404s

---

### Step 6: Complete Component Library (Week 4+)

**Goal:** Build remaining components with metadata.

**Priority Order:**
1. **Now (Week 4):**
   - [ ] `NotFound` - Error handling
   - [ ] `PageContainer` - Layout wrapper
   - [ ] `UserHome` - User landing page

2. **Phase 4 (Data Tables):**
   - [ ] `TableView` - Main table viewer
   - [ ] `TableSettings` - Table configuration
   - [ ] Add metadata to existing `DataTableList`, `DataTableSettings`

3. **Phase 5 (Views & Folders):**
   - [ ] `FolderView`, `FolderSettings`
   - [ ] `ViewDetail`, `ViewSettings`
   - [ ] `GridLayout` container

4. **Phase 6 (Dashboards):**
   - [ ] `DashboardView`, `DashboardSettings`
   - [ ] Dashboard widget containers

5. **Future:**
   - [ ] Chat components
   - [ ] Public pages
   - [ ] Advanced containers

---

## Next Immediate Steps (Start Now)

### Phase 1: Local JSON Validation (No Database!)

1. ✅ **Create component inventory** (Done above)
2. ✅ **Create TypeScript types** (Done - `shared/types/dynamic-page.ts`)
3. 🔄 **Build test components** - `SimpleCard`, `InteractiveButton`
4. 🔄 **Create local JSON registry** - Component definitions
5. 🔄 **Create test page JSON** - Hardcoded page structure
6. 🔄 **Build dynamic renderer** - Works with local data
7. 🔄 **Add metadata** to existing `WorkspaceDetail`
8. 🔄 **Test & iterate** - Validate schema design

### Phase 2: Database Migration (After Validation)

9. ⏸️ **Finalize schema** - Based on learnings from JSON
10. ⏸️ **Create DB migration** - `ui_components`, `workspace_pages`
11. ⏸️ **Create seed script** - Uses JSON to populate DB
12. ⏸️ **Build APIs** - CRUD for pages
13. ⏸️ **Migrate to DB** - Switch from JSON to DB loading

---

## File Structure

```
app/
├── data/                          # Local data (testing only, before DB)
│   ├── component-registry.json    # Component metadata
│   └── test-page.json             # Test page definition
├── components/
│   ├── DynamicRenderer.vue        # Core renderer
│   └── test/                      # Test components
│       ├── SimpleCard.global.vue
│       └── InteractiveButton.global.vue
└── composables/
    ├── useComponentRegistry.ts    # Component registry (reads from JSON)
    └── usePageDefinition.ts       # Page loader (reads from JSON, later DB)

shared/
└── types/
    └── dynamic-page.ts            # ✅ Already created

server/db/schema/                  # ⏸️ NOT YET - wait for validation
├── ui-components.ts               # (Future)
└── workspace-pages.ts             # (Future)
```

---

**Ready to build Step 2?** I'll create:
1. Test components with metadata exports
2. Local JSON registry
3. Component registry loader
4. Test page definition
