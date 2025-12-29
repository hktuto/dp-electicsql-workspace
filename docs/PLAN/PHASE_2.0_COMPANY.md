# Phase 2.0: Company Management

## Goals

- Company CRUD operations
- Company context (current company in session)
- Company settings page
- Company invites (magic link)
- Electric SQL row-level filtering

---

## Tasks

- [x] Add company invites table schema
- [x] Create company context composable (useCompanyContext)
- [x] Create company API endpoints (CRUD)
- [x] Create invite API endpoints
- [x] Add Electric SQL WHERE filtering in proxy
- [x] Create company settings page UI
- [x] Create company list/selector UI (in HomePage)
- [x] Update sync composables with filtering

---

## Database Schema

### Existing Tables
- `companies` - Already created in Phase 1
- `company_members` - Already created in Phase 1

### New Table: Company Invites

```typescript
// server/db/schema/company-invites.ts
export const companyInvites = pgTable('company_invites', {
  id: uuid('id').primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull(), // 'admin', 'member'
  inviteCode: text('invite_code').notNull().unique(),
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  acceptedAt: timestamp('accepted_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/companies` | List user's companies | Required |
| POST | `/api/companies` | Create company (super admin only) | Super Admin |
| GET | `/api/companies/:slug` | Get company details | Company Member |
| PUT | `/api/companies/:slug` | Update company | Company Owner/Admin |
| DELETE | `/api/companies/:slug` | Delete company | Company Owner |
| GET | `/api/companies/:slug/members` | List company members | Company Member |
| POST | `/api/companies/:slug/members` | Add member directly | Company Admin |
| PUT | `/api/companies/:slug/members/:id` | Update member role | Company Admin |
| DELETE | `/api/companies/:slug/members/:id` | Remove member | Company Admin |
| POST | `/api/companies/:slug/invites` | Create invite | Company Admin |
| GET | `/api/companies/:slug/invites` | List pending invites | Company Admin |
| DELETE | `/api/companies/:slug/invites/:id` | Cancel invite | Company Admin |
| GET | `/api/public/invite/:code` | Get invite details | Public |
| POST | `/api/public/invite/:code/accept` | Accept invite | Authenticated |

---

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `HomePage.vue` | Shows company list/selector |
| `/company/:slug` | `CompanySettings.vue` | Company settings page |
| `/auth/invited` | `InvitedPage.vue` | Invited user landing page |

---

## Company Context

```typescript
// app/composables/useCompanyContext.ts
export function useCompanyContext() {
  const currentCompanyId = useCookie('current_company_id')
  const currentCompany = ref<Company | null>(null)
  const userRole = ref<string | null>(null)
  
  // Switch company context
  const setCompany = async (companyId: string) => { ... }
  
  // Check permissions
  const canManageCompany = computed(() => ['owner', 'admin'].includes(userRole.value))
  const isOwner = computed(() => userRole.value === 'owner')
  
  return { currentCompany, userRole, setCompany, canManageCompany, isOwner }
}
```

---

## Electric SQL Filtering

Update `/api/electric/shape` to filter by user's companies:

```typescript
// For company_members - only show memberships user has access to
if (table === 'company_members' && user && !user.isSuperAdmin) {
  const userCompanyIds = await getUserCompanyIds(user.id)
  originUrl.searchParams.set('where', `company_id IN ('${userCompanyIds.join("','")}')`)
}

// For companies - only show companies user belongs to
if (table === 'companies' && user && !user.isSuperAdmin) {
  const userCompanyIds = await getUserCompanyIds(user.id)
  originUrl.searchParams.set('where', `id IN ('${userCompanyIds.join("','")}')`)
}
```

---

## Completion Criteria

- [x] Super admin can create new company
- [x] Company owner can update company settings
- [x] Company admin can invite users via email
- [x] Invited users can accept via magic link
- [x] Users only see companies they belong to (Electric SQL filtering)
- [x] Company context persists across pages

---

## Implementation Order

1. Company invites schema + migration
2. Company context composable
3. Company CRUD APIs
4. Invite APIs
5. Electric SQL filtering
6. Company settings page UI
7. Company selector in home page
8. Invite acceptance flow

---

## Completed: 2024-12-29

### Implementation Notes

- **Schema**: Added `company_invites` table with 7-day expiry
- **Electric SQL Filtering**: Non-super-admin users only see their companies' data
- **Invite Flow**: Magic link with code, supports both existing and new users
- **Company Context**: Cookie-based persistence with `useCompanyContext` composable

### Key Files

- `server/db/schema/company-invites.ts` - Invite schema
- `server/api/companies/*.ts` - Company CRUD endpoints
- `server/api/companies/[slug]/invites/*.ts` - Invite endpoints
- `server/api/public/invite/[code].ts` - Public invite acceptance
- `server/api/electric/shape.get.ts` - Electric proxy with WHERE filtering
- `app/composables/useCompanyContext.ts` - Company context management
- `app/pages/company/[slug].vue` - Company settings page
- `app/components/global/HomePage.vue` - Updated with company list
