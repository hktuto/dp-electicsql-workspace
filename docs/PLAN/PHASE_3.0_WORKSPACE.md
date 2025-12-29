# Phase 3.0: Workspace & Navigation Menu

## Goals

- Workspaces under companies
- Customizable navigation menu (folders, items)
- Workspace settings

---

## Tasks

- [ ] Create workspaces table schema
- [ ] Create workspace CRUD API endpoints
- [ ] Create menu update API endpoint
- [ ] Setup Electric SQL shapes for workspaces
- [ ] Create workspace list UI
- [ ] Create workspace sidebar with draggable menu
- [ ] Implement menu folder/item drag-and-drop
- [ ] Create workspace settings UI

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

- [ ] Company admin can create workspaces
- [ ] Workspace has customizable menu
- [ ] Menu supports drag-and-drop reordering
- [ ] Workspace data syncs to frontend

