interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  isSuperAdmin: boolean
  emailVerifiedAt: string | null
  lastLoginAt: string | null
  createdAt: string
}

interface LoginCredentials {
  email: string
  password: string
}

// Global state using useState for SSR-safe reactivity
const useUser = () => useState<User | null>('authUser', () => null)
const useAuthLoading = () => useState<boolean>('authLoading', () => false)
const useAuthInitialized = () => useState<boolean>('authInitialized', () => false)

// Track init promise at module level (not in state as it's not serializable)
let initPromise: Promise<void> | null = null

export function useAuth() {
  const user = useUser()
  const isLoading = useAuthLoading()
  const isInitialized = useAuthInitialized()
  const isAuthenticated = computed(() => !!user.value)

  /**
   * Initialize auth state - call once on app mount
   * Returns existing promise if already initializing (prevents race conditions)
   * Also syncs system tables if authenticated
   */
  async function init(): Promise<void> {
    if (isInitialized.value) return
    if (initPromise) return initPromise

    initPromise = (async () => {
      isLoading.value = true
      try {
        // Use $fetch directly here since $api plugin may not be ready yet
        const { user: currentUser } = await $fetch<{ user: User | null }>('/api/auth/me')
        user.value = currentUser
        
        // If authenticated, sync system tables
        if (currentUser) {
          syncSystemTablesForUser()
        }
      } catch {
        user.value = null
      } finally {
        isLoading.value = false
        isInitialized.value = true
      }
    })()

    return initPromise
  }

  /**
   * Start system tables sync (non-blocking)
   * Only runs on client side
   * Each composable will handle data readiness independently
   */
  async function syncSystemTablesForUser(): Promise<void> {
    // Only run on client side
    if (import.meta.server) return
    
    try {
      const electricSync = useElectricSync()
      
      // Connect to worker if not already connected
      if (!electricSync.isConnected.value) {
        await electricSync.connect()
        await electricSync.init()
      }
      
      // Check if system data is already ready (persisted state)
      if (electricSync.systemDataReady.value) {
        console.log('[useAuth] System data already ready')
        return
      }
      
      // Start system tables sync (don't wait for completion)
      console.log('[useAuth] Starting system tables sync...')
      electricSync.syncSystemTables()
      console.log('[useAuth] System tables sync started - will notify when ready')
      
      // Note: We don't wait here. Each composable will check systemDataReady
      // and handle loading states independently for better UX
    } catch (error) {
      console.error('[useAuth] Error syncing system tables:', error)
      // Don't throw - allow login to continue even if sync fails
    }
  }

  /**
   * Login with email and password
   * Also syncs system tables after successful login
   */
  async function login(credentials: LoginCredentials) {
    isLoading.value = true
    try {
      const { $api } = useNuxtApp()
      console.log('login', credentials)
      const { user: loggedInUser } = await $api<{ user: User }>('/auth/login', {
        method: 'POST',
        body: credentials,
      })
      user.value = loggedInUser
      
      // Sync system tables after successful login
      await syncSystemTablesForUser()
      
      return { success: true }
    } catch (error: unknown) {
      console.log('login error', error)
      const err = error as { data?: { message?: string } }
      return { 
        success: false, 
        error: err.data?.message || 'Login failed' 
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Logout
   * Note: We keep system data ready flag as true (one-way flag)
   * so next login doesn't need to wait for sync again
   */
  async function logout() {
    isLoading.value = true
    try {
      const { $api } = useNuxtApp()
      await $api('/auth/logout', { method: 'POST' })
      user.value = null
      
      // Note: We intentionally do NOT reset systemDataReady
      // It's a one-way flag that persists across sessions
      // System tables remain in local PGlite for next login
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear user state (called by api plugin on 401)
   */
  function clearUser() {
    user.value = null
  }

  return {
    user: readonly(user),
    isAuthenticated,
    isLoading: readonly(isLoading),
    isInitialized: readonly(isInitialized),
    init,
    login,
    logout,
    clearUser,
  }
}

