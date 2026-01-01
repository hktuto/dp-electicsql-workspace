import type { DataTable, DataTableColumn } from '#shared/types/db'

/**
 * Data Table Sync Composable
 * 
 * Query builder for data_tables and data_table_columns tables (auto-synced on login).
 * 
 * Pattern: Query on demand, subscribe to changes
 * - NO sync control (these are system tables, auto-synced on login)
 * - NO global data refs (data lives in PGlite only)
 * - Components query what they need
 * - Components subscribe to change events to re-query
 */
export function useDataTableSync() {
  const electricSync = useElectricSync()

  // ============================================
  // Sync Status (read-only, from central state)
  // ============================================

  const isDataTablesUpToDate = computed(() => electricSync.isTableUpToDate('data_tables'))
  const isDataTableColumnsUpToDate = computed(() => electricSync.isTableUpToDate('data_table_columns'))

  // All system tables ready (for convenience)
  const isReady = computed(() => 
    isDataTablesUpToDate.value && isDataTableColumnsUpToDate.value
  )

  // ============================================
  // Query Helpers
  // ============================================

  // Get all tables for a workspace
  async function getByWorkspaceId(workspaceId: string): Promise<DataTable[]> {
    return await electricSync.query<DataTable>(
      `SELECT * FROM data_tables WHERE workspace_id = $1 ORDER BY created_at DESC`,
      [workspaceId]
    )
  }

  // Find table by ID
  async function findById(id: string): Promise<DataTable | null> {
    try {
      const result = await electricSync.query<DataTable>(
        `SELECT * FROM data_tables WHERE id = $1 LIMIT 1`,
        [id]
      )
      return result[0] || null
    } catch (err) {
      console.error('[useDataTableSync] Query error:', err)
      return null
    }
  }

  // Find table by slug within workspace
  async function findBySlug(workspaceId: string, slug: string): Promise<DataTable | null> {
    try {
      const result = await electricSync.query<DataTable>(
        `SELECT * FROM data_tables WHERE workspace_id = $1 AND slug = $2 LIMIT 1`,
        [workspaceId, slug]
      )
      return result[0] || null
    } catch (err) {
      console.error('[useDataTableSync] Query error:', err)
      return null
    }
  }

  // Get columns for a table
  async function getColumns(tableId: string): Promise<DataTableColumn[]> {
    try {
      return await electricSync.query<DataTableColumn>(
        `SELECT * FROM data_table_columns WHERE data_table_id = $1 ORDER BY "order"`,
        [tableId]
      )
    } catch (err) {
      console.error('[useDataTableSync] Query error:', err)
      return []
    }
  }

  // ============================================
  // Change Subscriptions
  // ============================================

  type ChangeCallback = (changes: { insert: any[]; update: any[]; delete: any[] }) => void

  // Subscribe to changes
  function onDataTableChange(callback: ChangeCallback) {
    return electricSync.onDataChange('data_tables', (change) => {
      callback(change)
    })
  }

  function onDataTableColumnChange(callback: ChangeCallback) {
    return electricSync.onDataChange('data_table_columns', (change) => {
      callback(change)
    })
  }

  return {
    // Sync status (read-only)
    isReady: readonly(isReady),
    isDataTablesUpToDate: readonly(isDataTablesUpToDate),
    isDataTableColumnsUpToDate: readonly(isDataTableColumnsUpToDate),

    // Queries
    getByWorkspaceId,
    findById,
    findBySlug,
    getColumns,

    // Change subscriptions
    onDataTableChange,
    onDataTableColumnChange,
  }
}

