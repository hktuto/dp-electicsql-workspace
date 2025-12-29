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
| POST | `/api/companies/:companyId/workspaces` | Create workspace |
| PUT | `/api/companies/:companyId/workspaces/:id` | Update workspace |
| DELETE | `/api/companies/:companyId/workspaces/:id` | Delete workspace |
| PUT | `/api/companies/:companyId/workspaces/:id/menu` | Update menu structure |

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
- [🔄] Workspace has customizable menu (structure ready, awaiting menu component integration)
- [🔄] Menu supports drag-and-drop reordering (awaiting menu component integration)
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
| PUT | `/api/workspaces/:id` | Update workspace | Company Admin |
| DELETE | `/api/workspaces/:id` | Delete workspace | Company Admin |
| PUT | `/api/workspaces/:id/menu` | Update menu structure | Company Member |

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
- ✅ Workspace list page with grid layout
- ✅ Create workspace dialog with form validation
- ✅ Workspace detail page with header and sidebar structure
- ✅ Workspace settings page with general, menu, and danger zone tabs
- ✅ Delete workspace with confirmation dialog
- ✅ Auto-slug generation from workspace name
- ✅ Icon support via Iconify
- ✅ Electric SQL sync integration (auto-refresh on data changes)
- ✅ Company context integration
- ✅ Permission checks (admin/owner required for management)

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

