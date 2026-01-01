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
const SCHEMA_VERSION = '0.0.1' // Fixed SQL generation to quote column/table names for reserved keywords

export default defineEventHandler(() => {
  return {
    version: SCHEMA_VERSION,
    // List of tables that are synced to PGLite
    // This helps the worker know which tables to expect
    tables: [
      'users',
      'companies',
      'company_members',
      'company_invites',
      'workspaces', // Added in Phase 3.0
      'data_tables', // Added in Phase 4.0
      'data_table_columns', // Added in Phase 4.0
      'table_migrations', // Added in Phase 4.0
    ],
  }
})

