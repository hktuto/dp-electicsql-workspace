/**
 * Invite Sync Composable
 * 
 * Syncs the company_invites table from PostgreSQL to PGLite via Electric SQL.
 * Only syncs invites for companies where the user is admin/owner.
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
  isLoading: boolean
  isSyncing: boolean
  error: string | null
  lastSyncAt: Date | null
}

// Global state using useState for SSR-safe reactivity
const useInviteSyncState = () => useState<InviteSyncState>('inviteSyncState', () => ({
  isLoading: false,
  isSyncing: false,
  error: null,
  lastSyncAt: null,
}))
const useSyncedInvites = () => useState<CompanyInvite[]>('syncedInvites', () => [])

export function useInviteSync() {
  const electric = useElectricSync()
  const config = useRuntimeConfig()
  
  // Use direct Electric URL for live sync (proxy breaks long-polling)
  const electricUrl = config.public.electricUrl || 'http://localhost:30000'
  
  const state = useInviteSyncState()
  const invites = useSyncedInvites()

  // Start syncing invites table
  const startSync = async () => {
    if (state.value.isSyncing) return

    state.value.isSyncing = true
    state.value.error = null

    try {
      // Use direct Electric URL for live sync
      // TODO: For production, implement streaming proxy with auth
      await electric.syncShape(
        'company_invites',
        'company_invites',
        `${electricUrl}/v1/shape?table=company_invites`
      )
      state.value.lastSyncAt = new Date()
    } catch (error) {
      state.value.error = (error as Error).message
      console.error('[useInviteSync] Sync failed:', error)
    }
  }

  // Stop syncing
  const stopSync = async () => {
    try {
      await electric.stopShape('company_invites')
      state.value.isSyncing = false
    } catch (error) {
      console.error('[useInviteSync] Stop sync failed:', error)
    }
  }

  // Load invites from PGLite
  const load = async () => {
    state.value.isLoading = true
    state.value.error = null

    try {
      const result = await electric.query<CompanyInvite>(
        'SELECT * FROM company_invites WHERE accepted_at IS NULL ORDER BY created_at DESC'
      )
      invites.value = result
    } catch (error) {
      invites.value = []
      console.warn('[useInviteSync] Failed to load invites:', error)
    } finally {
      state.value.isLoading = false
    }
  }

  // Get pending invites for a company
  const getInvitesForCompany = async (companyId: string): Promise<CompanyInvite[]> => {
    try {
      return await electric.query<CompanyInvite>(
        'SELECT * FROM company_invites WHERE company_id = $1 AND accepted_at IS NULL ORDER BY created_at DESC',
        [companyId]
      )
    } catch {
      return []
    }
  }

  // Find invite by ID
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

  // Listen for changes
  const unsubscribe = electric.onDataChange('company_invites', (changes) => {
    console.log('[useInviteSync] Changes detected:', {
      insert: changes.insert.length,
      update: changes.update.length,
      delete: changes.delete.length,
    })
    load()
  })

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribe()
  })

  return {
    // State
    state: readonly(state),
    invites: readonly(invites),
    
    // Methods
    startSync,
    stopSync,
    load,
    getInvitesForCompany,
    findById,
  }
}

