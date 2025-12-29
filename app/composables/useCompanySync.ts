/**
 * Company Sync Composable
 * 
 * Syncs the companies and company_members tables from PostgreSQL to PGLite via Electric SQL.
 * 
 * Pattern: Query on demand, subscribe to changes
 * - NO global data refs (data lives in PGLite only)
 * - Components query what they need
 * - Components subscribe to change events to re-query
 */

interface Company {
  id: string
  name: string
  slug: string
  logo: string | null
  description: string | null
  company_users: string[]
  created_by: string
  created_at: string
  updated_at: string
}

interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role: string
  created_at: string
  updated_at: string
}

interface CompanySyncState {
  isSyncing: boolean
  error: string | null
  lastSyncAt: Date | null
}

// Only sync STATE, not data (data lives in PGLite)
const useCompanySyncState = () => useState<CompanySyncState>('companySyncState', () => ({
  isSyncing: false,
  error: null,
  lastSyncAt: null,
}))

export function useCompanySync() {
  const electric = useElectricSync()
  const state = useCompanySyncState()

  // ============================================
  // Sync Control
  // ============================================

  const startSync = async () => {
    if (state.value.isSyncing) return

    state.value.isSyncing = true
    state.value.error = null

    try {
      // Sync companies (via authenticated proxy)
      await electric.syncShape(
        'companies',
        'companies',
        '/api/electric/shape?table=companies'
      )
      
      // Sync company_members (via authenticated proxy)
      await electric.syncShape(
        'company_members',
        'company_members',
        '/api/electric/shape?table=company_members'
      )
      
      state.value.lastSyncAt = new Date()
    } catch (error) {
      state.value.error = (error as Error).message
      console.error('[useCompanySync] Sync failed:', error)
    }
  }

  const stopSync = async () => {
    try {
      await electric.stopShape('companies')
      await electric.stopShape('company_members')
      state.value.isSyncing = false
    } catch (error) {
      console.error('[useCompanySync] Stop sync failed:', error)
    }
  }

  // ============================================
  // Query Helpers (always fresh from PGLite)
  // ============================================

  const getAll = async (): Promise<Company[]> => {
    try {
      return await electric.query<Company>('SELECT * FROM companies ORDER BY name')
    } catch {
      return []
    }
  }

  const findById = async (id: string): Promise<Company | null> => {
    try {
      const result = await electric.query<Company>(
        'SELECT * FROM companies WHERE id = $1',
        [id]
      )
      return result[0] || null
    } catch {
      return null
    }
  }

  const findBySlug = async (slug: string): Promise<Company | null> => {
    try {
      const result = await electric.query<Company>(
        'SELECT * FROM companies WHERE slug = $1',
        [slug]
      )
      return result[0] || null
    } catch {
      return null
    }
  }

  // ============================================
  // Member Query Helpers
  // ============================================

  const getAllMembers = async (): Promise<CompanyMember[]> => {
    try {
      return await electric.query<CompanyMember>('SELECT * FROM company_members')
    } catch {
      return []
    }
  }

  const getMembersForCompany = async (companyId: string): Promise<CompanyMember[]> => {
    try {
      return await electric.query<CompanyMember>(
        'SELECT * FROM company_members WHERE company_id = $1',
        [companyId]
      )
    } catch {
      return []
    }
  }

  const getCompaniesForUser = async (userId: string): Promise<Company[]> => {
    try {
      return await electric.query<Company>(
        `SELECT c.* FROM companies c 
         INNER JOIN company_members cm ON c.id = cm.company_id 
         WHERE cm.user_id = $1
         ORDER BY c.name`,
        [userId]
      )
    } catch {
      return []
    }
  }

  const getUserRole = async (companyId: string, userId: string): Promise<string | null> => {
    try {
      const result = await electric.query<CompanyMember>(
        'SELECT role FROM company_members WHERE company_id = $1 AND user_id = $2',
        [companyId, userId]
      )
      return result[0]?.role || null
    } catch {
      return null
    }
  }

  // ============================================
  // Change Subscriptions
  // ============================================

  type ChangeCallback = (changes: { insert: any[]; update: any[]; delete: any[] }) => void

  const onCompanyChange = (callback: ChangeCallback) => {
    return electric.onDataChange('companies', callback)
  }

  const onMemberChange = (callback: ChangeCallback) => {
    return electric.onDataChange('company_members', callback)
  }

  return {
    // State (sync status only)
    state: readonly(state),

    // Sync control
    startSync,
    stopSync,

    // Company queries
    getAll,
    findById,
    findBySlug,

    // Member queries
    getAllMembers,
    getMembersForCompany,
    getCompaniesForUser,
    getUserRole,

    // Change subscriptions
    onCompanyChange,
    onMemberChange,
  }
}
