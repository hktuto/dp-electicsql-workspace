---
alwaysApply: true
---

# DocPal - Project Rules

## Project Overview
DocPal is a low-code platform built with Nuxt 4 + NuxtHub that allows users to create companies, workspaces, dynamic data tables, views, dashboards, and automation workflows.

## Tech Stack
- **Frontend**: Nuxt 4, Element Plus, SCSS + CSS Variables, Nuxt Icon
- **Backend**: NuxtHub, PostgreSQL, Drizzle ORM
- **File Storage**: MinIO (S3-compatible)
- **AI**: OpenAI + Ollama (optional, self-hosted LLM)
- **Workflow Engine**: Temporal
- **Real-time**: Electric SQL with PGLite and shared worker

## UI Guidelines
- **Use Element Plus** for all UI components (buttons, forms, tables, dialogs, etc.)
- **Use Nuxt Icon** (`<Icon>`) for icons whenever possible instead of other icon libraries
- Follow Element Plus design patterns and component APIs
- Use SCSS with CSS Variables for styling (defined in `@/assets/style/`)
- **All `<el-form>` must use `label-position="top"`** for consistent form layouts
- **Use system CSS variables** from `@/assets/style/variable.scss` for colors and sizing:
  - Colors: `var(--app-primary-color)`, `var(--app-grey-*)`, `var(--app-text-color-*)`, etc.
  - Spacing: `var(--app-space-xs)`, `var(--app-space-s)`, `var(--app-space-m)`, etc.
  - Font sizes: `var(--app-font-size-s)`, `var(--app-font-size-m)`, `var(--app-font-size-l)`, etc.
  - Border radius: `var(--app-border-radius-s)`, `var(--app-border-radius-m)`, etc.
  - Shadows: `var(--app-shadow-s)`, `var(--app-shadow-m)`, `var(--app-shadow-l)`, etc.

### Popover and Dialog Components

**Always use `CommonPopoverDialog`** (`app/components/common/popoverDialog.vue`) instead of `el-dialog`, `el-popover`, or `el-dropdown` when possible.

**Benefits:**
- ✅ Smart positioning with collision detection
- ✅ Automatic mobile-responsive behavior (popover on desktop, dialog on mobile)
- ✅ Nested popover support (child popovers don't close parents)
- ✅ Consistent UX across the application
- ✅ Arrow pointing to trigger element

**Usage:**
```vue
<script setup>
const triggerRef = ref<HTMLElement>()
const popoverRef = ref()

function openPopover() {
  const target = triggerRef.value
  if (target) {
    const el = (target as any).$el || target
    popoverRef.value?.open(el)
  }
}
</script>

<template>
  <el-button ref="triggerRef" @click="openPopover">
    Open
  </el-button>
  
  <CommonPopoverDialog
    ref="popoverRef"
    title="Title"
    :width="400"
    placement="bottom-start"
  >
    <!-- Content here -->
  </CommonPopoverDialog>
</template>
```

**When NOT to use:**
- Simple tooltips → Use `el-tooltip`
- Native browser dialogs (confirm/alert) → Use `ElMessageBox`
- Full-page modals with complex layouts → Consider `el-drawer`

See `docs/POPOVER_DIALOG_USAGE.md` and `docs/SMART_POPOVER_POSITIONING.md` for details.

## Frontend Architecture

### Page/Component Pattern

**All pages are just wrappers** - They convert route params to props and render the actual component.

**Pattern:**
```
/app/pages/[url].vue              <- Route wrapper (extracts params, passes as props)
/app/components/global/[Name].vue <- Actual page component (receives props)
```

**Why:** This architecture supports dual navigation modes:
1. **URL Navigation** - Standard page-based routing
2. **Tab/Dock Mode** - Dynamic component rendering in Dockview panels

By keeping actual logic in global components, the same component can be rendered in either mode.

**Example:**

```vue
<!-- app/pages/company/[slug].vue - Route Wrapper -->
<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string
</script>

<template>
  <CompanySetting :slug="slug" />
</template>
```

```vue
<!-- app/components/global/companySetting.vue - Actual Component -->
<script setup lang="ts">
interface Props {
  slug: string
}
const props = defineProps<Props>()
// ... all the component logic here
</script>

<template>
  <!-- ... UI here -->
</template>
```

**Rules:**
- **ALWAYS** create the actual component in `/app/components/global/` (or layer-specific global)
- **NEVER** put business logic in page files
- Page files should ONLY:
  1. Extract route params
  2. Convert params to props
  3. Render the global component
- Keep page files minimal (< 20 lines)
= **NEVER** create additonal document, document should only have 3 sections: PLAN (phase development plan), PROGRESS (daily progress report), REQUIREMENT (requirement documentation), if any additional document needed, please create a new file follow current phase number + 0.1, for example, if current phase is 3.0, and you need to create a new document for the 3.1 phase, the file name should be `3.1_new-feature.md`

## Project Management Structure

### Requirements Documentation
- All requirement files are stored in `docs/REQUIRMENT/`
- Naming format: `yyyyMMDD-special-name.md` (e.g., `20251229.md`)
- Reference requirements from this directory when implementing features

### Development Plans
- All development plans are stored in `docs/PLAN/`
- After each plan completion or status update, add process results/status updates to the corresponding plan file in `docs/PLAN/`
- Keep plans updated with progress, blockers, and outcomes

## Technical Constraints

### Electric SQL Limitations
- Electric SQL can only query filter "Shape" in target tables
- All permission-related columns must be added directly to tables (not joined)
- Include `workspaceId` and `companyId` in all tables that need permission filtering

### UUID Generation
- All UUIDs must be created by the application (client-side or server-side)
- **DO NOT** use PostgreSQL auto-generated UUIDs (e.g., `gen_random_uuid()`)
- This is required for easy migration and Electric SQL compatibility

### Database Schema
- Use Drizzle ORM for schema definitions
- All tables should include `createdAt` and `updatedAt` timestamps
- Use cascade deletes for related records where appropriate
- Reference the database schema in `docs/REQUIRMENT/20251229.md` for table structures

### Permissions
- Use bitwise binary numbers (bytea) to store permissions
- Permission bits: 1 = read, 10 = write, 100 = manage, 1000 = delete, etc.
- Use `userPermissionLookup` table for Electric SQL shape queries

## Code Style
- Use `<script setup lang="ts">` format for Vue components
- Prefer functional programming over classes
- Keep code simple and clean
- Use TypeScript for type safety
- Follow Nuxt 4 conventions and best practices

### Global State in Composables
For composables that need **global/shared state** (e.g., auth, company context, sync state), use `useState` wrapped in a function:

```typescript
// ❌ Wrong - creates new state per component
const user = ref<User | null>(null)

// ✅ Correct - global state with SSR-safe reactivity
const useUser = () => useState<User | null>('authUser', () => null)

export function useAuth() {
  const user = useUser()  // Call inside the composable
  // ...
}
```

This pattern ensures:
- SSR-safe state hydration
- State is shared across all components
- Proper reactivity across the app

### Electric SQL Sync Pattern
Data synced via Electric SQL lives in **PGLite only**. Do NOT duplicate data in global refs.

**Pattern: Query on demand, subscribe to changes**

```typescript
// ❌ Wrong - duplicates data in memory
export function useCompanySync() {
  const companies = useState<Company[]>('companies', () => [])  // BAD!
  // ...
}

// ✅ Correct - query helpers, no data storage
export function useCompanySync() {
  const electric = useElectricSync()
  
  // Only sync STATE (isSyncing, error, etc.)
  const state = useCompanySyncState()

  // Query helpers - always fresh from PGLite
  const findById = (id: string) => electric.query('SELECT * FROM companies WHERE id = $1', [id])
  const getAll = () => electric.query('SELECT * FROM companies')

  // Subscribe to changes
  const onChange = (callback: ChangeCallback) => electric.onDataChange('companies', callback)

  return { state, startSync, findById, getAll, onChange }
}
```

**Component Usage:**
```typescript
const companySync = useCompanySync()

// Local ref for THIS component only
const companies = ref<Company[]>([])

onMounted(async () => {
  await companySync.startSync()
  companies.value = await companySync.getAll()
})

// Re-query when data changes
companySync.onChange(() => {
  companies.value = companySync.getAll()
})
```

**Benefits:**
- ✅ No memory duplication (data lives in PGLite only)
- ✅ Scales to 100k+ rows
- ✅ Each component manages its own view
- ✅ Pagination/filtering at query level

**Change Event Behaviors:**
| Context | Behavior |
|---------|----------|
| List views | Auto-refresh silently |
| Detail/Settings forms | Show notification if user has unsaved changes |
| Grid views | Highlight inserted/updated rows |

## Key Features to Remember
- Companies, workspaces, dynamic tables, views (Table, Kanban, Gantt, Calendar, Gallery, Tree, Map), dashboards
- Magic link invitations for users
- Workspace-based permissions with custom roles
- Dynamic table columns with extensive field types and configurations
- View configurations with filters, sorting, and view-specific settings
- Dashboard widgets in grid layout
