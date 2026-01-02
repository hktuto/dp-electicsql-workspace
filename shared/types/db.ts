import { users, companies, workspaces, companyMembers, dataTables, dataTableColumns, tableMigrations, files } from 'hub:db:schema'

export type User = typeof users.$inferSelect
export type Company = typeof companies.$inferSelect
export type Workspace = typeof workspaces.$inferSelect
export type CompanyMember = typeof companyMembers.$inferSelect
export type DataTable = typeof dataTables.$inferSelect
export type DataTableColumn = typeof dataTableColumns.$inferSelect
export type TableMigration = typeof tableMigrations.$inferSelect
export type File = typeof files.$inferSelect
export type FileOwnerType = 'system' | 'user' | 'workspace' | 'app'

export type MenuItem = {
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

// Re-export data-table types
// export type { ColumnType, ColumnConfig, ValidationRules } from './data-table'