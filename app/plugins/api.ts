/**
 * Custom $api plugin
 * 
 * Creates a configured $fetch instance with:
 * - Global error handling (401 → redirect to login)
 * - Automatic base URL
 * - Centralized error events
 * - Option to skip auth redirect
 * - Option to skip all error handling
 * 
 * @see https://nuxt.com/docs/4.x/guide/recipes/custom-usefetch
 */

// Custom headers for error handling control
const SKIP_AUTH_HEADER = 'x-skip-auth-redirect'
const SKIP_ALL_ERRORS_HEADER = 'x-skip-all-errors'
const UPDATE_TOKEN_HEADER = 'x-update-token'

/**
 * Generate a unique, stable session token for this browser tab
 * Format: {timestamp}-{random} (e.g., "1736abc123-def456")
 * 
 * This token:
 * - Is generated once per browser tab session (stable across requests)
 * - Is unique across all browser tabs
 * - Is used to identify which tab made an API change
 * - Allows filtering out own changes from Electric SQL sync notifications
 */
function generateSessionToken(): string {
  // Use timestamp for uniqueness across sessions, plus random string
  // This ensures uniqueness even if Math.random() collides
  const timestamp = Date.now().toString(36)
  const randomPart1 = Math.random().toString(36).substring(2, 10)
  const randomPart2 = Math.random().toString(36).substring(2, 10)
  
  return `${timestamp}-${randomPart1}-${randomPart2}`
}



export default defineNuxtPlugin((nuxtApp) => {
  const sessionToken = generateSessionToken()
  const api = $fetch.create({
    // Base URL for API calls (relative to origin)
    baseURL: '/api',

    // Handle request
    onRequest({ options }) {
      // Add custom headers if needed
      // Note: Auth cookie is automatically sent by browser
      // options.headers = options.headers || {}
      options.headers.set('x-session-token', sessionToken)
    },

    // Handle response errors globally
    async onResponseError({ response, options }) {
      const headers = options.headers as unknown as Record<string, string> | undefined
      
      // Check if we should skip all error handling
      const skipAllErrors = headers?.[SKIP_ALL_ERRORS_HEADER] === 'true'
      if (skipAllErrors) {
        console.debug('[API] Error received, all error handling skipped')
        return
      }

      const status = response.status
      
      // Check if we should skip auth redirect only
      const skipAuthRedirect = headers?.[SKIP_AUTH_HEADER] === 'true'

      // 401 Unauthorized → redirect to login (unless skipped)
      if (status === 401) {
        if (skipAuthRedirect) {
          console.debug('[API] 401 received, auth redirect skipped')
          return
        }
        console.warn('[API] Unauthorized, redirecting to login')
        await nuxtApp.runWithContext(() => navigateTo('/auth/login'))
        return
      }

      // 403 Forbidden
      if (status === 403) {
        console.error('[API] Access denied:', response._data?.message || 'Forbidden')
        nuxtApp.hooks.callHook('app:error', {
          type: 'forbidden',
          message: response._data?.message || 'Access denied',
        })
        return
      }

      // 500+ Server errors
      if (status >= 500) {
        console.error('[API] Server error:', response._data?.message || 'Internal server error')
        nuxtApp.hooks.callHook('app:error', {
          type: 'server',
          message: response._data?.message || 'Internal server error',
        })
        return
      }
    },
  })

  // Expose to useNuxtApp().$api
  return {
    provide: {
      api,
      sessionToken
    },
  }
})

// Export header names for use in composables
export { SKIP_AUTH_HEADER, SKIP_ALL_ERRORS_HEADER }
