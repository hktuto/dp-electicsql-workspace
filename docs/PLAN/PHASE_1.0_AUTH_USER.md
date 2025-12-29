# Phase 1.0: Foundation - Auth & User

## Goals

- User authentication (email/password)
- Session management
- Admin seed script
- Electric SQL shape for users

---

## Tasks

- [x] Create users table schema
- [x] Implement password hashing (bcrypt)
- [x] Create login/logout API endpoints
- [x] Setup session management (JWT + HTTP-only cookies)
- [x] Create seed script for super admin
- [x] Setup Electric SQL shape for users (dynamic schema generation)
- [x] Create login page UI component
- [x] Setup auth middleware (client + server)

---

## Database Schema

```typescript
// server/db/schema/users.ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatar: text('avatar'),
  password: text('password').notNull(),
  isSuperAdmin: boolean('is_super_admin').notNull().default(false),
  emailVerifiedAt: timestamp('email_verified_at'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/logout` | Logout, clear session |
| GET | `/api/auth/me` | Get current user (for initial load) |
| PUT | `/api/auth/profile` | Update user profile |
| PUT | `/api/auth/password` | Change password |

---

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/auth/login` | - | Login page (standard page, no dock) |
| `/auth/invited` | - | Invited user landing page |
| `/auth/reset_password` | - | Reset password page |
| `/auth/forget_password` | - | Forget password page |
| `/` | `UserHome.vue` | User home dashboard |

---

## Seed Script

```typescript
// server/db/seed.ts
async function seedSuperAdmin() {
  const hashedPassword = await hashPassword('your-secure-password')
  await db.insert(users).values({
    id: generateUUID(),
    email: 'admin@docpal.app',
    name: 'Super Admin',
    password: hashedPassword,
    isSuperAdmin: true,
    emailVerifiedAt: new Date(),
  })
}
```

---

## Completion Criteria

- [x] User can login with email/password
- [x] User can logout
- [x] Super admin exists via seed
- [x] Auth middleware protects routes
- [x] User data syncs to frontend via Electric SQL

---

## Completed: 2024-12-29

### Implementation Notes

- **Auth**: JWT tokens stored in HTTP-only cookies (30 days expiry)
- **Password**: bcrypt with 10 salt rounds
- **Client Middleware**: `app/middleware/auth.global.ts` - protects routes, redirects to login
- **Server Middleware**: `server/middleware/00.auth.ts` - attaches user to context
- **Custom API**: `app/plugins/api.ts` with `skipAuthRedirect` and `skipAllErrors` options
- **Electric Schema**: Dynamic schema generation from PostgreSQL (`/api/schema/tables`)

### Key Files
- `server/utils/jwt.ts` - JWT sign/verify
- `server/utils/auth.ts` - getCurrentUser, requireAuth helpers
- `app/composables/useAuth.ts` - Frontend auth state
- `app/composables/useAPI.ts` - Custom $api wrapper

### Electric SQL Proxy (Added 2024-12-29)

Implemented authenticated Electric SQL proxy at `/api/electric/shape`:
- Requires authentication for protected tables (users, companies, company_members)
- Forwards Electric protocol params (offset, handle, live, etc.)
- Sets `Vary: Cookie, Authorization` for cache isolation
- WHERE filtering deferred to Phase 2 (needs company context)

### Sync Composables (Added 2024-12-29)

Created domain-based sync composables:
- `app/composables/useUserSync.ts` - Syncs users table
- `app/composables/useCompanySync.ts` - Syncs companies & company_members tables

Both composables:
- Use authenticated proxy endpoint
- Provide reactive data from PGLite
- Auto-reload on data changes
- Include finder methods (findById, findBySlug, etc.)

