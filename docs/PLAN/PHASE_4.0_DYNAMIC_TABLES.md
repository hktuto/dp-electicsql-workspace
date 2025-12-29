# Phase 4.0: Dynamic Tables & Columns

## Goals

- Create/manage dynamic database tables
- Column definitions with various types
- Physical table creation via raw SQL
- Migration tracking for PGLite sync

---

## Tasks

- [ ] Create data_tables and data_table_columns tables
- [ ] Create table_migrations table for PGLite sync
- [ ] Implement physical table creation (raw SQL)
- [ ] Implement column type to PostgreSQL type mapping
- [ ] Create table CRUD API endpoints
- [ ] Create column CRUD API endpoints with ALTER TABLE
- [ ] Implement column type change with data loss warning
- [ ] Create record CRUD API endpoints
- [ ] Setup Electric SQL shapes for dynamic tables
- [ ] Create table management UI
- [ ] Create column editor UI
- [ ] Create data grid component for records

---

## Database Schema

```typescript
// server/db/schema/data-tables.ts
export const dataTables = pgTable('data_tables', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  tableName: text('table_name').notNull().unique(), // Physical table: dt_{short_id}
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  description: text('description'),
  
  // Layout configurations
  formJson: jsonb('form_json'),
  cardJson: jsonb('card_json'),
  dashboardJson: jsonb('dashboard_json'),
  listJson: jsonb('list_json'),
  
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueSlugPerWorkspace: unique().on(table.workspaceId, table.slug),
}))

// Column type enum for consistency
export type ColumnType = 
  | 'text' | 'long_text' 
  | 'number' | 'currency'
  | 'date' | 'checkbox' | 'switch'
  | 'email' | 'phone' | 'url'
  | 'select' | 'multi_select'
  | 'color' | 'geolocation'
  | 'relation' | 'lookup' | 'formula'
  | 'attachment'

export const dataTableColumns = pgTable('data_table_columns', {
  id: uuid('id').primaryKey(),
  dataTableId: uuid('data_table_id').notNull().references(() => dataTables.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  
  name: text('name').notNull(), // DB column name (snake_case)
  label: text('label').notNull(), // Display label
  type: text('type').$type<ColumnType>().notNull(),
  
  required: boolean('required').notNull().default(false),
  order: integer('order').notNull().default(0),
  defaultValue: text('default_value'),
  isUnique: boolean('is_unique').notNull().default(false),
  isHidden: boolean('is_hidden').notNull().default(false),
  
  config: jsonb('config').$type<ColumnConfig>(),
  validationRules: jsonb('validation_rules').$type<ValidationRules>(),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Migration tracking for PGLite sync
export const tableMigrations = pgTable('table_migrations', {
  id: uuid('id').primaryKey(),
  dataTableId: uuid('data_table_id').notNull().references(() => dataTables.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  migrationSql: text('migration_sql').notNull(),
  rollbackSql: text('rollback_sql'),
  description: text('description'),
  executedAt: timestamp('executed_at').notNull().defaultNow(),
})
```

---

## Column Config Types

```typescript
// shared/types/column-config.ts
export interface ColumnConfig {
  // Text
  maxLength?: number
  minLength?: number
  placeholder?: string
  pattern?: string
  allowMultiLine?: boolean
  
  // Number
  min?: number
  max?: number
  decimals?: number
  prefix?: string
  suffix?: string
  
  // Date
  displayFormat?: 'date' | 'datetime' | 'time' | 'duration'
  formatString?: string
  timezone?: string
  minDate?: string
  maxDate?: string
  
  // Checkbox/Switch
  trueIcon?: string
  falseIcon?: string
  trueLabel?: string
  falseLabel?: string
  
  // Select/Multi-select
  options?: Array<{ label: string; color?: string }>
  allowCustom?: boolean
  maxSelections?: number
  
  // Currency
  currency?: string
  symbol?: string
  symbolPosition?: 'before' | 'after'
  precision?: number
  compactDisplay?: boolean
  compactThreshold?: number
  
  // Color
  colorFormat?: 'hex' | 'rgb' | 'hsl'
  allowAlpha?: boolean
  
  // Phone
  allowCountryCode?: boolean
  limitCountries?: string[]
  
  // URL
  openInNewTab?: boolean
  
  // Relation
  targetTableId?: string
  displayColumnId?: string
  allowMultiple?: boolean
  cascadeDelete?: 'restrict' | 'cascade' | 'set_null'
  
  // Lookup
  relationColumnId?: string
  targetColumnId?: string
  
  // Formula
  formula?: string
  returnType?: 'number' | 'text'
  
  // Attachment
  showThumbnail?: boolean
  openInNewTab?: boolean
  allowedTypes?: string[]
  maxSize?: number
  
  // Generic
  description?: string
  helpText?: string
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workspaces/:workspaceId/tables` | Create table + physical table |
| PUT | `/api/workspaces/:workspaceId/tables/:id` | Update table settings |
| DELETE | `/api/workspaces/:workspaceId/tables/:id` | Delete table + physical table |
| POST | `/api/tables/:tableId/columns` | Add column + ALTER TABLE |
| PUT | `/api/tables/:tableId/columns/:id` | Update column (may ALTER TABLE) |
| DELETE | `/api/tables/:tableId/columns/:id` | Delete column + ALTER TABLE |
| POST | `/api/tables/:tableId/records` | Insert record |
| PUT | `/api/tables/:tableId/records/:id` | Update record |
| DELETE | `/api/tables/:tableId/records/:id` | Delete record |
| POST | `/api/tables/:tableId/records/bulk` | Bulk insert/update/delete |

---

## Physical Table Structure

Each dynamic table will have these base columns:

```sql
CREATE TABLE dt_{short_id} (
  id UUID PRIMARY KEY,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- User-defined columns added via ALTER TABLE
);
```

---

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/workspaces/:slug/table/:tableSlug` | `TableView.vue` | Table data view |
| `/workspaces/:slug/table/:tableSlug/setting` | `TableSetting.vue` | Table settings (includes column editor) |

---

## Completion Criteria

- [ ] User can create dynamic tables
- [ ] User can add/edit/delete columns
- [ ] Physical table created in PostgreSQL
- [ ] Records CRUD works
- [ ] Table data syncs via Electric SQL
- [ ] Migration history tracked

