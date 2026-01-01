import { pgTable, uuid, text, timestamp, jsonb, unique, boolean, integer } from 'drizzle-orm/pg-core'
import { workspaces } from './workspaces'
import { companies } from './companies'
import { users } from './users'
import type { ColumnType, ColumnConfig, ValidationRules } from '#shared/types/data-table'

/**
 * Data Tables
 * Metadata for user-created dynamic tables
 */
export const dataTables = pgTable('data_tables', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  
  // Physical table name in PostgreSQL (e.g., dt_abc123)
  tableName: text('table_name').notNull().unique(),
  
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  
  description: text('description'),
  icon: text('icon'),
  
  // Layout configurations (for Phase 5+)
  formJson: jsonb('form_json'),
  cardJson: jsonb('card_json'),
  dashboardJson: jsonb('dashboard_json'),
  listJson: jsonb('list_json'),
  
  createdBy: uuid('created_by').references(() => users.id),
  updateToken: text('_update_token'), // Session token for filtering own changes in Electric sync
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueSlugPerWorkspace: unique('data_tables_workspace_slug_unique').on(table.workspaceId, table.slug),
}))

/**
 * Data Table Columns
 * Column definitions for dynamic tables
 */
export const dataTableColumns = pgTable('data_table_columns', {
  id: uuid('id').primaryKey().defaultRandom(),
  dataTableId: uuid('data_table_id').notNull().references(() => dataTables.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  
  // Column name in physical table (snake_case, e.g., full_name)
  name: text('name').notNull(),
  
  // Display label (e.g., "Full Name")
  label: text('label').notNull(),
  
  // Column type
  type: text('type').$type<ColumnType>().notNull(),
  
  // Column properties
  required: boolean('required').notNull().default(false),
  order: integer('order').notNull().default(0),
  defaultValue: text('default_value'),
  isUnique: boolean('is_unique').notNull().default(false),
  isHidden: boolean('is_hidden').notNull().default(false),
  isPrimaryDisplay: boolean('is_primary_display').notNull().default(false), // Main display field
  
  // Type-specific configuration
  config: jsonb('config').$type<ColumnConfig>(),
  
  // Validation rules
  validationRules: jsonb('validation_rules').$type<ValidationRules>(),
  
  createdBy: uuid('created_by').references(() => users.id), // Who created this column
  updateToken: text('_update_token'), // Session token for filtering own changes in Electric sync
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueNamePerTable: unique('data_table_columns_table_name_unique').on(table.dataTableId, table.name),
}))

/**
 * Table Migrations
 * Track schema changes for PGlite sync
 */
export const tableMigrations = pgTable('table_migrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  dataTableId: uuid('data_table_id').notNull().references(() => dataTables.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  
  version: integer('version').notNull(),
  migrationSql: text('migration_sql').notNull(),
  rollbackSql: text('rollback_sql'),
  description: text('description'),
  createdBy: uuid('created_by').references(() => users.id), // Who executed this migration
  updateToken: text('_update_token'), // Session token for filtering own changes in Electric sync
  executedAt: timestamp('executed_at').notNull().defaultNow(),
})

// Types for use in application
export type DataTable = typeof dataTables.$inferSelect
export type NewDataTable = typeof dataTables.$inferInsert

export type DataTableColumn = typeof dataTableColumns.$inferSelect
export type NewDataTableColumn = typeof dataTableColumns.$inferInsert

export type TableMigration = typeof tableMigrations.$inferSelect
export type NewTableMigration = typeof tableMigrations.$inferInsert

