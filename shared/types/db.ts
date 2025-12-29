import { users, companies, workspaces, companyMembers } from 'hub:db:schema'

export type User = typeof users.$inferSelect
export type Company = typeof companies.$inferSelect
export type Workspace = typeof workspaces.$inferSelect
export type CompanyMember = typeof companyMembers.$inferSelect

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