# Phase 9.0: Workflow Engine (Temporal)

## Goals

- Workflow definitions
- Trigger types (schedule, webhook, record change)
- Action types (notifications, record updates, external API)

---

## Tasks

- [ ] Setup Temporal server (Docker)
- [ ] Create workflow definition schema
- [ ] Implement workflow triggers
- [ ] Implement common workflow actions
- [ ] Create workflow builder UI
- [ ] Create workflow execution monitor

---

## Database Schema

```typescript
// server/db/schema/workflows.ts
export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  
  isActive: boolean('is_active').notNull().default(false),
  
  trigger: jsonb('trigger').$type<WorkflowTrigger>().notNull(),
  actions: jsonb('actions').$type<WorkflowAction[]>().notNull(),
  
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), // 'pending' | 'running' | 'completed' | 'failed'
  input: jsonb('input'),
  output: jsonb('output'),
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

---

## Trigger Types

- **Schedule** - Cron-based scheduling
- **Webhook** - External HTTP trigger
- **Record Create** - When a record is created
- **Record Update** - When a record is updated
- **Record Delete** - When a record is deleted
- **Field Change** - When a specific field changes

---

## Action Types

- **Send Email** - Email notification
- **Send Webhook** - HTTP request to external URL
- **Create Record** - Insert new record
- **Update Record** - Modify existing record
- **Delete Record** - Remove record
- **Run Script** - Custom JavaScript execution
- **Wait** - Delay execution
- **Condition** - Branching logic

---

## Frontend Pages

Workflows are accessed within workspace settings as a sub-section, not as standalone routes.

---

## Completion Criteria

- [ ] Temporal server running
- [ ] Workflows can be created via UI
- [ ] Triggers execute workflows
- [ ] Actions perform correctly
- [ ] Execution history viewable

