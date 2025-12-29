# Phase 8.0: Templates & History

## Goals

- Workspace templates
- Audit logging
- Record history/versioning

---

## Tasks

- [ ] Create templates, audit_logs, record_history tables
- [ ] Implement template save/restore logic
- [ ] Create audit logging middleware
- [ ] Implement record history triggers/hooks
- [ ] Create template gallery UI
- [ ] Create template save dialog
- [ ] Create audit log viewer UI
- [ ] Create record history viewer UI

---

## Database Schema

```typescript
// server/db/schema/templates.ts
export const appTemplates = pgTable('app_templates', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  coverImage: text('cover_image'),
  category: text('category'),
  tags: text('tags').array(),
  
  createdFromWorkspaceId: uuid('created_from_workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  
  visibility: text('visibility').notNull().default('personal'), // 'system' | 'public' | 'company' | 'personal'
  isFeatured: boolean('is_featured').default(false),
  
  templateDefinition: jsonb('template_definition').notNull(), // Tables, columns, views, sample data
  includesSampleData: boolean('includes_sample_data').default(false),
  includesViews: boolean('includes_views').default(true),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// server/db/schema/audit.ts
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  
  action: text('action').notNull(), // 'create' | 'update' | 'delete' | 'login' | 'invite' | etc.
  resourceType: text('resource_type').notNull(), // 'user' | 'company' | 'workspace' | 'table' | 'record' | etc.
  resourceId: uuid('resource_id'),
  resourceName: text('resource_name'),
  
  metadata: jsonb('metadata'), // Additional context
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// server/db/schema/record-history.ts
export const recordHistory = pgTable('record_history', {
  id: uuid('id').primaryKey(),
  dataTableId: uuid('data_table_id').notNull().references(() => dataTables.id, { onDelete: 'cascade' }),
  recordId: uuid('record_id').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  
  action: text('action').notNull(), // 'create' | 'update' | 'delete'
  changedBy: uuid('changed_by').references(() => users.id, { onDelete: 'set null' }),
  
  previousData: jsonb('previous_data'), // Snapshot before change
  newData: jsonb('new_data'), // Snapshot after change
  changedFields: text('changed_fields').array(), // Which fields changed
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workspaces/:id/save-as-template` | Save workspace as template |
| POST | `/api/workspaces/from-template/:templateId` | Create workspace from template |
| GET | `/api/templates` | List templates (filtered by visibility) |
| GET | `/api/audit-logs` | Get audit logs (company-scoped) |
| GET | `/api/tables/:tableId/records/:recordId/history` | Get record history |

---

## Frontend Pages

Templates and audit logs are accessed within workspace/company settings, not as standalone routes.

---

## Completion Criteria

- [ ] Workspaces can be saved as templates
- [ ] New workspaces can be created from templates
- [ ] Audit logs capture all actions
- [ ] Record history tracks changes

