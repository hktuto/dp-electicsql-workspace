# Phase 2.0: Company Management

## Goals

- Super admin can create companies
- Company members management
- Company basic CRUD

---

## Tasks

- [ ] Create companies and company_members tables
- [ ] Create company CRUD API endpoints
- [ ] Create member management API endpoints
- [ ] Setup Electric SQL shapes for companies
- [ ] Create company list/create UI (super admin)
- [ ] Create company settings UI
- [ ] Create member management UI
- [ ] Setup company-scoped middleware

---

## Database Schema

```typescript
// server/db/schema/companies.ts
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  description: text('description'),
  companyUsers: uuid('company_users').array(), // For Electric SQL shape filtering
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const companyMembers = pgTable('company_members', {
  id: uuid('id').primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'owner', 'admin', 'member'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueMember: unique().on(table.companyId, table.userId),
}))
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/companies` | Create company (super admin) |
| PUT | `/api/companies/:id` | Update company |
| DELETE | `/api/companies/:id` | Delete company |
| POST | `/api/companies/:id/members` | Add member to company |
| PUT | `/api/companies/:id/members/:userId` | Update member role |
| DELETE | `/api/companies/:id/members/:userId` | Remove member |

---

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/company/:slug` | `CompanySettings.vue` | Company settings (includes members) |

Note: No admin-specific routes. Access is controlled by user permissions.

---

## Completion Criteria

- [ ] Super admin can create companies
- [ ] Super admin can manage company members
- [ ] Company data syncs to frontend
- [ ] Company-scoped middleware works

