/**
 * Invite Sync Composable
 * 
 * Syncs the company_invites table from PostgreSQL to PGLite via Electric SQL.
 * Only syncs invites for companies where the user is admin/owner.
 * 
 * Pattern: Query on demand, subscribe to changes
 * - NO global data refs (data lives in PGLite only)
 * - Components query what they need
 * - Components subscribe to change events to re-query
 */

interface CompanyInvite {
  id: string
  company_id: string
  email: string
  role: string
  invite_code: string
  invited_by: string
  accepted_at: string | null
  expires_at: string
  created_at: string
}

interface InviteSyncState {
  isSyncing: boolean
  error: string | null
  lastSyncAt: Date | null
}

// Only sync STATE, not data (data lives in PGLite)
const useInviteSyncState = () => useState<InviteSyncState>('inviteSyncState', () => ({
  isSyncing: false,
  error: null,
  lastSyncAt: null,
}))

export function useInviteSync() {
  const electric = useElectricSync()
  const state = useInviteSyncState()

  // ============================================
  // Sync Control
  // ============================================

  const startSync = async () => {
    if (state.value.isSyncing) return

    state.value.isSyncing = true
    state.value.error = null

    try {
      // Sync company_invites (via authenticated proxy, admin-only filtering)
      await electric.syncShape(
        'company_invites',
        'company_invites',
        '/api/electric/shape?table=company_invites'
      )
      state.value.lastSyncAt = new Date()
    } catch (error) {
      state.value.error = (error as Error).message
      console.error('[useInviteSync] Sync failed:', error)
    }
  }

  const stopSync = async () => {
    try {
      await electric.stopShape('company_invites')
      state.value.isSyncing = false
    } catch (error) {
      console.error('[useInviteSync] Stop sync failed:', error)
    }
  }

  // ============================================
  // Query Helpers (always fresh from PGLite)
  // ============================================

  const getAll = async (): Promise<CompanyInvite[]> => {
    try {
      return await electric.query<CompanyInvite>(
        'SELECT * FROM company_invites WHERE accepted_at IS NULL ORDER BY created_at DESC'
      )
    } catch {
      return []
    }
  }

  const getForCompany = async (companyId: string): Promise<CompanyInvite[]> => {
    try {
      return await electric.query<CompanyInvite>(
        'SELECT * FROM company_invites WHERE company_id = $1 AND accepted_at IS NULL ORDER BY created_at DESC',
        [companyId]
      )
    } catch {
      return []
    }
  }

  const findById = async (id: string): Promise<CompanyInvite | null> => {
    try {
      const result = await electric.query<CompanyInvite>(
        'SELECT * FROM company_invites WHERE id = $1',
        [id]
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
    return electric.onDataChange('company_invites', callback)
  }

  return {
    // State (sync status only)
    state: readonly(state),

    // Sync control
    startSync,
    stopSync,

    // Queries
    getAll,
    getForCompany,
    findById,

    // Change subscriptions
    onChange,
  }
}
