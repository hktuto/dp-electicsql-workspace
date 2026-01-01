/**
 * Workspace Sync Composable
 * 
 * Query builder for the workspaces table (auto-synced on login).
 * 
 * Pattern: Query on demand, subscribe to changes
 * - NO sync control (workspaces table is auto-synced as a system table)
 * - NO global data refs (data lives in PGlite only)
 * - Components query what they need
 * - Components subscribe to change events to re-query
 */
import type { MenuItem, Workspace } from '#shared/types/db'


export function useWorkspaceSync() {
  const electric = useElectricSync()

  // ============================================
  // Sync Status (read-only, from central state)
  // ============================================

  const isUpToDate = computed(() => electric.isTableUpToDate('workspaces'))

  // ============================================
  // Query Helpers (always fresh from PGlite)
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
    // Sync status (read-only)
    isUpToDate,

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

