/**
 * Electric SQL Shape Proxy
 * 
 * GET /api/electric/[...shape]
 * 
 * Proxies shape requests to the Electric SQL server.
 * This allows the frontend to request shapes through the Nuxt server,
 * which handles CORS and can add authentication headers.
 * 
 * Example: /api/electric/test_items -> Electric /v1/shape?table=test_items
 */

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const electricUrl = config.electricUrl || 'http://localhost:30000'
  
  // Get the shape path (e.g., 'test_items' or 'test_items?where=...')
  const shapePath = getRouterParam(event, 'shape')
  
  if (!shapePath) {
    throw createError({
      statusCode: 400,
      message: 'Shape name is required',
    })
  }
  
  // Parse shape path - first segment is table name, rest is preserved
  const [tableName, ...rest] = shapePath.split('/')
  
  // Get query parameters from the request
  const query = getQuery(event)
  
  // Build Electric shape URL
  // Electric uses /v1/shape?table=tablename for shapes
  const params = new URLSearchParams()
  params.set('table', tableName)
  
  // Forward any additional query params (like offset, live, etc.)
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value))
    }
  }
  
  const electricShapeUrl = `${electricUrl}/v1/shape?${params.toString()}`
  
  console.log(`[Electric Proxy] Forwarding to: ${electricShapeUrl}`)
  
  try {
    // Fetch from Electric server
    const response = await fetch(electricShapeUrl, {
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Electric Proxy] Error from Electric:`, errorText)
      throw createError({
        statusCode: response.status,
        message: `Electric error: ${errorText}`,
      })
    }
    
    // Get response headers we need to forward
    const electricOffset = response.headers.get('electric-offset')
    const electricHandle = response.headers.get('electric-handle')
    const electricSchema = response.headers.get('electric-schema')
    
    // Set response headers
    if (electricOffset) {
      setHeader(event, 'electric-offset', electricOffset)
    }
    if (electricHandle) {
      setHeader(event, 'electric-handle', electricHandle)
    }
    if (electricSchema) {
      setHeader(event, 'electric-schema', electricSchema)
    }
    
    // Return the response body
    const data = await response.json()
    return data
    
  } catch (error) {
    console.error(`[Electric Proxy] Failed to fetch shape:`, error)
    
    if ((error as any).statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 502,
      message: `Failed to connect to Electric server: ${(error as Error).message}`,
    })
  }
})

