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
  const authRequiredTables = ['users', 'companies', 'company_members']

  // Check authorization
  if (authRequiredTables.includes(table) && !user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    })
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
  // Example: Filter company_members by user's companies
  // This is where you'd add your authorization logic
  if (table === 'company_members' && user && !user.isSuperAdmin) {
    // Non-admin users can only see their own memberships
    // For now, we'll allow all - you can add filtering logic here
    // originUrl.searchParams.set('where', `user_id = '${user.id}'`)
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

