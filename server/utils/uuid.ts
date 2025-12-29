/**
 * UUID Utilities
 * 
 * Generate UUIDs client-side as required by Electric SQL.
 */

/**
 * Generate a v4 UUID using crypto.randomUUID()
 * Available in all modern runtimes (Node 19+, Cloudflare Workers, browsers)
 */
export function generateUUID(): string {
  return crypto.randomUUID()
}

