/**
 * Company Sync Composable
 * 
 * Syncs the companies and company_members tables from PostgreSQL to PGLite via Electric SQL.
 * Uses the proxy endpoint for authenticated access.
 */

interface Company {
  id: string
  name: string
  slug: string
  logo: string | null
  description: string | null
  company_users: number
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
  isLoading: boolean
  isSyncing: boolean
  error: string | null
  lastSyncAt: Date | null
}

export function useCompanySync() {
  const electric = useElectricSync()
  
  const state = ref<CompanySyncState>({
    isLoading: false,
    isSyncing: false,
    error: null,
    lastSyncAt: null,
  })

  const companies = ref<Company[]>([])
  const companyMembers = ref<CompanyMember[]>([])

  // Start syncing both tables
  const startSync = async () => {
    if (state.value.isSyncing) return

    state.value.isSyncing = true
    state.value.error = null

    try {
      // Sync companies
      await electric.syncShape(
        'companies',
        'companies',
        '/api/electric/shape?table=companies'
      )
      
      // Sync company_members
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

  // Stop syncing
  const stopSync = async () => {
    try {
      await electric.stopShape('companies')
      await electric.stopShape('company_members')
      state.value.isSyncing = false
    } catch (error) {
      console.error('[useCompanySync] Stop sync failed:', error)
    }
  }

  // Load companies from PGLite
  const loadCompanies = async () => {
    try {
      const result = await electric.query<Company>(
        'SELECT id, name, slug, logo, description, company_users, created_by, created_at, updated_at FROM companies'
      )
      companies.value = result
    } catch (error) {
      companies.value = []
      console.warn('[useCompanySync] Failed to load companies:', error)
    }
  }

  // Load company members from PGLite
  const loadMembers = async () => {
    try {
      const result = await electric.query<CompanyMember>(
        'SELECT id, company_id, user_id, role, created_at, updated_at FROM company_members'
      )
      companyMembers.value = result
    } catch (error) {
      companyMembers.value = []
      console.warn('[useCompanySync] Failed to load company members:', error)
    }
  }

  // Load all data
  const load = async () => {
    state.value.isLoading = true
    state.value.error = null

    try {
      await Promise.all([loadCompanies(), loadMembers()])
    } finally {
      state.value.isLoading = false
    }
  }

  // Find company by ID
  const findCompanyById = async (id: string): Promise<Company | null> => {
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

  // Find company by slug
  const findCompanyBySlug = async (slug: string): Promise<Company | null> => {
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

  // Get members for a company
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

  // Get companies for a user
  const getCompaniesForUser = async (userId: string): Promise<Company[]> => {
    try {
      return await electric.query<Company>(
        `SELECT c.* FROM companies c 
         INNER JOIN company_members cm ON c.id = cm.company_id 
         WHERE cm.user_id = $1`,
        [userId]
      )
    } catch {
      return []
    }
  }

  // Get user's role in a company
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

  // Listen for changes
  const unsubscribeCompanies = electric.onDataChange('companies', (changes) => {
    console.log('[useCompanySync] Companies changes:', {
      insert: changes.insert.length,
      update: changes.update.length,
      delete: changes.delete.length,
    })
    loadCompanies()
  })

  const unsubscribeMembers = electric.onDataChange('company_members', (changes) => {
    console.log('[useCompanySync] Members changes:', {
      insert: changes.insert.length,
      update: changes.update.length,
      delete: changes.delete.length,
    })
    loadMembers()
  })

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribeCompanies()
    unsubscribeMembers()
  })

  return {
    // State
    state: readonly(state),
    companies: readonly(companies),
    companyMembers: readonly(companyMembers),
    
    // Methods
    startSync,
    stopSync,
    load,
    findCompanyById,
    findCompanyBySlug,
    getMembersForCompany,
    getCompaniesForUser,
    getUserRole,
  }
}

