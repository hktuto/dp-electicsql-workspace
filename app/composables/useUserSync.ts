/**
 * User Sync Composable
 * 
 * Syncs the users table from PostgreSQL to PGLite via Electric SQL.
 * 
 * Pattern: Query on demand, subscribe to changes
 * - NO global data refs (data lives in PGLite only)
 * - Components query what they need
 * - Components subscribe to change events to re-query
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
  isSyncing: boolean
  error: string | null
  lastSyncAt: Date | null
}

// Only sync STATE, not data (data lives in PGLite)
const useUserSyncState = () => useState<UserSyncState>('userSyncState', () => ({
  isSyncing: false,
  error: null,
  lastSyncAt: null,
}))

export function useUserSync() {
  const electric = useElectricSync()
  const state = useUserSyncState()

  // ============================================
  // Sync Control
  // ============================================

  const startSync = async () => {
    if (state.value.isSyncing) return

    state.value.isSyncing = true
    state.value.error = null

    try {
      // Sync users (via authenticated proxy)
      await electric.syncShape(
        'users',
        'users',
        '/api/electric/shape?table=users'
      )
      state.value.lastSyncAt = new Date()
    } catch (error) {
      state.value.error = (error as Error).message
      console.error('[useUserSync] Sync failed:', error)
    }
  }

  const stopSync = async () => {
    try {
      await electric.stopShape('users')
      state.value.isSyncing = false
    } catch (error) {
      console.error('[useUserSync] Stop sync failed:', error)
    }
  }

  // ============================================
  // Query Helpers (always fresh from PGLite)
  // ============================================

  const getAll = async (): Promise<User[]> => {
    try {
      return await electric.query<User>('SELECT * FROM users ORDER BY name')
    } catch {
      return []
    }
  }

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

  // ============================================
  // Change Subscriptions
  // ============================================

  type ChangeCallback = (changes: { insert: any[]; update: any[]; delete: any[] }) => void

  const onChange = (callback: ChangeCallback) => {
    return electric.onDataChange('users', callback)
  }

  return {
    // State (sync status only)
    state: readonly(state),

    // Sync control
    startSync,
    stopSync,

    // Queries
    getAll,
    findById,
    findByEmail,

    // Change subscriptions
    onChange,
  }
}
