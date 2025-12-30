import type { DataTable, DataTableColumn } from '#shared/types/db'
import { eq } from 'drizzle-orm'

/**
 * Composable for syncing data tables with ElectricSQL
 */
export function useDataTableSync() {
  const electricSync = useElectricSync()
  const isReady = ref(false)
  const error = ref<string | null>(null)

  // Start sync for data tables and columns
  async function startSync() {
    if (isReady.value) return

    try {
      await electricSync.syncShape('data_tables', 'data_tables', '/api/electric/shape?table=data_tables')
      await electricSync.syncShape('data_table_columns', 'data_table_columns', '/api/electric/shape?table=data_table_columns')
      await electricSync.syncShape('table_migrations', 'table_migrations', '/api/electric/shape?table=table_migrations')
      isReady.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to start sync'
      console.error('[useDataTableSync] Error:', err)
    }
  }

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
  function onTableMigrationChange(callback: ChangeCallback) {
    return electricSync.onDataChange('table_migrations', (change) => {
      callback(change)
    })
  }

  return {
    isReady: readonly(isReady),
    error: readonly(error),
    startSync,
    getByWorkspaceId,
    findById,
    findBySlug,
    getColumns,
    onDataTableChange,
    onDataTableColumnChange,
    onTableMigrationChange,
  }
}

