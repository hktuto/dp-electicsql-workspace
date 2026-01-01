/**
 * User Sync Composable
 * 
 * Query builder for the users table (auto-synced on login).
 * 
 * Pattern: Query on demand, subscribe to changes
 * - NO sync control (users table is auto-synced as a system table)
 * - NO global data refs (data lives in PGlite only)
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

export function useUserSync() {
  const electric = useElectricSync()

  // ============================================
  // Sync Status (read-only, from central state)
  // ============================================

  const isUpToDate = computed(() => electric.isTableUpToDate('users'))

  // ============================================
  // Query Helpers (always fresh from PGlite)
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
    // Sync status (read-only)
    isUpToDate,

    // Queries
    getAll,
    findById,
    findByEmail,

    // Change subscriptions
    onChange,
  }
}
