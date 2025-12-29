/**
 * Company Context Composable
 * 
 * Manages the current company context for the user.
 * Persists the selected company in a cookie.
 */

interface Company {
  id: string
  name: string
  slug: string
  logo: string | null
  description: string | null
}

interface CompanyMember {
  id: string
  companyId: string
  userId: string
  role: string
}

// Global state (shared across components)
const useCurrentCompanyId = () => useState<string | null>('currentCompanyId' )
const useCurrentCompany = () => useState<Company | null>('currentCompany')
const useUserRole = () => useState<string | null>('userRole')
const useIsCompanyLoading = () => useState<boolean>('isCompanyLoading', () => false)

export function useCompanyContext() {
  const { user } = useAuth()
  const companySync = useCompanySync()
  const currentCompanyId = useCurrentCompanyId()
  const currentCompany = useCurrentCompany()
  const userRole = useUserRole()
  const isLoading = useIsCompanyLoading()
  // Computed permissions
  const canManageCompany = computed(() => 
    user.value?.isSuperAdmin || ['owner', 'admin'].includes(userRole.value || '')
  )
  const isOwner = computed(() => 
    user.value?.isSuperAdmin || userRole.value === 'owner'
  )
  const isAdmin = computed(() => 
    user.value?.isSuperAdmin || ['owner', 'admin'].includes(userRole.value || '')
  )
  const isMember = computed(() => userRole.value !== null)

  // Set current company by ID
  const setCompanyById = async (companyId: string) => {
    if (!user.value) return false

    isLoading.value = true
    try {
      // Find company in synced data
      const company = await companySync.findCompanyById(companyId)
      if (!company) {
        console.warn('[useCompanyContext] Company not found:', companyId)
        return false
      }

      // Get user's role in this company
      const role = await companySync.getUserRole(companyId, user.value.id)
      
      // Super admin can access any company
      if (!role && !user.value.isSuperAdmin) {
        console.warn('[useCompanyContext] User not a member of company:', companyId)
        return false
      }

      currentCompanyId.value = companyId
      currentCompany.value = company
      userRole.value = role || (user.value.isSuperAdmin ? 'super_admin' : null)

      // Persist in cookie
      const cookie = useCookie('current_company_id', { 
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })
      cookie.value = companyId

      return true
    } finally {
      isLoading.value = false
    }
  }

  // Set current company by slug
  const setCompanyBySlug = async (slug: string) => {
    if (!user.value) return false

    isLoading.value = true
    try {
      const company = await companySync.findCompanyBySlug(slug)
      if (!company) {
        console.warn('[useCompanyContext] Company not found:', slug)
        return false
      }

      return await setCompanyById(company.id)
    } finally {
      isLoading.value = false
    }
  }

  // Clear company context
  const clearCompany = () => {
    currentCompanyId.value = null
    currentCompany.value = null
    userRole.value = null

    const cookie = useCookie('current_company_id')
    cookie.value = null
  }

  // Initialize from cookie on mount
  const init = async () => {
    if (!user.value) return

    // Try to restore from cookie
    const cookie = useCookie<string | null>('current_company_id')
    if (cookie.value) {
      const success = await setCompanyById(cookie.value)
      if (!success) {
        // Cookie company no longer valid, clear it
        cookie.value = null
      }
    }

    // If no company set, try to set first available
    if (!currentCompanyId.value) {
      const companies = await companySync.getCompaniesForUser(user.value.id)
      if (companies.length > 0 && companies[0]) {
        await setCompanyById(companies[0].id)
      }
    }
  }

  return {
    // State
    currentCompanyId: readonly(currentCompanyId),
    currentCompany: readonly(currentCompany),
    userRole: readonly(userRole),
    isLoading: readonly(isLoading),

    // Permissions
    canManageCompany,
    isOwner,
    isAdmin,
    isMember,

    // Actions
    setCompanyById,
    setCompanyBySlug,
    clearCompany,
    init,
  }
}

