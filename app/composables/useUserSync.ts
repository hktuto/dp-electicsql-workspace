/**
 * User Sync Composable
 * 
 * Syncs the users table from PostgreSQL to PGLite via Electric SQL.
 * Uses the proxy endpoint for authenticated access.
 */

interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  is_super_admin: boolean
  email_verified_at: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

interface UserSyncState {
  isLoading: boolean
  isSyncing: boolean
  error: string | null
  lastSyncAt: Date | null
}

// Global state using useState for SSR-safe reactivity
const useUserSyncState = () => useState<UserSyncState>('userSyncState', () => ({
  isLoading: false,
  isSyncing: false,
  error: null,
  lastSyncAt: null,
}))
const useSyncedUsers = () => useState<User[]>('syncedUsers', () => [])

export function useUserSync() {
  const electric = useElectricSync()
  const config = useRuntimeConfig()
  
  // Use direct Electric URL for live sync (proxy breaks long-polling)
  const electricUrl = config.public.electricUrl || 'http://localhost:30000'
  
  const state = useUserSyncState()
  const users = useSyncedUsers()

  // Start syncing users table
  const startSync = async () => {
    if (state.value.isSyncing) return

    state.value.isSyncing = true
    state.value.error = null

    try {
      // Use direct Electric URL for live sync
      // TODO: For production, implement streaming proxy with auth
      await electric.syncShape(
        'users',
        'users',
        `${electricUrl}/v1/shape?table=users`
      )
      state.value.lastSyncAt = new Date()
    } catch (error) {
      state.value.error = (error as Error).message
      console.error('[useUserSync] Sync failed:', error)
    }
  }

  // Stop syncing
  const stopSync = async () => {
    try {
      await electric.stopShape('users')
      state.value.isSyncing = false
    } catch (error) {
      console.error('[useUserSync] Stop sync failed:', error)
    }
  }

  // Load users from PGLite
  const load = async () => {
    state.value.isLoading = true
    state.value.error = null

    try {
      const result = await electric.query<User>(
        'SELECT id, email, name, avatar, is_super_admin, email_verified_at, last_login_at, created_at, updated_at FROM users'
      )
      users.value = result
    } catch (error) {
      // Table might not exist yet
      users.value = []
      console.warn('[useUserSync] Failed to load users:', error)
    } finally {
      state.value.isLoading = false
    }
  }

  // Find user by ID
  const findById = async (id: string): Promise<User | null> => {
    try {
      const result = await electric.query<User>(
        'SELECT * FROM users WHERE id = $1',
        [id]
      )
      return result[0] || null
    } catch {
      return null
    }
  }

  // Find user by email
  const findByEmail = async (email: string): Promise<User | null> => {
    try {
      const result = await electric.query<User>(
        'SELECT * FROM users WHERE email = $1',
        [email]
      )
      return result[0] || null
    } catch {
      return null
    }
  }

  // Listen for changes
  const unsubscribe = electric.onDataChange('users', (changes) => {
    console.log('[useUserSync] Changes detected:', {
      insert: changes.insert.length,
      update: changes.update.length,
      delete: changes.delete.length,
    })
    // Reload data on any change
    load()
  })

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribe()
  })

  return {
    // State
    state: readonly(state),
    users: readonly(users),
    
    // Methods
    startSync,
    stopSync,
    load,
    findById,
    findByEmail,
  }
}

