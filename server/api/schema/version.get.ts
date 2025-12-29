/**
 * Schema Version Endpoint
 * 
 * GET /api/schema/version
 * 
 * Returns the current database schema version.
 * Used by Electric worker to detect schema changes and clear PGLite if needed.
 */

// Schema version - increment this when schema changes
// Format: MAJOR.MINOR.PATCH or timestamp-based (e.g., '20251229_001')
const SCHEMA_VERSION = '1.0.0'

export default defineEventHandler(() => {
  return {
    version: SCHEMA_VERSION,
    // List of tables that are synced to PGLite
    // This helps the worker know which tables to expect
    tables: [
      'users',
      'companies',
      'company_members',
    ],
  }
})

