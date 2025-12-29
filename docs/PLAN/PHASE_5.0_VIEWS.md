# Phase 5.0: Views

## Goals

- Multiple view types for tables
- View-specific configurations
- Filtering and sorting

---

## Tasks

- [ ] Create data_table_views table
- [ ] Create view CRUD API endpoints
- [ ] Implement Grid view component
- [ ] Implement Kanban view component
- [ ] Implement Calendar view component
- [ ] Implement Gallery view component
- [ ] Implement Gantt view component
- [ ] Implement Tree view component
- [ ] Implement Map view component
- [ ] Create view switcher UI
- [ ] Create filter builder UI
- [ ] Create sort configuration UI

---

## Database Schema

```typescript
// server/db/schema/data-table-views.ts
export type ViewType = 'grid' | 'kanban' | 'calendar' | 'gantt' | 'gallery' | 'tree' | 'map'

export const dataTableViews = pgTable('data_table_views', {
  id: uuid('id').primaryKey(),
  dataTableId: uuid('data_table_id').notNull().references(() => dataTables.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  viewType: text('view_type').$type<ViewType>().notNull().default('grid'),
  
  isDefault: boolean('is_default').notNull().default(false),
  isShared: boolean('is_shared').notNull().default(false),
  isPublic: boolean('is_public').notNull().default(false),
  
  visibleColumns: jsonb('visible_columns').$type<string[]>(),
  columnWidths: jsonb('column_widths').$type<Record<string, number>>(),
  filters: jsonb('filters').$type<FilterConfig>(),
  sort: jsonb('sort').$type<SortConfig[]>(),
  viewConfig: jsonb('view_config').$type<ViewConfig>(),
  
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueSlugPerTable: unique().on(table.dataTableId, table.slug),
}))
```

---

## View Types Implementation Priority

1. **Grid View** - Default table view with sorting, filtering, column resize
2. **Kanban View** - Group by select/status column, drag cards between columns
3. **Calendar View** - Date-based view with month/week/day modes
4. **Gallery View** - Card-based grid with cover images
5. **Gantt View** - Timeline with start/end dates and dependencies
6. **Tree View** - Hierarchical display for parent-child relationships
7. **Map View** - Geolocation-based pin display

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tables/:tableId/views` | Create view |
| PUT | `/api/tables/:tableId/views/:id` | Update view |
| DELETE | `/api/tables/:tableId/views/:id` | Delete view |
| PUT | `/api/tables/:tableId/views/:id/set-default` | Set as default view |

---

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/workspaces/:slug/view/:viewSlug` | `ViewDetail.vue` | View renderer (grid, kanban, etc.) |
| `/workspaces/:slug/view/:viewSlug/setting` | `ViewSetting.vue` | View settings |
| `/public/view/:viewId` | `PublicView.vue` | Public shared view |

---

## Completion Criteria

- [ ] User can create multiple views per table
- [ ] Each view type renders correctly
- [ ] Filtering and sorting work
- [ ] View settings persist

