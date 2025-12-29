# Phase 1.0: Foundation - Auth & User

## Goals

- User authentication (email/password)
- Session management
- Admin seed script
- Electric SQL shape for users

---

## Tasks

- [ ] Create users table schema
- [ ] Implement password hashing (bcrypt/argon2)
- [ ] Create login/logout API endpoints
- [ ] Setup session management (JWT or server sessions)
- [ ] Create seed script for super admin
- [ ] Setup Electric SQL shape for users
- [ ] Create login page UI component
- [ ] Setup auth middleware

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

- [ ] User can login with email/password
- [ ] User can logout
- [ ] Super admin exists via seed
- [ ] Auth middleware protects routes
- [ ] User data syncs to frontend via Electric SQL

