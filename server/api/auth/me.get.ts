import { eq } from 'drizzle-orm'
import { db } from 'hub:db'
import { users } from '~~/server/db/schema/users'
import { getCurrentUser } from '~~/server/utils/auth'

/**
 * Get current user endpoint
 * GET /api/auth/me
 */
export default defineEventHandler(async (event) => {
  const session = await getCurrentUser(event)

  if (!session) {
    return { user: null }
  }

  // Fetch fresh user data from database
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatar: users.avatar,
      isSuperAdmin: users.isSuperAdmin,
      emailVerifiedAt: users.emailVerifiedAt,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)

  if (!user) {
    // User was deleted, clear cookie
    deleteCookie(event, 'docpal_auth', { path: '/' })
    return { user: null }
  }

  return { user }
})

