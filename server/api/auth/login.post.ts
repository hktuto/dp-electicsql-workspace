import { eq } from 'drizzle-orm'
import { db } from 'hub:db'
import { users } from '~~/server/db/schema/users'
import { verifyPassword } from '~~/server/utils/password'
import { signToken, getAuthCookieOptions, COOKIE_NAME } from '~~/server/utils/jwt'

/**
 * Login endpoint
 * POST /api/auth/login
 * Body: { email: string, password: string }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; password: string }>(event)

  if (!body.email || !body.password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Email and password are required',
    })
  }

  // Find user by email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email.toLowerCase().trim()))
    .limit(1)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid email or password',
    })
  }

  // Verify password
  const isValid = await verifyPassword(body.password, user.password)

  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid email or password',
    })
  }

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id))

  // Generate JWT
  const token = await signToken({
    userId: user.id,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
  })

  // Set cookie
  setCookie(event, COOKIE_NAME, token, getAuthCookieOptions())

  // Return user info (without password)
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      isSuperAdmin: user.isSuperAdmin,
    },
  }
})

