import { getCurrentUser } from '~~/server/utils/auth'

/**
 * Auth middleware - attaches user to event context
 * Does NOT block unauthenticated requests (use requireAuth() in handlers for that)
 */

// Routes that skip auth middleware entirely
const SKIP_AUTH_ROUTES = [
  '/api/auth/*',
  '/api/public/*',
  '/api/schema/*', // Schema endpoints for Electric worker
]

// Dev routes that require special header
const DEV_ROUTES = [
  '/api/dev/*',
]

// Dev secret header (change this in production or use env var)
const DEV_SECRET = process.env.DEV_SECRET || 'docpal-dev-secret'
const DEV_HEADER = 'x-dev-secret'

/**
 * Convert glob pattern to regex
 */
function matchRoute(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(path)
  })
}

export default defineEventHandler(async (event) => {
  const path = event.path

  // ⚡ PERFORMANCE: Only run auth middleware on API routes
  // Skip all static assets, pages, and client-side routes
  if (!path.startsWith('/api/')) {
    return
  }

  // Skip auth for certain routes
  if (matchRoute(path, SKIP_AUTH_ROUTES)) {
    return
  }

  // Protect dev routes with secret header
  if (matchRoute(path, DEV_ROUTES)) {
    const secret = getHeader(event, DEV_HEADER)
    
    // In production, always require the secret
    // In development, allow if secret matches OR if no secret is set
    const isProduction = process.env.NODE_ENV === 'production'
    
    if (isProduction && secret !== DEV_SECRET) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'Dev endpoints are not accessible',
      })
    }
    
    // In development, warn if no secret provided but allow
    if (!isProduction && secret !== DEV_SECRET) {
      console.warn(`[DEV] Dev endpoint accessed without secret: ${path}`)
    }
    
    return
  }

  // Attach user to context (if authenticated)
  const user = await getCurrentUser(event)
  event.context.user = user
})
