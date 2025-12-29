import { COOKIE_NAME } from '~~/server/utils/jwt'

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
export default defineEventHandler(async (event) => {
  // Clear the auth cookie
  deleteCookie(event, COOKIE_NAME, {
    path: '/',
  })

  return { success: true }
})

