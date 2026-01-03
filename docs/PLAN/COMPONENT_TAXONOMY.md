# Component Taxonomy: Provider-First Architecture

## Overview

Components are organized in **three layers**:
1. **Containers** - Layout/presentation wrappers (spacing, positioning)
2. **Providers** - Data/state management (business logic, API calls)
3. **Views** - Presentation components (rendering, UI)

This architecture uses Vue's provide/inject pattern for perfect separation of concerns.

### Key Pattern

```vue
<Container type="card">
  <UserListProvider :filters="{ role: 'admin' }">
    <TableView />
  </UserListProvider>
</Container>
```

**Flow**: Container → Provider → View

```
┌─────────────────────────────────────────────┐
│  Container (Layout)                         │
│  ┌───────────────────────────────────────┐  │
│  │  Provider (Data & State)              │  │
│  │  • Fetches data from API              │  │
│  │  • Manages state (loading, error)     │  │
│  │  • Handles CRUD operations            │  │
│  │  • Provides data via inject           │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  View (Presentation)            │  │  │
│  │  │  • Injects data from provider   │  │  │
│  │  │  • Renders UI                   │  │  │
│  │  │  • Emits user interactions      │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Why This Works

1. **Container** handles layout (padding, spacing, positioning)
2. **Provider** handles data (fetching, caching, CRUD)
3. **View** handles presentation (rendering, styling, interactions)

Each layer has **one responsibility** and can be swapped independently.

---

## Quick Comparison

### ❌ Old Approach (Monolithic)
```vue
<UserListTable 
  :filters="{ role: 'admin' }"
  :sort="{ field: 'name' }"
/>
```
- Data + presentation mixed together
- Need separate components for each variant: `UserListTable`, `UserListCard`, `UserListGrid`
- Hard to reuse, test, and maintain

### ✅ New Approach (Provider-First)
```vue
<UserListProvider 
  :filters="{ role: 'admin' }"
  :sort="{ field: 'name' }"
>
  <TableView />  <!-- Swap to CardView, GridView, etc. -->
</UserListProvider>
```
- Data and presentation separated
- One provider, many views
- Easy to reuse, test, and maintain
- Can show multiple views of same data simultaneously

---

## 1. Containers (Layout Components)

Containers are **presentation-only** components that handle layout, spacing, and visual structure.

### 1.1 Layout Containers

| ID | Description | Use Case |
|----|-------------|----------|
| `container-column` | Vertical stack | Forms, lists |
| `container-row` | Horizontal stack | Toolbars, button groups |
| `container-grid` | CSS Grid layout | Dashboards, galleries |
| `container-flex` | Flexbox layout | Responsive layouts |
| `container-split` | Resizable split panes | Editor views |
| `container-tabs` | Tabbed content | Settings pages |
| `container-accordion` | Collapsible sections | FAQs, nested content |
| `container-masonry` | Waterfall/masonry | Image galleries |

### 1.2 Surface Containers

| ID | Description | Use Case |
|----|-------------|----------|
| `container-card` | Card with shadow/border | Content blocks |
| `container-panel` | Bordered panel | Grouped content |
| `container-section` | Semantic section | Page sections |
| `container-paper` | Elevated surface | Dialogs, modals |

### 1.3 Overlay Containers

| ID | Description | Use Case |
|----|-------------|----------|
| `container-modal` | Full-screen overlay | Important actions |
| `container-drawer` | Side drawer | Navigation, filters |
| `container-popover` | Floating popover | Context menus |
| `container-dropdown` | Dropdown menu | Select options |
| `container-tooltip` | Hover tooltip | Help text |

### 1.4 Navigation Containers

| ID | Description | Use Case |
|----|-------------|----------|
| `container-sidebar` | Fixed sidebar | App navigation |
| `container-topbar` | Top navigation bar | Global nav |
| `container-bottombar` | Bottom navigation | Mobile apps |
| `container-breadcrumb` | Breadcrumb trail | Hierarchical nav |

---

## 2. Providers (Data & State Management)

Providers are **data-aware** components that handle business logic, data fetching, and state management.

### 2.1 Entity Providers

Each entity (User, Workspace, Company, Table, etc.) has standard CRUD providers:

#### Pattern: `{Entity}{Operation}Provider`

```
User
├── UserListProvider          → Provides: users[], loading, error, CRUD methods
├── UserDetailProvider        → Provides: user, loading, error, update, delete
├── UserCreateProvider        → Provides: create method, validation, loading
├── UserInviteProvider        → Provides: invite method, validation, loading
├── UserProfileProvider       → Provides: profile data, update methods
└── UserSettingsProvider      → Provides: settings, update methods

Workspace
├── WorkspaceListProvider
├── WorkspaceDetailProvider
├── WorkspaceCreateProvider
├── WorkspaceMembersProvider
├── WorkspaceSettingsProvider
└── WorkspaceInviteProvider

Company
├── CompanyListProvider
├── CompanyDetailProvider
├── CompanyMembersProvider
└── CompanySettingsProvider

Table (Data Tables)
├── TableListProvider
├── TableDetailProvider
├── TableViewerProvider       → Provides: rows[], columns, CRUD for rows
├── TableRowCreateProvider
└── TableRowEditProvider
```

### 2.2 Views (Presentation Components)

Views are **presentation-only** components that inject data from providers and render UI.

#### Pattern: `{Type}View`

```
List Views (for ListProviders)
├── TableView                 → Table/grid layout
├── CardView                  → Card grid layout
├── ListView                  → Vertical list layout
├── GridView                  → CSS grid layout
├── KanbanView                → Kanban board
├── CalendarView              → Calendar layout
├── TimelineView              → Timeline layout
├── GalleryView               → Image gallery
└── MapView                   → Map with markers

Detail Views (for DetailProviders)
├── PageView                  → Full page layout
├── CardView                  → Card layout
├── InlineView                → Inline/compact layout
├── PreviewView               → Preview/modal layout
└── SidebarView               → Sidebar panel layout

Form Views (for Create/Edit Providers)
├── FormView                  → Standard form
├── WizardView                → Multi-step wizard
├── InlineFormView            → Inline editing
├── ModalFormView             → Modal dialog form
└── QuickFormView             → Minimal quick form

Chart Views (for any Provider with numeric data)
├── BarChartView
├── LineChartView
├── PieChartView
├── AreaChartView
└── ScatterChartView

Metric Views (for aggregate data)
├── MetricView                → Single metric display
├── MetricCardView            → Metric in card
└── MetricCompareView         → Compare metrics
```

### 2.3 Provider + View Combinations

Here are the standard combinations for each entity:

#### User Entity

| Provider | Compatible Views | Description |
|----------|-----------------|-------------|
| `UserListProvider` | TableView, CardView, GridView, ListView | Display users |
| `UserDetailProvider` | PageView, CardView, InlineView, PreviewView | Show user details |
| `UserCreateProvider` | FormView, WizardView, QuickFormView | Create new user |
| `UserInviteProvider` | FormView, ModalFormView | Invite user |
| `UserProfileProvider` | PageView, CardView | User profile |
| `UserSettingsProvider` | FormView, PageView | User settings |

#### Workspace Entity

| Provider | Compatible Views | Description |
|----------|-----------------|-------------|
| `WorkspaceListProvider` | TableView, CardView, GridView | Display workspaces |
| `WorkspaceDetailProvider` | PageView, CardView, PreviewView | Workspace details |
| `WorkspaceCreateProvider` | FormView, WizardView | Create workspace |
| `WorkspaceMembersProvider` | TableView, GridView, CardView | Workspace members |
| `WorkspaceSettingsProvider` | FormView, PageView | Workspace settings |
| `WorkspaceStatsProvider` | MetricView, ChartView, DashboardView | Statistics |

#### Table Entity (Data Tables)

| Provider | Compatible Views | Description |
|----------|-----------------|-------------|
| `TableListProvider` | TableView, CardView, GridView | Display tables |
| `TableViewerProvider` | TableView, KanbanView, CalendarView, GalleryView | View table data |
| `TableRowCreateProvider` | FormView, InlineFormView, QuickFormView | Add row |
| `TableRowEditProvider` | FormView, InlineFormView, ModalFormView | Edit row |

### 2.4 Action Providers

Reusable providers for common actions:

| Provider | Compatible Views | Description |
|----------|-----------------|-------------|
| `SearchProvider` | InputView, BarView, ModalView | Search functionality |
| `FilterProvider` | FormView, InlineView, DrawerView | Filter data |
| `SortProvider` | ButtonView, MenuView, DropdownView | Sort data |
| `PaginationProvider` | NumberedView, InfiniteView, LoadMoreView | Paginate results |
| `BulkActionsProvider` | ToolbarView, MenuView | Bulk operations |
| `ExportProvider` | ButtonView, MenuView | Export data |
| `ImportProvider` | FormView, WizardView | Import data |
| `NotificationProvider` | ListView, BadgeView, BellView | Notifications |
| `ActivityLogProvider` | ListView, TimelineView | Activity history |

### 2.5 Form Field Components

These are simple components (not provider/view pattern) for form inputs:

| Component | Description |
|-----------|-------------|
| `TextInput` | Text input field |
| `TextArea` | Multi-line text |
| `NumberInput` | Number input with stepper |
| `SelectInput` | Dropdown select |
| `RadioGroup` | Radio button group |
| `CheckboxGroup` | Checkbox group |
| `DatePicker` | Date picker |
| `TimePicker` | Time picker |
| `DateRangePicker` | Date range picker |
| `FileUpload` | File upload with drag & drop |
| `RichTextEditor` | Rich text editor |
| `ColorPicker` | Color picker |
| `IconPicker` | Icon picker |
| `RelationPicker` | Relation/foreign key picker |

### 2.6 Display Components

These are simple components (not provider/view pattern) for displaying data:

| Component | Description |
|-----------|-------------|
| `DisplayText` | Formatted text display |
| `DisplayNumber` | Formatted number (currency, percentage) |
| `DisplayDate` | Formatted date (relative, absolute) |
| `Badge` | Status badge |
| `Tag` | Tag/label |
| `Avatar` | User avatar |
| `Icon` | Icon display |
| `Image` | Image with loading/error states |
| `Video` | Video player |
| `Link` | Styled link |
| `Code` | Code block with syntax highlighting |
| `Json` | JSON viewer |
| `Markdown` | Markdown renderer |

---

## 3. Component Composition

### 3.1 Basic Pattern: Provider → View

The correct pattern is **Provider-first**, where:
- **Provider** handles data, state, filtering, sorting, pagination
- **View** receives data via provide/inject and handles display only

```vue
<!-- Provider wraps View -->
<UserListProvider :filters="{ role: 'admin' }" :sort="{ field: 'name' }">
  <CardView />
</UserListProvider>

<!-- Same data, different view -->
<UserListProvider :filters="{ role: 'admin' }">
  <TableView />
</UserListProvider>

<!-- Multiple views of same data -->
<UserListProvider :filters="{ status: 'active' }">
  <GridView cols="3" />
  <ChartView type="bar" />
</UserListProvider>

<!-- Nested: Container wraps Provider -->
<Container type="card">
  <UserListProvider>
    <TableView />
  </UserListProvider>
</Container>
```

### 3.2 Why Provider-First?

```typescript
// ❌ BAD: View has variant prop, mixes data and presentation
<Container type="card">
  <UserList variant="table" :filters="..." :sort="..." />
</Container>

// ✅ GOOD: Clear separation, provider handles data, view handles display
<Container type="card">
  <UserListProvider :filters="..." :sort="...">
    <TableView />
  </UserListProvider>
</Container>
```

**Benefits:**
1. **Separation of Concerns** - Data logic vs presentation logic
2. **View Swapping** - Change `<TableView>` to `<CardView>` without touching data
3. **Multiple Views** - Show same data in multiple formats simultaneously
4. **Reusability** - Same provider works with any view
5. **Testability** - Test provider and views independently
6. **Vue Native** - Leverages provide/inject pattern

### 3.3 Nested Composition

```vue
<!-- Complex layouts: Container → Provider → View -->
<Container type="split">
  <template #left>
    <Container type="sidebar">
      <WorkspaceSwitcherProvider>
        <DropdownView />
      </WorkspaceSwitcherProvider>
      <Navigation />
    </Container>
  </template>
  
  <template #right>
    <Container type="column">
      <Container type="topbar">
        <SearchProvider>
          <BarView />
        </SearchProvider>
        <UserAvatarProvider :userId="currentUser.id">
          <ImageView />
        </UserAvatarProvider>
      </Container>
      
      <Container type="grid" cols="3">
        <DashboardMetricProvider metric="users">
          <MetricView />
        </DashboardMetricProvider>
        <DashboardMetricProvider metric="revenue">
          <ChartView type="line" />
        </DashboardMetricProvider>
        <ActivityLogProvider :limit="10">
          <TableView />
        </ActivityLogProvider>
      </Container>
    </Container>
  </template>
</Container>
```

### 3.4 Responsive Variants

```vue
<!-- Same data, different views for different screens -->
<Container type="grid" :cols="{ xs: 1, md: 2, lg: 3 }">
  <UserListProvider>
    <CardView />
  </UserListProvider>
</Container>

<Container type="drawer" :breakpoint="'md'">
  <UserDetailProvider :userId="selectedUserId">
    <PageView />
  </UserDetailProvider>
</Container>

<!-- Conditional view based on screen size -->
<UserListProvider>
  <TableView v-if="isDesktop" />
  <CardView v-else />
</UserListProvider>
```

---

## 4. Provider Pattern Deep Dive

### 4.1 Provider Responsibilities

Providers are **data and state management** components that:
- Fetch data from API/database
- Handle loading, error states
- Manage filters, sorting, pagination
- Handle CRUD operations
- Provide data via Vue's provide/inject
- Emit events for parent components

### 4.2 View Responsibilities

Views are **presentation-only** components that:
- Inject data from provider
- Render UI based on data
- Emit user interactions (click, select, etc.)
- Handle local UI state (hover, focus, etc.)
- No data fetching or business logic

### 4.3 Provider Implementation Pattern

```typescript
// UserListProvider.vue
<script setup lang="ts">
import { provide, ref, computed, watch } from 'vue'

// Props: Configuration
const props = defineProps<{
  filters?: Record<string, any>
  sort?: { field: string, order: 'asc' | 'desc' }
  limit?: number
  autoRefresh?: number
}>()

// State
const users = ref<User[]>([])
const loading = ref(false)
const error = ref<Error | null>(null)
const total = ref(0)
const page = ref(1)

// Computed
const hasMore = computed(() => users.value.length < total.value)
const isEmpty = computed(() => !loading.value && users.value.length === 0)

// Methods
async function fetchUsers() {
  loading.value = true
  error.value = null
  try {
    const result = await api.users.list({
      filters: props.filters,
      sort: props.sort,
      limit: props.limit,
      offset: (page.value - 1) * (props.limit || 20)
    })
    users.value = result.data
    total.value = result.total
  } catch (e) {
    error.value = e as Error
  } finally {
    loading.value = false
  }
}

async function createUser(data: CreateUserInput) {
  const user = await api.users.create(data)
  users.value.unshift(user)
  total.value++
  return user
}

async function updateUser(id: string, data: UpdateUserInput) {
  const user = await api.users.update(id, data)
  const index = users.value.findIndex(u => u.id === id)
  if (index !== -1) users.value[index] = user
  return user
}

async function deleteUser(id: string) {
  await api.users.delete(id)
  users.value = users.value.filter(u => u.id !== id)
  total.value--
}

function refresh() {
  fetchUsers()
}

function nextPage() {
  page.value++
  fetchUsers()
}

function prevPage() {
  if (page.value > 1) {
    page.value--
    fetchUsers()
  }
}

// Provide to child views
provide('userList', {
  // Data
  users: computed(() => users.value),
  loading: computed(() => loading.value),
  error: computed(() => error.value),
  total: computed(() => total.value),
  page: computed(() => page.value),
  
  // Computed
  hasMore,
  isEmpty,
  
  // Methods
  refresh,
  nextPage,
  prevPage,
  createUser,
  updateUser,
  deleteUser
})

// Lifecycle
onMounted(() => {
  fetchUsers()
})

// Watch filters/sort changes
watch(() => [props.filters, props.sort], () => {
  page.value = 1
  fetchUsers()
}, { deep: true })

// Auto refresh
if (props.autoRefresh) {
  useIntervalFn(fetchUsers, props.autoRefresh * 1000)
}
</script>

<template>
  <slot />
</template>
```

### 4.4 View Implementation Pattern

```typescript
// TableView.vue
<script setup lang="ts">
import { inject } from 'vue'

// Props: Display configuration
const props = defineProps<{
  fields?: string[]
  showActions?: boolean
  selectable?: boolean
  density?: 'compact' | 'comfortable' | 'spacious'
}>()

// Inject from provider
const userList = inject('userList')
if (!userList) throw new Error('TableView must be used inside UserListProvider')

const { users, loading, error, isEmpty, refresh, updateUser, deleteUser } = userList

// Emit events
const emit = defineEmits<{
  rowClick: [user: User]
  select: [users: User[]]
}>()

// Local UI state
const selectedRows = ref<Set<string>>(new Set())

function handleRowClick(user: User) {
  emit('rowClick', user)
}

function handleSelect(userId: string) {
  if (selectedRows.value.has(userId)) {
    selectedRows.value.delete(userId)
  } else {
    selectedRows.value.add(userId)
  }
  
  const selected = users.value.filter(u => selectedRows.value.has(u.id))
  emit('select', selected)
}
</script>

<template>
  <div class="table-view">
    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <Spinner />
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="error">
      {{ error.message }}
      <button @click="refresh">Retry</button>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="isEmpty" class="empty">
      No users found
    </div>
    
    <!-- Table -->
    <table v-else :class="[`density-${density}`]">
      <thead>
        <tr>
          <th v-if="selectable">
            <input type="checkbox" />
          </th>
          <th v-for="field in fields" :key="field">
            {{ field }}
          </th>
          <th v-if="showActions">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr 
          v-for="user in users" 
          :key="user.id"
          @click="handleRowClick(user)"
        >
          <td v-if="selectable">
            <input 
              type="checkbox" 
              :checked="selectedRows.has(user.id)"
              @click.stop="handleSelect(user.id)"
            />
          </td>
          <td v-for="field in fields" :key="field">
            {{ user[field] }}
          </td>
          <td v-if="showActions">
            <button @click.stop="updateUser(user.id, ...)">Edit</button>
            <button @click.stop="deleteUser(user.id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

### 4.5 Multiple Views Example

```vue
<!-- Show same data in different formats simultaneously -->
<UserListProvider :filters="{ role: 'admin' }">
  <!-- Summary at top -->
  <Container type="card">
    <MetricView />
  </Container>
  
  <!-- Main table -->
  <Container type="card">
    <TableView :fields="['name', 'email', 'status']" />
  </Container>
  
  <!-- Chart visualization -->
  <Container type="card">
    <ChartView type="bar" groupBy="department" />
  </Container>
</UserListProvider>
```

### 4.6 Provider Composition

Providers can be nested for related data:

```vue
<!-- Workspace provides context for nested providers -->
<WorkspaceProvider :workspaceId="workspaceId">
  <Container type="split">
    <template #left>
      <!-- Tables in this workspace -->
      <TableListProvider>
        <ListView />
      </TableListProvider>
    </template>
    
    <template #right>
      <!-- Members in this workspace -->
      <WorkspaceMemberProvider>
        <GridView />
      </WorkspaceMemberProvider>
    </template>
  </Container>
</WorkspaceProvider>
```

### 4.7 Provider Events

Providers can emit events for parent components to handle:

```vue
<UserListProvider 
  @create="handleUserCreated"
  @update="handleUserUpdated"
  @delete="handleUserDeleted"
  @error="handleError"
>
  <TableView />
</UserListProvider>
```

## 5. Component Schema Structure

### 5.1 Container Schema

Containers are layout/presentation wrappers with no business logic.

```typescript
type ContainerSchema = {
  id: string                    // e.g., 'container-card'
  name: string                  // e.g., 'Card'
  type: 'container'
  category: 'layout' | 'surface' | 'overlay' | 'navigation'
  
  props: {
    // Common container props
    padding?: 'none' | 'sm' | 'md' | 'lg'
    gap?: 'none' | 'sm' | 'md' | 'lg'
    align?: 'start' | 'center' | 'end' | 'stretch'
    justify?: 'start' | 'center' | 'end' | 'between' | 'around'
    
    // Container-specific props
    [key: string]: any
  }
  
  slots: {
    default: true
    [slotName: string]: boolean
  }
}
```

### 5.2 Provider Schema

Providers handle data fetching, state management, and business logic.

```typescript
type ProviderSchema = {
  id: string                    // e.g., 'user-list-provider'
  name: string                  // e.g., 'User List Provider'
  type: 'provider'
  category: 'entity' | 'action' | 'utility'
  
  entity?: string               // e.g., 'user', 'workspace'
  operation?: string            // e.g., 'list', 'detail', 'create'
  
  props: {
    // Data configuration
    filters?: Record<string, any>
    sort?: { field: string, order: 'asc' | 'desc' }
    limit?: number
    offset?: number
    
    // Behavior
    autoRefresh?: number        // Auto-refresh interval in seconds
    lazy?: boolean              // Don't fetch on mount
    
    // Entity-specific props
    [key: string]: any
  }
  
  provides: {
    // Data
    items: ComputedRef<any[]>
    loading: ComputedRef<boolean>
    error: ComputedRef<Error | null>
    total: ComputedRef<number>
    
    // Computed
    isEmpty: ComputedRef<boolean>
    hasMore: ComputedRef<boolean>
    
    // Methods
    refresh: () => Promise<void>
    create?: (data: any) => Promise<any>
    update?: (id: string, data: any) => Promise<any>
    delete?: (id: string) => Promise<void>
    
    // Provider-specific
    [key: string]: any
  }
  
  events: {
    load: (items: any[]) => void
    create: (item: any) => void
    update: (item: any) => void
    delete: (id: string) => void
    error: (error: Error) => void
  }
}
```

### 5.3 View Schema

Views are presentation components that inject data from providers.

```typescript
type ViewSchema = {
  id: string                    // e.g., 'table-view'
  name: string                  // e.g., 'Table View'
  type: 'view'
  category: 'list' | 'detail' | 'form' | 'chart' | 'custom'
  
  // What provider does this view expect?
  requiredProvider: string      // e.g., 'list-provider', 'detail-provider'
  
  // What does it inject from provider?
  injects: string[]             // e.g., ['items', 'loading', 'error', 'refresh']
  
  props: {
    // Display configuration
    fields?: string[]
    showActions?: boolean
    selectable?: boolean
    density?: 'compact' | 'comfortable' | 'spacious'
    
    // View-specific props
    [key: string]: any
  }
  
  events: {
    click: (item: any) => void
    select: (items: any[]) => void
    action: (action: string, item: any) => void
    [eventName: string]: Function | undefined
  }
  
  slots: {
    default?: boolean
    header?: boolean
    footer?: boolean
    empty?: boolean
    loading?: boolean
    error?: boolean
    [slotName: string]: boolean | undefined
  }
}
```

---

## 6. Benefits of Provider-First Architecture

### 6.1 Perfect Separation of Concerns
- **Containers** handle layout/spacing
- **Providers** handle data/state/business logic
- **Views** handle presentation/rendering
- Each layer has single responsibility

### 6.2 Maximum Reusability
- Same provider works with any view
- Same view works with any provider (of same type)
- Same container works with any provider/view
- Zero code duplication

### 6.3 View Swapping
```vue
<!-- Change presentation without touching data logic -->
<UserListProvider :filters="{ role: 'admin' }">
  <!-- Switch between these without changing provider -->
  <TableView />
  <CardView />
  <GridView />
  <KanbanView />
</UserListProvider>
```

### 6.4 Multiple Views Simultaneously
```vue
<!-- Show same data in different formats -->
<UserListProvider>
  <MetricView />      <!-- Count -->
  <ChartView />       <!-- Visualization -->
  <TableView />       <!-- Detailed list -->
</UserListProvider>
```

### 6.5 Vue Native Pattern
- Leverages Vue's provide/inject
- Follows Vue composition patterns
- Easy for Vue developers to understand
- Works great with Composition API

### 6.6 AI-Friendly
Natural language maps perfectly:
- "Show users in a table" → `<UserListProvider><TableView /></UserListProvider>`
- "Display workspace members as cards" → `<WorkspaceMembersProvider><CardView /></WorkspaceMembersProvider>`
- "Show sales chart with auto-refresh" → `<SalesProvider :autoRefresh="30"><ChartView /></SalesProvider>`

### 6.7 Scalability
- Adding new entity: Create 5-7 providers (list, detail, create, edit, etc.)
- Adding new view: Works with all compatible providers
- No combinatorial explosion (N providers + M views, not N×M components)

### 6.8 Testability
- Test providers independently (data logic)
- Test views independently (presentation)
- Mock providers easily for view testing
- Clear boundaries make testing simple

### 6.9 Consistency
- All entities follow same provider pattern
- All views follow same injection pattern
- Predictable API across entire system
- Easy to learn and use

### 6.10 Performance
- Providers can implement smart caching
- Multiple views share same data (no duplicate fetches)
- Easy to add pagination, infinite scroll, etc.
- Auto-refresh at provider level affects all views

---

## 6. Implementation Strategy

### 6.1 Phase 1: Core Containers
- [ ] Build 10-15 essential containers
- [ ] Test with existing components
- [ ] Document patterns

### 6.2 Phase 2: Entity Functions
- [ ] Refactor User, Workspace, Company components
- [ ] Follow entity function pattern
- [ ] Create variants (table, card, grid)

### 6.3 Phase 3: Action Functions
- [ ] Build common actions (search, filter, sort)
- [ ] Make them reusable across entities
- [ ] Test composition

### 6.4 Phase 4: Form & Display Functions
- [ ] Build form input components
- [ ] Build display components
- [ ] Integrate with entity functions

### 6.5 Phase 5: Advanced Composition
- [ ] Test complex nested layouts
- [ ] Build example apps
- [ ] Document best practices

---

## 7. Migration Path

### 7.1 Existing Components

```vue
<!-- Before: Monolithic component -->
<UserListTable 
  :filters="{ role: 'admin' }"
  :sort="{ field: 'name' }"
  @rowClick="handleClick"
/>

<!-- After: Provider + View pattern -->
<Container type="card">
  <UserListProvider 
    :filters="{ role: 'admin' }"
    :sort="{ field: 'name' }"
  >
    <TableView @rowClick="handleClick" />
  </UserListProvider>
</Container>
```

### 7.2 Step-by-Step Migration

#### Step 1: Extract Data Logic to Provider
```vue
// Create UserListProvider.vue
<script setup>
// Move all data fetching, state, CRUD logic here
const users = ref([])
const loading = ref(false)
// ... all data logic

provide('userList', {
  users: computed(() => users.value),
  loading: computed(() => loading.value),
  // ... all methods
})
</script>

<template>
  <slot />
</template>
```

#### Step 2: Create View Component
```vue
// Create TableView.vue
<script setup>
// Only presentation logic here
const userList = inject('userList')
const { users, loading } = userList

// Only UI state (not data state)
const selectedRows = ref([])
</script>

<template>
  <!-- Only rendering logic -->
  <table>
    <tr v-for="user in users" :key="user.id">
      <!-- ... -->
    </tr>
  </table>
</template>
```

#### Step 3: Keep Old Component as Wrapper
```vue
// UserListTable.vue (backward compatibility)
<script setup>
const props = defineProps<{
  filters?: any
  sort?: any
}>()

const emit = defineEmits(['rowClick'])
</script>

<template>
  <UserListProvider v-bind="props">
    <TableView @rowClick="emit('rowClick', $event)" />
  </UserListProvider>
</template>
```

### 7.3 Backward Compatibility Strategy

1. **Phase 1**: Create new Provider + View components
2. **Phase 2**: Refactor old components to use Provider + View internally
3. **Phase 3**: Update codebase to use new pattern directly
4. **Phase 4**: Deprecate old components
5. **Phase 5**: Remove old components (after deprecation period)

### 7.4 Coexistence

Both patterns can coexist during migration:

```vue
<!-- Old pattern (still works) -->
<UserListTable />

<!-- New pattern (preferred) -->
<UserListProvider>
  <TableView />
</UserListProvider>
```

---

## 8. Real-World Examples

### 8.1 User Management Page

```vue
<Container type="column" gap="lg">
  <!-- Header -->
  <Container type="row" justify="between" align="center">
    <h1>Users</h1>
    <Container type="row" gap="sm">
      <SearchProvider>
        <InputView placeholder="Search users..." />
      </SearchProvider>
      <UserCreateProvider @create="handleUserCreated">
        <ButtonView label="Add User" />
      </UserCreateProvider>
    </Container>
  </Container>
  
  <!-- Filters -->
  <Container type="card">
    <FilterProvider :fields="['role', 'status', 'department']">
      <InlineView />
    </FilterProvider>
  </Container>
  
  <!-- User List -->
  <Container type="card">
    <UserListProvider 
      :filters="activeFilters"
      :sort="{ field: 'name', order: 'asc' }"
    >
      <TableView 
        :fields="['name', 'email', 'role', 'status']"
        showActions
        selectable
        @rowClick="handleUserClick"
      />
    </UserListProvider>
  </Container>
</Container>
```

### 8.2 Dashboard with Multiple Views

```vue
<Container type="grid" cols="3" gap="lg">
  <!-- Metrics -->
  <Container type="card">
    <UserListProvider :filters="{ status: 'active' }">
      <MetricView label="Active Users" />
    </UserListProvider>
  </Container>
  
  <Container type="card">
    <WorkspaceListProvider>
      <MetricView label="Total Workspaces" />
    </WorkspaceListProvider>
  </Container>
  
  <Container type="card">
    <RevenueProvider :period="'month'">
      <MetricView label="Monthly Revenue" format="currency" />
    </RevenueProvider>
  </Container>
  
  <!-- Chart spanning 2 columns -->
  <Container type="card" colspan="2">
    <UserListProvider :groupBy="'created_at'">
      <LineChartView 
        title="User Growth"
        xAxis="date"
        yAxis="count"
      />
    </UserListProvider>
  </Container>
  
  <!-- Activity log -->
  <Container type="card">
    <ActivityLogProvider :limit="10">
      <TimelineView />
    </ActivityLogProvider>
  </Container>
</Container>
```

### 8.3 Mobile App with Drawer

```vue
<Container type="column">
  <!-- Top Bar -->
  <Container type="topbar">
    <button @click="toggleDrawer">☰</button>
    <h1>Workspaces</h1>
    <UserAvatarProvider :userId="currentUser.id">
      <ImageView size="sm" />
    </UserAvatarProvider>
  </Container>
  
  <!-- Drawer Navigation -->
  <Container type="drawer" position="left" :open="drawerOpen">
    <WorkspaceListProvider>
      <ListView 
        @itemClick="handleWorkspaceSwitch"
      />
    </WorkspaceListProvider>
  </Container>
  
  <!-- Main Content -->
  <Container type="column" padding="md">
    <WorkspaceListProvider>
      <!-- Mobile: Card view -->
      <CardView v-if="isMobile" />
      <!-- Desktop: Table view -->
      <TableView v-else />
    </WorkspaceListProvider>
  </Container>
  
  <!-- Bottom Navigation -->
  <Container type="bottombar">
    <nav>
      <a href="/home">Home</a>
      <a href="/workspaces">Workspaces</a>
      <a href="/settings">Settings</a>
    </nav>
  </Container>
</Container>
```

### 8.4 Table Viewer with Multiple Views

```vue
<!-- User can switch between different views of same data -->
<Container type="column" gap="md">
  <!-- View Switcher -->
  <Container type="row" gap="sm">
    <button @click="currentView = 'table'">Table</button>
    <button @click="currentView = 'card'">Cards</button>
    <button @click="currentView = 'kanban'">Kanban</button>
    <button @click="currentView = 'calendar'">Calendar</button>
  </Container>
  
  <!-- Single Provider, Multiple Views -->
  <Container type="card">
    <TableViewerProvider 
      :tableId="tableId"
      :filters="filters"
      :sort="sort"
    >
      <TableView v-if="currentView === 'table'" />
      <CardView v-else-if="currentView === 'card'" cols="3" />
      <KanbanView v-else-if="currentView === 'kanban'" groupBy="status" />
      <CalendarView v-else-if="currentView === 'calendar'" dateField="due_date" />
    </TableViewerProvider>
  </Container>
</Container>
```

### 8.5 Master-Detail Layout

```vue
<Container type="split">
  <!-- Left: User List -->
  <template #left>
    <Container type="card">
      <UserListProvider>
        <ListView 
          @itemClick="selectedUserId = $event.id"
          :selected="selectedUserId"
        />
      </UserListProvider>
    </Container>
  </template>
  
  <!-- Right: User Detail -->
  <template #right>
    <Container type="column" gap="md">
      <!-- User Info -->
      <Container type="card">
        <UserDetailProvider :userId="selectedUserId">
          <PageView />
        </UserDetailProvider>
      </Container>
      
      <!-- User Activity -->
      <Container type="card">
        <ActivityLogProvider 
          :userId="selectedUserId"
          :limit="20"
        >
          <TimelineView />
        </ActivityLogProvider>
      </Container>
    </Container>
  </template>
</Container>
```

### 8.6 Form with Related Data

```vue
<Container type="column" gap="lg">
  <h1>Create Project</h1>
  
  <!-- Project Form -->
  <Container type="card">
    <ProjectCreateProvider @create="handleProjectCreated">
      <FormView>
        <TextInput name="name" label="Project Name" required />
        <TextArea name="description" label="Description" />
        
        <!-- Workspace Selector -->
        <WorkspaceListProvider>
          <SelectView 
            name="workspaceId" 
            label="Workspace"
            required
          />
        </WorkspaceListProvider>
        
        <!-- Team Members -->
        <UserListProvider :filters="{ role: 'member' }">
          <MultiSelectView 
            name="members"
            label="Team Members"
          />
        </UserListProvider>
        
        <DatePicker name="dueDate" label="Due Date" />
        
        <button type="submit">Create Project</button>
      </FormView>
    </ProjectCreateProvider>
  </Container>
</Container>
```

### 8.7 Real-time Dashboard

```vue
<!-- Auto-refreshing dashboard -->
<Container type="grid" cols="2" gap="lg">
  <!-- Sales Today (refreshes every 30 seconds) -->
  <Container type="card">
    <SalesTodayProvider :autoRefresh="30">
      <MetricView 
        label="Sales Today"
        format="currency"
        showTrend
      />
    </SalesTodayProvider>
  </Container>
  
  <!-- Active Users (refreshes every 10 seconds) -->
  <Container type="card">
    <UserListProvider 
      :filters="{ status: 'online' }"
      :autoRefresh="10"
    >
      <MetricView label="Users Online" />
    </UserListProvider>
  </Container>
  
  <!-- Recent Orders (refreshes every 5 seconds) -->
  <Container type="card" colspan="2">
    <OrderListProvider 
      :limit="10"
      :sort="{ field: 'created_at', order: 'desc' }"
      :autoRefresh="5"
    >
      <TableView 
        :fields="['id', 'customer', 'amount', 'status']"
        compact
      />
    </OrderListProvider>
  </Container>
</Container>
```

### 8.8 Nested Context Providers

```vue
<!-- Workspace provides context for all nested providers -->
<WorkspaceProvider :workspaceId="workspaceId">
  <Container type="split">
    <!-- Left Sidebar -->
    <template #left>
      <Container type="sidebar">
        <!-- Tables in this workspace -->
        <h3>Tables</h3>
        <TableListProvider>
          <ListView @itemClick="selectTable" />
        </TableListProvider>
        
        <!-- Members in this workspace -->
        <h3>Members</h3>
        <WorkspaceMembersProvider>
          <CompactView />
        </WorkspaceMembersProvider>
      </Container>
    </template>
    
    <!-- Main Content -->
    <template #right>
      <Container type="column">
        <!-- Selected Table Data -->
        <Container type="card">
          <TableViewerProvider :tableId="selectedTableId">
            <TableView showActions />
          </TableViewerProvider>
        </Container>
      </Container>
    </template>
  </Container>
</WorkspaceProvider>
```

---

## 9. Naming Conventions

### 9.1 Containers
- Prefix: `Container` (component name) or `container-` (component ID)
- Format: `Container` with `type` prop
- Examples: 
  ```vue
  <Container type="card" />
  <Container type="grid" />
  <Container type="drawer" />
  ```

### 9.2 Providers
- Suffix: `Provider`
- Format: `{Entity}{Operation}Provider`
- Examples: 
  ```vue
  <UserListProvider />
  <WorkspaceDetailProvider />
  <TableViewerProvider />
  <SearchProvider />
  ```
- Component IDs: `user-list-provider`, `workspace-detail-provider`

### 9.3 Views
- Suffix: `View`
- Format: `{Type}View`
- Examples:
  ```vue
  <TableView />
  <CardView />
  <FormView />
  <ChartView />
  ```
- Component IDs: `table-view`, `card-view`, `form-view`

### 9.4 Simple Components (Form Fields, Display)
- No suffix/prefix
- Format: `{ComponentName}`
- Examples:
  ```vue
  <TextInput />
  <DatePicker />
  <Badge />
  <Avatar />
  ```
- Component IDs: `text-input`, `date-picker`, `badge`, `avatar`

---

## 10. Component Registry Structure

```typescript
type ComponentRegistry = {
  // Layout containers
  containers: {
    layout: ContainerSchema[]       // grid, column, row, split, etc.
    surface: ContainerSchema[]      // card, panel, section, paper
    overlay: ContainerSchema[]      // modal, drawer, popover, dropdown
    navigation: ContainerSchema[]   // sidebar, topbar, bottombar
  }
  
  // Data providers
  providers: {
    entities: {
      user: ProviderSchema[]        // UserListProvider, UserDetailProvider, etc.
      workspace: ProviderSchema[]
      company: ProviderSchema[]
      table: ProviderSchema[]
      // ... other entities
    }
    actions: ProviderSchema[]       // SearchProvider, FilterProvider, etc.
    utilities: ProviderSchema[]     // ThemeProvider, AuthProvider, etc.
  }
  
  // Presentation views
  views: {
    list: ViewSchema[]              // TableView, CardView, GridView, etc.
    detail: ViewSchema[]            // PageView, InlineView, PreviewView
    form: ViewSchema[]              // FormView, WizardView, InlineFormView
    chart: ViewSchema[]             // BarChartView, LineChartView, etc.
    custom: ViewSchema[]            // Custom views
  }
  
  // Simple components
  components: {
    forms: ComponentSchema[]        // TextInput, DatePicker, etc.
    displays: ComponentSchema[]     // Badge, Avatar, etc.
    actions: ComponentSchema[]      // Button, Link, etc.
  }
}
```

---

## 11. Integration with Dynamic Component System

This taxonomy integrates perfectly with the Dynamic Component System from `PHASE_3.4_DYNAMIC_COMPONENTS.md`.

### 11.1 ComponentNode Structure

```typescript
type ComponentNode = {
  id: string
  componentId: string           // References component in registry
  
  props?: Record<string, any>
  slots?: {
    default?: ComponentNode[]
    [slotName: string]: ComponentNode[] | undefined
  }
}
```

### 11.2 Example: User List Page

```typescript
// Page definition in App JSON
{
  id: 'users-page',
  name: 'Users',
  slug: 'users',
  layout: 'layout-page',
  content: [
    {
      id: 'root-container',
      componentId: 'container',
      props: { type: 'column', gap: 'lg' },
      slots: {
        default: [
          // Header
          {
            id: 'header',
            componentId: 'container',
            props: { type: 'row', justify: 'between' },
            slots: {
              default: [
                { id: 'title', componentId: 'display-text', props: { text: 'Users', variant: 'heading' } },
                { id: 'add-btn', componentId: 'user-create-button' }
              ]
            }
          },
          // User List
          {
            id: 'user-list-card',
            componentId: 'container',
            props: { type: 'card' },
            slots: {
              default: [
                {
                  id: 'user-list-provider',
                  componentId: 'user-list-provider',
                  props: { 
                    filters: { status: 'active' },
                    sort: { field: 'name', order: 'asc' }
                  },
                  slots: {
                    default: [
                      {
                        id: 'user-table-view',
                        componentId: 'table-view',
                        props: { 
                          fields: ['name', 'email', 'role', 'status'],
                          showActions: true
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ]
}
```

### 11.3 AI Building Apps

When AI builds an app, it thinks in layers:

```
AI: "Create a user management page with a table"

Step 1: Choose layout
→ Container type="column"

Step 2: Choose provider
→ UserListProvider (handles data)

Step 3: Choose view
→ TableView (displays data)

Result:
<Container type="column">
  <UserListProvider>
    <TableView />
  </UserListProvider>
</Container>
```

### 11.4 Component Registry Integration

```typescript
// Registry knows about all three types
const registry = {
  containers: {
    'container': ContainerSchema
  },
  providers: {
    'user-list-provider': ProviderSchema,
    'workspace-list-provider': ProviderSchema,
    // ...
  },
  views: {
    'table-view': ViewSchema,
    'card-view': ViewSchema,
    'grid-view': ViewSchema,
    // ...
  }
}

// AI can query:
// "What providers are available for user entity?"
// → UserListProvider, UserDetailProvider, UserCreateProvider, ...

// "What views work with list providers?"
// → TableView, CardView, GridView, ListView, ...

// "How do I display users in a card layout?"
// → <UserListProvider><CardView /></UserListProvider>
```

### 11.5 Dynamic Rendering

```vue
<!-- DynamicRenderer.vue -->
<script setup>
const props = defineProps<{
  node: ComponentNode
}>()

const component = resolveComponent(props.node.componentId)
</script>

<template>
  <component 
    :is="component"
    v-bind="node.props"
  >
    <!-- Render slots recursively -->
    <template v-for="(slotNodes, slotName) in node.slots" #[slotName]>
      <DynamicRenderer 
        v-for="childNode in slotNodes"
        :key="childNode.id"
        :node="childNode"
      />
    </template>
  </component>
</template>
```

This allows the entire UI to be defined in JSON and rendered dynamically!

---

## 12. Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Create `Container` component with all layout types
- [ ] Define `ProviderSchema` and `ViewSchema` types
- [ ] Update component registry to support providers/views
- [ ] Create base provider composable (`useProvider`)
- [ ] Create base view composable (`useView`)

### Phase 2: First Entity (User)
- [ ] Create `UserListProvider`
- [ ] Create views: `TableView`, `CardView`, `ListView`
- [ ] Test provider + view combinations
- [ ] Document patterns and best practices

### Phase 3: Expand to Core Entities
- [ ] Workspace providers + views
- [ ] Company providers + views
- [ ] Table providers + views
- [ ] File providers + views

### Phase 4: Action Providers
- [ ] SearchProvider
- [ ] FilterProvider
- [ ] SortProvider
- [ ] PaginationProvider
- [ ] BulkActionsProvider

### Phase 5: Form & Display Components
- [ ] Form field components (TextInput, DatePicker, etc.)
- [ ] Display components (Badge, Avatar, etc.)
- [ ] Integrate with providers

### Phase 6: Migration
- [ ] Refactor existing components to use new pattern
- [ ] Update all pages to use provider pattern
- [ ] Deprecate old components
- [ ] Remove old components

---

## Conclusion

This **Provider-First Architecture** (Container → Provider → View) provides:

### 🎯 Perfect Separation of Concerns
- **Containers**: Layout and spacing only
- **Providers**: Data, state, and business logic only
- **Views**: Presentation and rendering only

### ♻️ Maximum Reusability
- Same provider works with any compatible view
- Same view works with any compatible provider
- Same container works with any content
- Zero code duplication

### 🔄 View Swapping
Change presentation without touching data logic:
```vue
<UserListProvider>
  <TableView />  <!-- Swap to CardView, GridView, etc. -->
</UserListProvider>
```

### 👁️ Multiple Views
Show same data in different formats simultaneously:
```vue
<UserListProvider>
  <MetricView />
  <ChartView />
  <TableView />
</UserListProvider>
```

### 🧩 Vue Native
Leverages Vue's provide/inject pattern - familiar to all Vue developers

### 🤖 AI-Friendly
Natural language maps perfectly to this structure:
- "Show users in a table" → `<UserListProvider><TableView /></UserListProvider>`

### 📈 Scalability
N providers + M views = N+M components (not N×M)

### ✅ Testability
Clear boundaries make testing simple - test providers and views independently

### 🎨 Consistency
All entities follow same pattern - predictable and easy to learn

---

**This is the foundation for a truly dynamic, composable, AI-ready component system.**

