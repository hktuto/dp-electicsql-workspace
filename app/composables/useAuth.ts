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
   * Login with email and password
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
   */
  async function logout() {
    isLoading.value = true
    try {
      const { $api } = useNuxtApp()
      await $api('/auth/logout', { method: 'POST' })
      user.value = null
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

