import type { H3Event } from 'h3'
import { COOKIE_NAME, verifyToken, type JWTPayload } from './jwt'

/**
 * Get the current user from the request cookie
 * Returns null if not authenticated
 */
export async function getCurrentUser(event: H3Event): Promise<JWTPayload | null> {
  const token = getCookie(event, COOKIE_NAME)
  
  if (!token) {
    return null
  }
  
  return verifyToken(token)
}

/**
 * Require authentication - throws 401 if not authenticated
 */
export async function requireAuth(event: H3Event): Promise<JWTPayload> {
  const user = await getCurrentUser(event)
  
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    })
  }
  
  return user
}

/**
 * Require super admin - throws 403 if not super admin
 */
export async function requireSuperAdmin(event: H3Event): Promise<JWTPayload> {
  const user = await requireAuth(event)
  
  if (!user.isSuperAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Super admin access required',
    })
  }
  
  return user
}

/**
 * Get the update token from request headers
 * This token is used to filter out own changes in Electric SQL sync notifications
 * Returns null if not present (optional header)
 */
export function getUpdateToken(event: H3Event): string | null {
  return getHeader(event, 'x-session-token') || null
}

