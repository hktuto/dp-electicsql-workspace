/**
 * Workspace Sync Composable
 * 
 * Syncs the workspaces table from PostgreSQL to PGLite via Electric SQL.
 * 
 * Pattern: Query on demand, subscribe to changes
 * - NO global data refs (data lives in PGLite only)
 * - Components query what they need
 * - Components subscribe to change events to re-query
 */

export interface MenuItem {
  id: string
  label: string
  slug: string
  type: 'folder' | 'table' | 'view' | 'dashboard'
  itemId?: string
  description?: string
  children?: MenuItem[]
  order: number
  viewId?: string
  tableId?: string
  tableSlug?: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  icon: string | null
  description: string | null
  menu: MenuItem[]
  company_id: string
  workspace_users: string[]
  created_by: string
  created_at: string
  updated_at: string
}

interface WorkspaceSyncState {
  isSyncing: boolean
  error: string | null
  lastSyncAt: Date | null
}

// Only sync STATE, not data (data lives in PGLite)
const useWorkspaceSyncState = () => useState<WorkspaceSyncState>('workspaceSyncState', () => ({
  isSyncing: false,
  error: null,
  lastSyncAt: null,
}))

export function useWorkspaceSync() {
  const electric = useElectricSync()
  const state = useWorkspaceSyncState()

  // ============================================
  // Sync Control
  // ============================================

  const startSync = async () => {
    if (state.value.isSyncing) return

    state.value.isSyncing = true
    state.value.error = null

    try {
      // Sync workspaces (via authenticated proxy)
      await electric.syncShape(
        'workspaces',
        'workspaces',
        '/api/electric/shape?table=workspaces'
      )
      
      state.value.lastSyncAt = new Date()
    } catch (error) {
      state.value.error = (error as Error).message
      console.error('[useWorkspaceSync] Sync failed:', error)
    }
  }

  const stopSync = async () => {
    try {
      await electric.stopShape('workspaces')
      state.value.isSyncing = false
    } catch (error) {
      console.error('[useWorkspaceSync] Stop sync failed:', error)
    }
  }

  // ============================================
  // Query Helpers (always fresh from PGLite)
  // ============================================

  const getAll = async (): Promise<Workspace[]> => {
    try {
      return await electric.query<Workspace>('SELECT * FROM workspaces ORDER BY name')
    } catch {
      return []
    }
  }

  const findById = async (id: string): Promise<Workspace | null> => {
    try {
      const result = await electric.query<Workspace>(
        'SELECT * FROM workspaces WHERE id = $1',
        [id]
      )
      return result[0] || null
    } catch {
      return null
    }
  }

  const findBySlug = async (companyId: string, slug: string): Promise<Workspace | null> => {
    try {
      const result = await electric.query<Workspace>(
        'SELECT * FROM workspaces WHERE company_id = $1 AND slug = $2',
        [companyId, slug]
      )
      return result[0] || null
    } catch {
      return null
    }
  }

  const getByCompanyId = async (companyId: string): Promise<Workspace[]> => {
    try {
      return await electric.query<Workspace>(
        'SELECT * FROM workspaces WHERE company_id = $1 ORDER BY name',
        [companyId]
      )
    } catch {
      return []
    }
  }

  const getByUserId = async (userId: string): Promise<Workspace[]> => {
    try {
      return await electric.query<Workspace>(
        `SELECT * FROM workspaces WHERE $1 = ANY(workspace_users) ORDER BY name`,
        [userId]
      )
    } catch {
      return []
    }
  }

  // ============================================
  // Change Subscriptions
  // ============================================

  type ChangeCallback = (changes: { insert: any[]; update: any[]; delete: any[] }) => void

  const onChange = (callback: ChangeCallback) => {
    return electric.onDataChange('workspaces', callback)
  }

  return {
    // State (sync status only)
    state: readonly(state),

    // Sync control
    startSync,
    stopSync,

    // Workspace queries
    getAll,
    findById,
    findBySlug,
    getByCompanyId,
    getByUserId,

    // Change subscriptions
    onChange,
  }
}

