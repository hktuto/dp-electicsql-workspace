/**
 * App Router Composable
 * 
 * A wrapper around vue-router that supports dual navigation modes:
 * 1. Dock Mode - Opens pages as Dockview panels (when in /tab)
 * 2. URL Mode - Standard page navigation
 * 
 * Note: Components in /components/global/ are auto-registered by Nuxt
 * without the "Global" prefix. E.g., LoginPage.vue -> <LoginPage />
 */

interface AppRouteOptions {
  // For dock mode: panel title
  title?: string
  // For dock mode: panel icon
  icon?: string
  // For dock mode: open as floating panel
  floating?: boolean
  // Force URL navigation even in dock mode
  forceUrl?: boolean
}

// Event bus for dock mode navigation
const dockNavigationEvent = new EventTarget()

export interface DockNavigationDetail {
  path: string
  component: string
  title: string
  icon?: string
  floating?: boolean
  params?: Record<string, string>
  query?: Record<string, string>
}

export function useAppRouter() {
  const router = useRouter()
  const route = useRoute()

  const currentPath = computed(() => {
    return route.path
  })
  // Check if we're in dock mode (URL starts with /tab)
  const isDockMode = computed(() => {
    return route.path.startsWith('/tab')
  })

  // Get the component name from a path
  // Components are in /components/global/ and auto-registered by Nuxt
  const getComponentFromPath = (path: string): string => {
    // Remove /tab prefix if present
    const cleanPath = path.replace(/^\/tab/, '')
    
    // Exact path mappings
    const pathMappings: Record<string, string> = {
      '/': 'UserHome',
      '/workspaces': 'WorkspaceList',
      '/chats': 'ChatList',
    }

    // Check exact matches first
    if (pathMappings[cleanPath]) {
      return pathMappings[cleanPath]
    }

    // Pattern-based matching (order matters - more specific patterns first)
    
    // Company
    if (/^\/company\/[^/]+$/.test(cleanPath)) {
      return 'CompanySettings'
    }
    
    // Workspace routes
    if (/^\/workspaces\/[^/]+\/setting$/.test(cleanPath)) {
      return 'WorkspaceSetting'
    }
    if (/^\/workspaces\/[^/]+$/.test(cleanPath)) {
      return 'WorkspaceDetail'
    }
    
    // Folder routes
    if (/^\/workspaces\/[^/]+\/folder\/[^/]+\/setting$/.test(cleanPath)) {
      return 'FolderSetting'
    }
    if (/^\/workspaces\/[^/]+\/folder\/[^/]+$/.test(cleanPath)) {
      return 'FolderView'
    }
    
    // Table routes
    if (/^\/workspaces\/[^/]+\/table\/[^/]+\/setting$/.test(cleanPath)) {
      return 'TableSetting'
    }
    if (/^\/workspaces\/[^/]+\/table\/[^/]+$/.test(cleanPath)) {
      return 'TableView'
    }
    
    // View routes
    if (/^\/workspaces\/[^/]+\/view\/[^/]+\/setting$/.test(cleanPath)) {
      return 'ViewSetting'
    }
    if (/^\/workspaces\/[^/]+\/view\/[^/]+$/.test(cleanPath)) {
      return 'ViewDetail'
    }
    
    // Dashboard routes
    if (/^\/workspaces\/[^/]+\/dashboard\/[^/]+\/setting$/.test(cleanPath)) {
      return 'DashboardSetting'
    }
    if (/^\/workspaces\/[^/]+\/dashboard\/[^/]+$/.test(cleanPath)) {
      return 'DashboardView'
    }
    
    // Chat routes (future phase)
    if (/^\/chats\/[^/]+$/.test(cleanPath)) {
      return 'ChatDetail'
    }
    
    // Public routes
    if (/^\/public\/view\/[^/]+$/.test(cleanPath)) {
      return 'PublicView'
    }
    if (/^\/public\/dashboard\/[^/]+$/.test(cleanPath)) {
      return 'PublicDashboard'
    }

    // Default fallback
    return 'NotFound'
  }

  // Extract params from path
  const extractParams = (path: string): Record<string, string> => {
    const params: Record<string, string> = {}
    const cleanPath = path.replace(/^\/tab/, '')
    
    // Match company slug: /company/[slug]
    const companyMatch = cleanPath.match(/^\/company\/([^/]+)/)
    if (companyMatch?.[1]) {
      params.companySlug = companyMatch[1]
    }
    
    // Match workspace slug: /workspaces/[slug]
    const workspaceMatch = cleanPath.match(/^\/workspaces\/([^/]+)/)
    if (workspaceMatch?.[1]) {
      params.workspaceSlug = workspaceMatch[1]
    }
    
    // Match folder slug: /workspaces/[slug]/folder/[slug]
    const folderMatch = cleanPath.match(/\/folder\/([^/]+)/)
    if (folderMatch?.[1]) {
      params.folderSlug = folderMatch[1]
    }
    
    // Match table slug: /workspaces/[slug]/table/[slug]
    const tableMatch = cleanPath.match(/\/table\/([^/]+)/)
    if (tableMatch?.[1]) {
      params.tableSlug = tableMatch[1]
    }
    
    // Match view slug: /workspaces/[slug]/view/[slug]
    const viewMatch = cleanPath.match(/\/view\/([^/]+)/)
    if (viewMatch?.[1]) {
      params.viewSlug = viewMatch[1]
    }
    
    // Match dashboard slug: /workspaces/[slug]/dashboard/[slug]
    const dashboardMatch = cleanPath.match(/\/dashboard\/([^/]+)/)
    if (dashboardMatch?.[1]) {
      params.dashboardSlug = dashboardMatch[1]
    }
    
    // Match chat id: /chats/[chatId]
    const chatMatch = cleanPath.match(/^\/chats\/([^/]+)/)
    if (chatMatch?.[1]) {
      params.chatId = chatMatch[1]
    }
    
    // Match public view id: /public/view/[viewId]
    const publicViewMatch = cleanPath.match(/^\/public\/view\/([^/]+)/)
    if (publicViewMatch?.[1]) {
      params.viewId = publicViewMatch[1]
    }
    
    // Match public dashboard id: /public/dashboard/[dashboardId]
    const publicDashboardMatch = cleanPath.match(/^\/public\/dashboard\/([^/]+)/)
    if (publicDashboardMatch?.[1]) {
      params.dashboardId = publicDashboardMatch[1]
    }
    
    return params
  }

  // Navigate to a path
  const navigate = (path: string, options: AppRouteOptions = {}) => {
    // If force URL navigation, use router directly
    if (options.forceUrl || !isDockMode.value) {
      return router.push(path)
    }

    // In dock mode, emit event for Dockview to handle
    const component = getComponentFromPath(path)
    const params = extractParams(path)
    const title = options.title || getDefaultTitle(path)

    const detail: DockNavigationDetail = {
      path,
      component,
      title,
      icon: options.icon,
      floating: options.floating,
      params,
      query: route.query as Record<string, string>,
    }

    dockNavigationEvent.dispatchEvent(
      new CustomEvent('navigate', { detail })
    )
  }

  const push = navigate

  // Get default title from path
  const getDefaultTitle = (path: string): string => {
    const params = extractParams(path)
    
    // Priority: most specific to least specific
    if (params.chatId) return `Chat`
    if (params.dashboardSlug) return params.dashboardSlug
    if (params.viewSlug) return params.viewSlug
    if (params.tableSlug) return params.tableSlug
    if (params.folderSlug) return params.folderSlug
    if (params.workspaceSlug) return params.workspaceSlug
    if (params.companySlug) return params.companySlug
    
    // Check for setting suffix
    if (path.endsWith('/setting')) return 'Settings'
    
    // Extract last path segment
    const segments = path.split('/').filter(Boolean)
    return segments[segments.length - 1] || 'Home'
  }

  // Subscribe to dock navigation events
  const onDockNavigate = (callback: (detail: DockNavigationDetail) => void) => {
    const handler = (event: Event) => {
      callback((event as CustomEvent).detail)
    }
    dockNavigationEvent.addEventListener('navigate', handler)
    
    // Return cleanup function
    return () => {
      dockNavigationEvent.removeEventListener('navigate', handler)
    }
  }

  // Replace current route (in URL mode)
  const replace = (path: string) => {
    return router.replace(path)
  }

  // Go back
  const back = () => {
    return router.back()
  }

  return {
    isDockMode,
    navigate,
    replace,
    back,
    onDockNavigate,
    getComponentFromPath,
    extractParams,
    push,
    
    // Expose underlying router for advanced use
    currentPath,
    router,
    route,
  }
}
