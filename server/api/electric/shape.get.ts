import { eq, and, inArray } from 'drizzle-orm'
import { db, schema } from 'hub:db'

/**
 * Electric SQL Proxy Endpoint
 * 
 * Proxies shape requests to Electric SQL server with authentication.
 * Based on: https://electric-sql.com/docs/guides/auth#proxy-auth
 * 
 * Usage: GET /api/electric/shape?table=users&...
 */

// Electric protocol query params that should be forwarded
const ELECTRIC_PROTOCOL_PARAMS = [
  'offset',
  'handle',
  'live',
  'cursor',
  'where',
  'columns',
  'replica',
]

// Tables that require company-based filtering
const COMPANY_FILTERED_TABLES = ['companies', 'company_members', 'company_invites']

// Admin roles that can see invites
const ADMIN_ROLES = ['owner', 'admin']

/**
 * Get company IDs for a user (all memberships)
 */
async function getUserCompanyIds(userId: string): Promise<string[]> {
  const memberships = await db
    .select({ companyId: schema.companyMembers.companyId })
    .from(schema.companyMembers)
    .where(eq(schema.companyMembers.userId, userId))
  
  return memberships.map((m) => m.companyId)
}

/**
 * Get company IDs where user is admin/owner
 */
async function getUserAdminCompanyIds(userId: string): Promise<string[]> {
  const memberships = await db
    .select({ companyId: schema.companyMembers.companyId })
    .from(schema.companyMembers)
    .where(
      and(
        eq(schema.companyMembers.userId, userId),
        inArray(schema.companyMembers.role, ADMIN_ROLES)
      )
    )
  
  return memberships.map((m) => m.companyId)
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  
  // Get table from query
  const table = query.table as string
  if (!table) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameter: table',
    })
  }

  // Get current user from context (set by auth middleware)
  const user = event.context.user

  // Define which tables are public vs require auth
  const publicTables: string[] = []
  const authRequiredTables = ['users', 'companies', 'company_members', 'company_invites']

  // Check authorization
  if (authRequiredTables.includes(table) && !user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    })
  }

  // Get user's company IDs for filtering (cached for this request)
  let userCompanyIds: string[] | null = null
  if (user && !user.isSuperAdmin && COMPANY_FILTERED_TABLES.includes(table)) {
    userCompanyIds = await getUserCompanyIds(user.id)
    
    // If user has no companies, return empty for company-filtered tables
    if (userCompanyIds.length === 0) {
      // Return empty Electric response format
      setHeader(event, 'content-type', 'application/json')
      return JSON.stringify([{ headers: { control: 'up-to-date' } }])
    }
  }

  // Construct Electric URL
  const electricUrl = config.electricUrl || 'http://localhost:30000'
  const originUrl = new URL(`${electricUrl}/v1/shape`)

  // Set table server-side (not from client params for security)
  originUrl.searchParams.set('table', table)

  // Set default offset if not provided (required by Electric)
  // offset=-1 means "start from beginning"
  if (!query.offset) {
    originUrl.searchParams.set('offset', '-1')
  }

  // Forward Electric protocol parameters
  for (const param of ELECTRIC_PROTOCOL_PARAMS) {
    const value = query[param]
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Handle array params like columns
        originUrl.searchParams.set(param, value.join(','))
      } else {
        originUrl.searchParams.set(param, String(value))
      }
    }
  }

  // Forward params[n] parameters (for parameterized WHERE clauses)
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith('params[') && value !== undefined) {
      originUrl.searchParams.set(key, String(value))
    }
  }

  // Add row-level filtering based on user context
  // Super admins see all data, regular users see only their companies' data
  if (user && !user.isSuperAdmin && userCompanyIds && userCompanyIds.length > 0) {
    const companyIdList = userCompanyIds.map((id) => `'${id}'`).join(',')
    
    switch (table) {
      case 'companies':
        // Users can only see companies they belong to
        originUrl.searchParams.set('where', `id IN (${companyIdList})`)
        break
        
      case 'company_members':
        // Users can only see members of companies they belong to
        originUrl.searchParams.set('where', `company_id IN (${companyIdList})`)
        break
        
      case 'company_invites':
        // Users can only see invites for companies they're ADMIN of
        // Get admin company IDs (owner/admin role only)
        const adminCompanyIds = await getUserAdminCompanyIds(user.id)
        
        if (adminCompanyIds.length === 0) {
          // User is not admin of any company, return empty
          setHeader(event, 'content-type', 'application/json')
          return JSON.stringify([{ headers: { control: 'up-to-date' } }])
        }
        
        const adminCompanyIdList = adminCompanyIds.map((id) => `'${id}'`).join(',')
        originUrl.searchParams.set('where', `company_id IN (${adminCompanyIdList})`)
        break
    }
  }

  console.log('[Electric Proxy] Forwarding request:', originUrl.toString())

  try {
    // Forward request to Electric
    const response = await fetch(originUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    // Check for errors from Electric
    if (!response.ok) {
      console.error('[Electric Proxy] Electric error:', response.status, response.statusText)
      throw createError({
        statusCode: response.status,
        message: `Electric error: ${response.statusText}`,
      })
    }

    // Get headers from Electric response
    const headers: Record<string, string> = {}
    
    // Forward important Electric headers
    const electricHeaders = [
      'electric-handle',
      'electric-offset', 
      'electric-schema',
      'electric-chunk-last-offset',
      'electric-up-to-date',
      'etag',
      'cache-control',
    ]
    
    for (const header of electricHeaders) {
      const value = response.headers.get(header)
      if (value) {
        headers[header] = value
      }
    }

    // Remove content-encoding/length as fetch decompresses
    // See: https://github.com/whatwg/fetch/issues/1729
    
    // Set content type
    headers['content-type'] = response.headers.get('content-type') || 'application/json'

    // Add Vary header for cache isolation based on auth
    // This ensures different users don't get each other's cached data
    headers['Vary'] = 'Cookie, Authorization'

    // Get response body
    const body = await response.text()

    // Set response headers
    setHeaders(event, headers)

    return body
  } catch (error) {
    console.error('[Electric Proxy] Request failed:', error)
    
    if ((error as any).statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 502,
      message: `Failed to connect to Electric: ${(error as Error).message}`,
    })
  }
})

