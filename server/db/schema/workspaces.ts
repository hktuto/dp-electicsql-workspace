import { pgTable, uuid, text, jsonb, timestamp, unique } from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { users } from './users'

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
  menu: jsonb('menu').$type<MenuItem[]>().default([]).notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  workspaceUsers: uuid('workspace_users').array(), // reference all users in workspace for electric sql
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueSlugPerCompany: unique().on(table.companyId, table.slug),
}))

