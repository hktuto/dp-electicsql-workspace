# Phase 6.0: Dashboards & Widgets

## Goals

- Dashboard with draggable widget grid
- Various widget types (charts, stats, lists)
- Widget configuration

---

## Tasks

- [ ] Create dashboards table
- [ ] Create dashboard CRUD API endpoints
- [ ] Implement grid layout system (vue-grid-layout or similar)
- [ ] Create widget base component
- [ ] Implement stat card widget
- [ ] Implement chart widgets (bar, line, pie)
- [ ] Implement table list widget
- [ ] Implement recent records widget
- [ ] Create widget configuration panel
- [ ] Create dashboard editor UI

---

## Database Schema

```typescript
// server/db/schema/dashboards.ts
export const dashboards = pgTable('dashboards', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  
  widgets: jsonb('widgets').$type<Widget[]>().default([]),
  
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueSlugPerWorkspace: unique().on(table.workspaceId, table.slug),
}))

export interface Widget {
  id: string
  label: string
  component: string // 'stat-card' | 'chart-bar' | 'chart-pie' | 'table-list' | 'recent-records'
  position: {
    x: number
    y: number
    width: number
    height: number
    minWidth?: number
    minHeight?: number
  }
  props: Record<string, any> // Widget-specific configuration
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workspaces/:workspaceId/dashboards` | Create dashboard |
| PUT | `/api/workspaces/:workspaceId/dashboards/:id` | Update dashboard |
| DELETE | `/api/workspaces/:workspaceId/dashboards/:id` | Delete dashboard |
| PUT | `/api/dashboards/:id/widgets` | Update widgets |

---

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/workspaces/:slug/dashboard/:dashboardSlug` | `DashboardView.vue` | Dashboard view |
| `/workspaces/:slug/dashboard/:dashboardSlug/setting` | `DashboardSetting.vue` | Dashboard settings/editor |
| `/public/dashboard/:dashboardId` | `PublicDashboard.vue` | Public shared dashboard |

---

## Completion Criteria

- [ ] User can create dashboards
- [ ] Widgets can be added/removed/resized
- [ ] Multiple widget types available
- [ ] Dashboard data persists

