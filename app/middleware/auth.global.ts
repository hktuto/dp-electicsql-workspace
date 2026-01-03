/**
 * Global auth middleware
 * Runs on every route change (client-side)
 */

// Protected routes that require authentication
// Supports glob patterns: * matches any characters
const PROTECTED_ROUTES = [
  '/admin/*',
  '/system/*',
]

/**
 * Convert glob pattern to regex
 * e.g., '/admin/*' → /^\/admin\/.*$/
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
  const { start, finish } = useLoadingIndicator()
  start({
    force: true,
  })

  const isProtectedRoute = matchRoute(to.path, PROTECTED_ROUTES)
  const { init, isAuthenticated, isInitialized } = useAuth()
  // Skip auth check for non-protected routes
  if (!isProtectedRoute) {
    if (!isInitialized.value) {
      console.log('initialize auth state')
      init()
    }
    console.log('finish loading public route')
    finish()
    return
  }
  // following logic MUST need to check auth
  // Initialize auth state if not already done
  if (!isInitialized.value) {
    console.log('initialize auth state')
    await init()
  }

  // Redirect unauthenticated users to login for protected routes
  if (!isAuthenticated.value) {
    console.log('redirect to login')
    finish()
    return navigateTo('/auth/login')
  }

  // Initialize company context for authenticated users
  if (isAuthenticated.value) {

  }
  finish()
})
