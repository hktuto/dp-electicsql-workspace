# Phase 3.4.2: POC Testing Checklist

**Status:** 🔄 In Progress  
**Goal:** Validate all core functionality before DB commitment  
**Timeline:** 1-2 weeks

---

## 🎯 **Critical Path (Must Complete)**

### 1. Event Listener System ⚡
**Priority:** High | **Time:** 2-3 hours

- [ ] Test click events from `eventHandlers`
- [ ] Test input events (change, input, blur)
- [ ] Test custom component events
- [ ] Test event payload structure
- [ ] Verify JSONLogic execution (basic)
- [ ] Test event propagation (child → parent)

**Acceptance:**
- All event types trigger correctly
- Event data flows properly
- No console errors

**Test File:** `layers/dynamicPage/app/pages/test/dynamic/events.vue`

---

### 2. Router Implementation 🛣️
**Priority:** High | **Time:** 4-6 hours

#### **Implementation Tasks:**

File: `layers/dynamicPage/app/composables/useDynamicRouter.ts`

```typescript
// Decision: What type of router?
// Option A: Internal (navigate within dynamic page system)
// Option B: External (wrap Nuxt router)
// Option C: Hybrid (both)

// Implement:
function navigate(path: string) {
  // TODO: Decide approach
}

function replace(path: string) {
  // TODO: Implement
}

function back() {
  // TODO: Implement
}

// Parse current URL
const params = ref<Record<string, string>>({})
const query = ref<Record<string, string>>({})
```

#### **Testing Tasks:**

- [ ] Implement basic navigate() function
- [ ] Parse route params from URL
- [ ] Parse query strings
- [ ] Test programmatic navigation
- [ ] Test browser back/forward buttons
- [ ] Test deep linking
- [ ] Decide on internal vs external routing strategy

**Questions to Answer:**
1. Should dynamic pages have their own URL structure?
2. How to handle route params (`:id`) in dynamic pages?
3. Should we use Nuxt router or custom history API?

**Test File:** `layers/dynamicPage/app/pages/test/dynamic/router.vue`

---

### 3. Page Navigation System 📄
**Priority:** High | **Time:** 4-5 hours

#### **Implementation:**

File: `app/pages/[...all].vue`

```vue
<script setup lang="ts">
// Catch-all route for dynamic pages
const route = useRoute()
const path = route.params.all as string[]

// Load page definition based on path
const pageLoader = usePageLoader()
const pageDef = await pageLoader.loadByPath(`/${path.join('/')}`)

// Handle not found
if (!pageDef) {
  throw createError({ 
    statusCode: 404, 
    message: 'Page not found' 
  })
}
</script>

<template>
  <DynamicPage :component="pageDef.rootNode" />
</template>
```

#### **Testing Tasks:**

- [ ] Create catch-all route `[...all].vue`
- [ ] Create page loader composable
- [ ] Test loading different pages by URL
- [ ] Test route change without page reload
- [ ] Handle 404 for unknown pages
- [ ] Test with nested routes `/workspace/abc/table/xyz`
- [ ] Test breadcrumbs

**Test Files:**
- `app/pages/[...all].vue`
- `app/composables/usePageLoader.ts`
- Test pages: `/test/page1`, `/test/page2`

---

### 4. Error Boundary & Isolation 🛡️
**Priority:** High | **Time:** 3-4 hours

#### **Current Implementation:**

File: `layers/dynamicPage/app/components/dynamicPage/component/Renderer.vue`

```vue
<NuxtErrorBoundary>
  <component :is="componentToRender" v-bind="props">
    <!-- children -->
  </component>
  
  <template #error="{ error }">
    <div class="component-error">
      {{ error }}
    </div>
  </template>
</NuxtErrorBoundary>
```

#### **Testing Tasks:**

- [ ] Create intentionally broken component
- [ ] Test error boundary catches failure
- [ ] Verify other components continue working
- [ ] Test error UI displays useful info
- [ ] Test error recovery (reload component)
- [ ] Test nested error boundaries
- [ ] Add error logging/reporting

**Test Scenarios:**
1. Component throws in setup()
2. Component throws in template render
3. Async error in mounted()
4. Props validation failure
5. Missing required slot

**Test File:** `layers/dynamicPage/app/pages/test/dynamic/errors.vue`

---

### 5. Props & Validation 📋
**Priority:** Medium | **Time:** 3-4 hours

- [ ] Test static props binding
- [ ] Test dynamic props (TODO: decide syntax)
- [ ] Implement props validation against schema
- [ ] Test required props check
- [ ] Test optional props with defaults
- [ ] Test prop type coercion
- [ ] Display validation errors in edit mode

**Helper to Implement:**

```typescript
// app/composables/useComponentValidation.ts
export function useComponentValidation() {
  function validateProps(
    componentId: string, 
    props: Record<string, any>
  ): ValidationResult {
    // TODO: Implement with Ajv or custom validator
  }
}
```

**Test File:** `layers/dynamicPage/app/pages/test/dynamic/props.vue`

---

### 6. Slot Rendering 🎰
**Priority:** Medium | **Time:** 2-3 hours

- [ ] Test default slot with children
- [ ] Test multiple named slots
- [ ] Test empty slots
- [ ] Test conditional slots
- [ ] Test slot fallback content
- [ ] Test deeply nested slots (3+ levels)

**Test Component:** Create component with multiple slots:
- `default` slot
- `header` slot
- `footer` slot
- `actions` slot

**Test File:** `layers/dynamicPage/app/pages/test/dynamic/slots.vue`

---

### 7. State Management 💾
**Priority:** Medium | **Time:** 2-3 hours

- [ ] Test undo/redo with VueUse `useRefHistory`
- [ ] Verify state persists across edit/view mode switch
- [ ] Test component state isolation
- [ ] Test undo limit (e.g., last 50 changes)
- [ ] Add visual undo/redo buttons
- [ ] Test keyboard shortcuts (Ctrl+Z, Ctrl+Y)

**Test Scenarios:**
1. Add component → Undo → Component removed
2. Edit props → Undo → Props reverted
3. Delete component → Undo → Component restored
4. Multiple undos in sequence
5. Undo then make new change (branch cleared)

**Test File:** `layers/dynamicPage/app/pages/test/dynamic/undo-redo.vue`

---

## 🎨 **Edit Mode Features (Important)**

### 8. Component Drawer/Picker 📚
**Priority:** High | **Time:** 6-8 hours

#### **UI to Build:**

```vue
<!-- layers/dynamicPage/app/components/dynamicPage/ComponentDrawer.vue -->

<template>
  <aside class="component-drawer">
    <!-- Search -->
    <input v-model="search" placeholder="Search components..." />
    
    <!-- Categories -->
    <div v-for="category in categories" :key="category">
      <h3>{{ category }}</h3>
      
      <!-- Components -->
      <div 
        v-for="component in getComponentsByCategory(category)"
        :key="component.id"
        class="component-item"
        draggable="true"
        @dragstart="onDragStart(component)"
      >
        <span class="icon">{{ component.icon }}</span>
        <span class="name">{{ component.name }}</span>
      </div>
    </div>
  </aside>
</template>
```

#### **Tasks:**

- [ ] Create component drawer UI
- [ ] List all components from registry
- [ ] Group by category
- [ ] Search/filter functionality
- [ ] Show icon, name, description
- [ ] Make draggable
- [ ] Show version info
- [ ] Hide deprecated components

**Test File:** Create test page with drawer open

---

### 9. Drag & Drop System 🎯
**Priority:** High | **Time:** 8-10 hours

#### **Implementation:**

```typescript
// composables/useDragDrop.ts

export function useDragDrop() {
  const draggedComponent = ref<ComponentSchema | null>(null)
  const draggedNode = ref<ComponentNode | null>(null)
  const dropTarget = ref<{ nodeId: string; slotName: string } | null>(null)
  
  function onDragStart(component: ComponentSchema) {
    draggedComponent.value = component
  }
  
  function onDragOver(event: DragEvent, nodeId: string, slotName: string) {
    event.preventDefault()
    dropTarget.value = { nodeId, slotName }
  }
  
  function onDrop(event: DragEvent) {
    if (!draggedComponent.value || !dropTarget.value) return
    
    // Create new node
    const newNode = createNodeFromSchema(draggedComponent.value)
    
    // Insert into tree at drop target
    insertNodeIntoTree(newNode, dropTarget.value)
    
    // Reset
    draggedComponent.value = null
    dropTarget.value = null
  }
  
  return { onDragStart, onDragOver, onDrop, dropTarget }
}
```

#### **Tasks:**

- [ ] Implement drag from drawer
- [ ] Implement drag existing component to reorder
- [ ] Show drop zones in edit mode
- [ ] Visual feedback for valid/invalid drops
- [ ] Prevent invalid drops (requiredParent check)
- [ ] Handle drop between siblings
- [ ] Handle drop into empty slot
- [ ] Add "Drop here" placeholder

**Test Scenarios:**
1. Drag new component from drawer to slot
2. Reorder components within same slot
3. Move component to different slot
4. Try invalid drop (should prevent)
5. Drag to deeply nested slot

---

### 10. Component Edit UI ✏️
**Priority:** High | **Time:** 8-10 hours

#### **Features to Build:**

**Component Inspector Panel:**

```vue
<!-- layers/dynamicPage/app/components/dynamicPage/ComponentInspector.vue -->

<template>
  <aside class="inspector">
    <div v-if="selectedNode">
      <!-- Header -->
      <div class="inspector-header">
        <h3>{{ schema.name }}</h3>
        <span class="version">v{{ schema.version }}</span>
      </div>
      
      <!-- Props Editor -->
      <section class="props-section">
        <h4>Properties</h4>
        <div v-for="prop in schema.propsSchema.properties" :key="prop">
          <PropEditor 
            :schema="prop"
            v-model="selectedNode.props[prop.name]"
          />
        </div>
      </section>
      
      <!-- Event Handlers -->
      <section class="events-section">
        <h4>Events</h4>
        <!-- TODO: Event handler editor -->
      </section>
      
      <!-- Custom Styles -->
      <section class="styles-section">
        <h4>Custom Styles</h4>
        <CodeEditor v-model="selectedNode.customStyle" />
      </section>
      
      <!-- Actions -->
      <section class="actions-section">
        <button @click="duplicateComponent">Duplicate</button>
        <button @click="deleteComponent">Delete</button>
      </section>
    </div>
  </aside>
</template>
```

#### **Tasks:**

- [ ] Create component inspector panel
- [ ] Build prop editors for different types:
  - [ ] Text input
  - [ ] Number input
  - [ ] Boolean checkbox
  - [ ] Select dropdown
  - [ ] Array editor
  - [ ] Object editor (JSON)
- [ ] Add style editor (CSS input or visual)
- [ ] Add event handler editor (basic)
- [ ] Add component actions (duplicate, delete, copy, paste)
- [ ] Show validation errors
- [ ] Add tooltips for prop descriptions

---

## 🏗️ **Real Components (Production Ready)**

### 11. Build Production Components 🔧
**Priority:** Medium | **Time:** 10-15 hours

#### **Components to Build:**

**Container Components:**
- [ ] `GridLayout` - Responsive grid system
- [ ] `FlexLayout` - Flex container
- [ ] `TabsContainer` - Tab navigation
- [ ] `AccordionContainer` - Collapsible sections
- [ ] `SplitPanel` - Resizable panels

**Data Components:**
- [ ] `WorkspaceList` - Real workspace data
- [ ] `WorkspaceDetail` - Workspace info
- [ ] `DataTableList` - List of tables
- [ ] `DataTableViewer` - Table display with sorting/filtering
- [ ] `FormComponent` - Dynamic form builder

**UI Components:**
- [ ] `Button` - Clickable button
- [ ] `Input` - Text input
- [ ] `Select` - Dropdown
- [ ] `Card` - Content card
- [ ] `Alert` - Notification/alert

#### **Each Component Needs:**
- [ ] Icon
- [ ] Props schema (JSON Schema format)
- [ ] Events schema
- [ ] Slots schema
- [ ] Edit component variant
- [ ] Real data integration (Electric SQL)
- [ ] Responsive design
- [ ] Accessibility (a11y)

---

## 📐 **Schema & Helpers**

### 12. Component Registry Helpers 🔧
**Priority:** Medium | **Time:** 4-5 hours

#### **Functions to Create:**

File: `shared/dynamicComponent/helpers.ts`

```typescript
// Component registry helpers
export function getComponentsByCategory(category: string): ComponentSchema[]
export function searchComponents(query: string): ComponentSchema[]
export function getComponentById(id: string): ComponentSchema | null

// Validation
export function validateComponentNode(node: ComponentNode): ValidationResult
export function validateComponentTree(root: ComponentNode): ValidationResult

// Node creation
export function createDefaultNode(componentId: string): ComponentNode
export function createNodeFromSchema(schema: ComponentSchema): ComponentNode

// Node manipulation
export function cloneComponentNode(node: ComponentNode): ComponentNode
export function findNodeById(tree: ComponentNode, id: string): ComponentNode | null
export function findParentNode(tree: ComponentNode, nodeId: string): ComponentNode | null
export function updateNodeInTree(tree: ComponentNode, nodeId: string, updates: Partial<ComponentNode>): ComponentNode
export function deleteNodeFromTree(tree: ComponentNode, nodeId: string): ComponentNode
export function insertNodeIntoSlot(tree: ComponentNode, parentId: string, slotName: string, newNode: ComponentNode, index?: number): ComponentNode

// Serialization
export function serializeComponentTree(root: ComponentNode): string
export function deserializeComponentTree(json: string): ComponentNode
```

#### **Tasks:**
- [ ] Implement all helper functions
- [ ] Add TypeScript types
- [ ] Add JSDoc comments
- [ ] Write unit tests
- [ ] Handle edge cases (circular refs, deep nesting)

---

### 13. Schema Finalization 📄
**Priority:** High | **Time:** 3-4 hours

- [ ] Move `componentList` from `dynamic-page.ts` to separate file
- [ ] Create `shared/dynamicComponent/registry/` folder structure:
  ```
  registry/
  ├── index.ts           # Main exports
  ├── containers/        # Container components
  ├── data/              # Data components
  ├── ui/                # UI components
  └── layouts/           # Layout components
  ```
- [ ] Each component in own file with schema export
- [ ] Create JSON export function for seeding
- [ ] Add DB seed endpoint: `POST /api/dev/seed/components`
- [ ] Test importing/exporting component definitions

---

### 14. Migration Testing 🔄
**Priority:** High | **Time:** 3-4 hours

#### **Test Scenarios:**

1. **Create Test Component v1:**
```typescript
{
  id: "testComponent",
  version: 1,
  versionName: "1.0.0",
  props: {
    oldProp: "value"
  }
}
```

2. **Create Migration v1 → v2:**
```typescript
{
  fromVersion: 1,
  toVersion: 2,
  description: "Renamed oldProp to newProp",
  breaking: true,
  migrate: (node) => ({
    ...node,
    props: {
      newProp: node.props.oldProp
    }
  })
}
```

3. **Test Cases:**
- [ ] Create page with v1 component
- [ ] Upgrade component to v2
- [ ] Load page (should auto-migrate)
- [ ] Verify props transformed correctly
- [ ] Test with nested components
- [ ] Test breaking vs non-breaking flags
- [ ] Test migration with missing data
- [ ] Test migration failure handling

**Test File:** `layers/dynamicPage/app/pages/test/dynamic/migration-test.vue` (already created!)

---

## ⚡ **Performance & Quality**

### 15. Performance Testing 📊
**Priority:** Medium | **Time:** 2-3 hours

- [ ] Create test page with 10+ nesting levels
- [ ] Create test page with 50+ components
- [ ] Test with large prop objects (1000+ items array)
- [ ] Measure render time (use Vue DevTools)
- [ ] Check for memory leaks (Chrome DevTools)
- [ ] Test edit mode performance with many components
- [ ] Profile hot paths (migration, validation)

**Performance Targets:**
- Initial render: < 100ms
- Component add/delete: < 50ms
- Mode switch: < 200ms
- Undo/redo: < 50ms

---

### 16. Additional Quality Tests 🔍
**Priority:** Low | **Time:** 2-3 hours

- [ ] Custom styling (inline styles, CSS classes)
- [ ] CSS variables support
- [ ] Dark mode compatibility
- [ ] Keyboard navigation in edit mode
- [ ] Mobile responsive (test on tablet)
- [ ] Hot reload (HMR) works correctly
- [ ] Multiple component versions in same tree
- [ ] Browser compatibility (Chrome, Firefox, Safari)

---

## 📝 **Documentation Tasks**

- [ ] Document all helper functions
- [ ] Create component authoring guide
- [ ] Document migration process
- [ ] Create troubleshooting guide
- [ ] Add inline code comments
- [ ] Create video demo (optional)

---

## ✅ **Definition of Done**

POC is complete when:

1. ✅ All critical path items tested and working
2. ✅ At least 5 production components built
3. ✅ Edit mode is usable (drag-drop, props editor)
4. ✅ Schema is stable and documented
5. ✅ No major bugs or blockers
6. ✅ Performance is acceptable
7. ✅ Code is clean and documented
8. ✅ Team has reviewed and approved

**Ready for Phase 3.4.3 (Database Migration)** 🎉

---

## 📊 **Progress Tracking**

**Overall Progress:** 0/16 sections complete

**By Priority:**
- **High Priority:** 0/10 complete
- **Medium Priority:** 0/5 complete  
- **Low Priority:** 0/1 complete

**Estimated Time:** 80-100 hours (2-2.5 weeks for 1 person)

---

## 🚀 **Quick Start**

1. Pick a section from Critical Path
2. Create test file if needed
3. Implement feature
4. Test thoroughly
5. Check off items
6. Move to next section

**Recommended Order:**
1. Event Listeners (easy win)
2. Error Boundaries (important safety)
3. Props & Validation (core feature)
4. Router Implementation (complex, important)
5. Component Drawer (visual progress)
6. Drag & Drop (hardest, do last)

