# Phase 3.0: Workspace & Navigation Menu

## Goals

- Workspaces under companies
- Customizable navigation menu (folders, items)
- Workspace settings

---

## Tasks

- [x] Create workspaces table schema
- [x] Create workspace CRUD API endpoints
- [x] Create menu update API endpoint
- [x] Setup Electric SQL shapes for workspaces
- [x] Create workspace list UI
- [x] Create workspace sidebar (structure ready, awaiting menu system)
- [ ] Implement menu folder/item drag-and-drop (deferred to menu system integration)
- [x] Create workspace settings UI
- [x] Implement menu folder/item drag-and-drop (completed in Phase 3.2)

---

## Database Schema

```typescript
// server/db/schema/workspaces.ts
export interface MenuItem {
  id: string
  label: string
  slug: string
  type: 'folder' | 'table' | 'view' | 'dashboard'
  itemId?: string
  description?: string
  children?: MenuItem[]
  order: number
  viewId?: string
  tableId?: string
  tableSlug?: string
}

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  icon: text('icon'),
  description: text('description'),
  menu: jsonb('menu').$type<MenuItem[]>().default([]),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueSlugPerCompany: unique().on(table.companyId, table.slug),
}))
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workspaces` | Create workspace |
| PUT | `/api/workspaces/:id` | Update workspace (including menu) |
| DELETE | `/api/workspaces/:id` | Delete workspace |

---

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/workspaces` | `WorkspaceList.vue` | Workspace list |
| `/workspaces/:slug` | `WorkspaceDetail.vue` | Workspace main view |
| `/workspaces/:slug/setting` | `WorkspaceSetting.vue` | Workspace settings |
| `/workspaces/:slug/folder/:folderSlug` | `FolderView.vue` | Folder view |
| `/workspaces/:slug/folder/:folderSlug/setting` | `FolderSetting.vue` | Folder settings |

---

## Completion Criteria

- [x] Company admin can create workspaces
- [x] Workspace has customizable menu (completed in Phase 3.2)
- [x] Menu supports drag-and-drop reordering (completed in Phase 3.2)
- [x] Workspace data syncs to frontend
- [x] Workspace list, detail, and settings pages created
- [x] Full CRUD operations functional

---

## Completed: Backend Implementation (2024-12-29)

### Implementation Notes

- **Schema**: Added `workspaces` table with `menu` JSONB field for hierarchical navigation
- **Electric SQL Filtering**: Users only see workspaces they have access to via `workspace_users` array
- **Workspace Context**: Each workspace has its own navigation menu structure
- **APIs**: CRUD operations (no GET - data synced via Electric SQL)

### Key Files

- `server/db/schema/workspaces.ts` - Workspace schema with MenuItem interface
- `server/api/workspaces/index.post.ts` - Create workspace
- `server/api/workspaces/[id].put.ts` - Update workspace
- `server/api/workspaces/[id].delete.ts` - Delete workspace
- `server/api/workspaces/[id]/menu.put.ts` - Update menu structure
- `server/api/electric/shape.get.ts` - Electric proxy with workspace filtering
- `app/composables/useWorkspaceSync.ts` - Workspace sync composable
- `server/db/migrations/postgresql/0002_futuristic_clint_barton.sql` - Workspace table migration

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/workspaces` | Create workspace | Company Admin |
| PUT | `/api/workspaces/:id` | Update workspace (including menu) | Company Admin |
| DELETE | `/api/workspaces/:id` | Delete workspace | Company Admin |

### Electric SQL Sync

```typescript
// Workspace sync composable pattern
const workspaceSync = useWorkspaceSync()
await workspaceSync.startSync()

// Query helpers
const workspaces = await workspaceSync.getByCompanyId(companyId)
const workspace = await workspaceSync.findBySlug(companyId, slug)

// Subscribe to changes
workspaceSync.onChange((changes) => {
  // Re-query when data changes
})
```

---

## Completed: Frontend Pages & Components (2024-12-29)

Created all page wrappers and global components following the established pattern.

### Page Wrappers (Route handlers)
- `app/pages/workspaces/index.vue` - Workspace list page wrapper
- `app/pages/workspaces/[slug].vue` - Workspace detail page wrapper  
- `app/pages/workspaces/[slug]/setting.vue` - Workspace settings page wrapper

### Global Components (Actual implementations)
- `app/components/global/workspaceList.vue` - Workspace list with create dialog
- `app/components/global/workspaceDetail.vue` - Workspace main view with sidebar placeholder
- `app/components/global/workspaceSetting.vue` - Workspace settings with tabs

### Features Implemented
- [x] Workspace list page with grid layout
- [x] Create workspace dialog with form validation
- [x] Workspace detail page with header and sidebar structure
- [x] Workspace settings page with general, menu, and danger zone tabs
- [x] Delete workspace with confirmation dialog
- [x] Auto-slug generation from workspace name
- [x] Icon support via Iconify
- [x] Electric SQL sync integration (auto-refresh on data changes)
- [x] Company context integration
- [x] Permission checks (admin/owner required for management)

### Routes Available
- `/workspaces` - List all workspaces
- `/workspaces/:slug` - View workspace details
- `/workspaces/:slug/setting` - Manage workspace settings

---

## Remaining: Menu System Integration

The workspace components are ready, but the menu navigation system needs to be integrated:
- [ ] Replace sidebar menu placeholder in `workspaceDetail.vue`
- [ ] Implement drag-and-drop menu reordering in settings
- [ ] Connect menu items to actual tables/views/dashboards (Phase 4+)

---

## Additional Improvements (2024-12-29)

### Custom Popover/Dialog System

Created a comprehensive popover system to replace `el-dialog`, `el-popover`, and `el-dropdown` throughout the application.

#### Component: `CommonPopoverDialog`
**File**: `app/components/common/popoverDialog.vue`

**Features:**
- ✅ **Smart Positioning** - Automatically detects available space and chooses best placement
- ✅ **Collision Detection** - Never overlaps the trigger element
- ✅ **Responsive** - Popover on desktop, dialog on mobile
- ✅ **Nested Support** - Child popovers don't close parent popovers
- ✅ **Arrow Indicator** - Points to trigger element
- ✅ **Programmatic Control** - Expose `open(target)` and `close()` methods
- ✅ **Keyboard Support** - Close on Escape (smart detection for inputs)
- ✅ **Scroll/Resize Handling** - Auto-repositions on window events

**Smart Positioning Algorithm:**
1. Calculate available space in all 4 directions (top, bottom, left, right)
2. Check if preferred placement has enough space
3. If not, find direction with most available space
4. Position popover with offset to avoid overlap
5. Calculate arrow position to point at trigger center
6. Clamp to viewport bounds while maintaining separation from trigger

**Nested Popover Handling:**
- All popovers teleported to `<body>` as siblings
- Click outside handler checks if click is inside `.custom-popover`
- Only closes if clicking truly outside all popovers
- Supports unlimited nesting depth

#### Migrated Components

1. **User Profile Menu** (`app/components/user/profileMenu.vue`)
   - Migrated from `el-dropdown` to `CommonPopoverDialog`
   - Better positioning, mobile-responsive
   - Company switcher, edit profile, logout

2. **Workspace Creation Form** (`app/components/global/workspaceList.vue`)
   - Migrated from dialog to popover/dialog
   - Opens near "New Workspace" button on desktop
   - Full dialog on mobile

3. **Icon Picker** (`app/components/common/iconPickerInput.vue`)
   - Migrated from `el-dialog` to `CommonPopoverDialog`
   - Opens near input field
   - Example of nested popover (icon picker inside workspace form)

### Icon Picker System

Created a Notion-style icon picker with categories, search, and form integration.

#### Components Created:

1. **`CommonIconPicker`** - Core picker component
   - Category tabs: Popular, Material Symbols, Heroicons, Lucide
   - Real-time search across ~200 curated icons
   - Grid layout (8 columns)
   - Selected state indicator
   - Preview bar with icon name

2. **`CommonIconPickerInput`** - Form input wrapper
   - Element Plus input with icon preview
   - Clear/search buttons
   - Uses `CommonPopoverDialog` for picker
   - v-model support
   - Responsive (popover on desktop, dialog on mobile)

### Workspace Features

#### Two-Stage Search Filter
**File**: `app/components/global/workspaceList.vue`

**Stage 1 - Preview (Dimming):**
- User types in search input
- Non-matching workspaces dim (opacity: 0.4)
- **Smart Sorting**: Matching items move to the top
- All items remain visible
- No commitment required

**Stage 2 - Commit (Filter):**
- User presses Enter or clicks "Filter" button
- Non-matching workspaces hidden
- Press Escape or "Reset" to return to all

**Benefits:**
- See matches before committing
- Smart sorting ensures matches visible in long lists
- Can cancel without losing context

#### Workspace List Card Component
**File**: `app/components/workspace/listCard.vue`

Extracted individual workspace card into its own component:
- Displays name, description, icon
- Click to navigate
- Settings button
- `dimmed` prop for search preview
- Hover effects
- Better code organization

### Global Composables

#### `useBreakpoint()`
**File**: `app/composables/useBreakpoint.ts`

Global breakpoint detection using VueUse:
- Provides `isMobile`, `isTablet`, `isDesktop`, etc.
- Single source of truth for responsive states
- SSR-safe reactivity
- Used by `CommonPopoverDialog` for responsive behavior

### Bug Fixes

1. **JWT Payload Consistency**
   - Fixed `user.id` → `user.userId` across 15+ API endpoints
   - Updated all company and workspace APIs
   - Updated Electric SQL shape filtering

2. **Auto-Company Selection on Refresh**
   - Moved `companyContext.init()` to `auth.global.ts` middleware
   - Ensures company context persists after refresh
   - Automatically selects only company if user has one

3. **Electric SQL Workspace Sync**
   - Bumped schema version to `3.0.0`
   - Added `workspaces` to synced tables
   - Fixed PGLite relation error

4. **Drizzle Query Syntax**
   - Fixed `where()` chaining using `and()` for multiple conditions
   - Applied to workspace creation and slug uniqueness checks

5. **Electric SQL Sync Delay**
   - Added 2-second setTimeout after workspace creation
   - Allows Electric SQL to sync before manual reload
   - Documented long-term solutions (optimistic UI updates)

### Documentation Created


**Progress Report:**
- `docs/PROGRESS/20251229.md` - Today's comprehensive progress report

### Rules Updated

Added new section to `.cursor/rules/main/RULE.md`:
- **Popover and Dialog Components** guideline
- Always use `CommonPopoverDialog` instead of `el-dialog`, `el-popover`, `el-dropdown`
- Usage examples and best practices
- Benefits and when not to use

---

## Status Summary

**Phase 3.0 Backend**: ✅ **Complete**
- Database schema designed and migrated
- All CRUD APIs implemented
- Electric SQL sync configured
- Row-level filtering working

**Phase 3.0 Frontend**: ✅ **Complete**
- [x] Page wrappers created
- [x] Global components implemented
- [x] Workspace list with search
- [x] Workspace detail structure
- [x] Workspace settings
- [x] User profile menu
- [x] Icon picker system
- [x] Custom popover/dialog system
- [x] Menu sidebar integration (Phase 3.2)
- [x] Drag-and-drop menu (Phase 3.2)

---

## Status: ✅ COMPLETE (2024-12-30)

All workspace features completed including menu system integration.

**Next Phase**: Phase 4.0 - Dynamic Tables

