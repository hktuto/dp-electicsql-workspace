/**
 * Global auth middleware
 * Runs on every route change (client-side)
 */

// Public routes that don't require authentication
// Supports glob patterns: * matches any characters
const PUBLIC_ROUTES = [
  '/auth/*',
  '/public/*',
  '/dev/*',  // Dev pages (remove in production)
]

// Routes that authenticated users shouldn't access (redirect to home)
const GUEST_ONLY_ROUTES = [
  '/auth/login',
]

/**
 * Convert glob pattern to regex
 * e.g., '/auth/*' → /^\/auth\/.*$/
 */
function matchRoute(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
      .replace(/\*/g, '.*') // Convert * to .*
    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(path)
  })
}

export default defineNuxtRouteMiddleware(async (to) => {
  // Only run on client
  if (import.meta.server) return

  const isPublicRoute = matchRoute(to.path, PUBLIC_ROUTES)

  // Skip auth check for public routes
  if (isPublicRoute) {
    return
  }

  const { init, isAuthenticated, isInitialized } = useAuth()

  // Initialize auth state if not already done
  if (!isInitialized.value) {
    await init()
  }

  const isGuestOnlyRoute = matchRoute(to.path, GUEST_ONLY_ROUTES)

  // Redirect authenticated users away from guest-only routes (like login)
  if (isAuthenticated.value && isGuestOnlyRoute) {
    return navigateTo('/')
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated.value) {
    return navigateTo('/auth/login')
  }
})
