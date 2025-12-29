# Phase 7.0: User Invites & Permissions

## Goals

- Magic link invitations
- Workspace roles and permissions
- Table/view/dashboard permissions

---

## Tasks

- [ ] Create invite and permission tables
- [ ] Implement magic link generation and email sending
- [ ] Create invite acceptance flow
- [ ] Implement role CRUD API
- [ ] Implement permission assignment API
- [ ] Create user_permission_lookup sync trigger
- [ ] Create invite management UI
- [ ] Create role management UI
- [ ] Create permission assignment UI
- [ ] Implement permission checking middleware

---

## Database Schema

```typescript
// server/db/schema/invites.ts
export const companyInvites = pgTable('company_invites', {
  id: uuid('id').primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  acceptedAt: timestamp('accepted_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// server/db/schema/permissions.ts
export const workspaceRoles = pgTable('workspace_roles', {
  id: uuid('id').primaryKey(),
  label: text('label').notNull(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  permissions: integer('permissions').notNull(), // Bitwise permissions
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueLabelPerWorkspace: unique().on(table.workspaceId, table.label),
}))

export const workspaceMemberRoles = pgTable('workspace_member_roles', {
  id: uuid('id').primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => workspaceRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqueMemberRole: unique().on(table.workspaceId, table.userId),
}))

export const resourcePermissions = pgTable('resource_permissions', {
  id: uuid('id').primaryKey(),
  resourceType: text('resource_type').notNull(), // 'table' | 'view' | 'dashboard'
  resourceId: uuid('resource_id').notNull(),
  roleId: uuid('role_id').notNull().references(() => workspaceRoles.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  permissions: integer('permissions').notNull(), // Bitwise: 1=read, 2=write, 4=manage, 8=delete
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// User permission lookup for Electric SQL shapes
export const userPermissionLookup = pgTable('user_permission_lookup', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  companies: uuid('companies').array(),
  workspaces: uuid('workspaces').array(),
  tables: uuid('tables').array(),
  views: uuid('views').array(),
  dashboards: uuid('dashboards').array(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

---

## Permission Bits

```typescript
export const PERMISSIONS = {
  READ: 1,    // 0001
  WRITE: 2,   // 0010
  MANAGE: 4,  // 0100
  DELETE: 8,  // 1000
} as const

// Helper functions
export const hasPermission = (userPerms: number, required: number) => (userPerms & required) === required
export const combinePermissions = (...perms: number[]) => perms.reduce((a, b) => a | b, 0)
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/companies/:id/invites` | Send invite |
| GET | `/api/invites/:code` | Get invite details |
| POST | `/api/invites/:code/accept` | Accept invite |
| POST | `/api/workspaces/:id/roles` | Create role |
| PUT | `/api/workspaces/:id/roles/:roleId` | Update role |
| DELETE | `/api/workspaces/:id/roles/:roleId` | Delete role |
| PUT | `/api/workspaces/:id/members/:userId/role` | Assign role |
| PUT | `/api/resources/:type/:id/permissions` | Set resource permissions |

---

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/auth/invited` | - | Accept invite landing page |

Note: Invite management and role management are part of company/workspace settings pages.

---

## Completion Criteria

- [ ] Magic link invites work
- [ ] Roles can be created/edited
- [ ] Permissions control access
- [ ] user_permission_lookup updates automatically

