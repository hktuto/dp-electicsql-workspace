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
      await electricSync.syncShape('data_tables', 'data_tables')
      await electricSync.syncShape('data_table_columns', 'data_table_columns')
      await electricSync.syncShape('table_migrations', 'table_migrations')
      isReady.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to start sync'
      console.error('[useDataTableSync] Error:', err)
    }
  }

  // Get all tables for a workspace
  async function getByWorkspaceId(workspaceId: string): Promise<DataTable[]> {
    await startSync()
    const db = await electricSync.getDB()
    if (!db) return []

    try {
      const result = await db.query<DataTable>(
        `SELECT * FROM data_tables WHERE workspace_id = $1 ORDER BY created_at DESC`,
        [workspaceId]
      )
      return result.rows
    } catch (err) {
      console.error('[useDataTableSync] Query error:', err)
      return []
    }
  }

  // Find table by ID
  async function findById(id: string): Promise<DataTable | null> {
    await startSync()
    const db = await electricSync.getDB()
    if (!db) return null

    try {
      const result = await db.query<DataTable>(
        `SELECT * FROM data_tables WHERE id = $1 LIMIT 1`,
        [id]
      )
      return result.rows[0] || null
    } catch (err) {
      console.error('[useDataTableSync] Query error:', err)
      return null
    }
  }

  // Find table by slug within workspace
  async function findBySlug(workspaceId: string, slug: string): Promise<DataTable | null> {
    await startSync()
    const db = await electricSync.getDB()
    if (!db) return null

    try {
      const result = await db.query<DataTable>(
        `SELECT * FROM data_tables WHERE workspace_id = $1 AND slug = $2 LIMIT 1`,
        [workspaceId, slug]
      )
      return result.rows[0] || null
    } catch (err) {
      console.error('[useDataTableSync] Query error:', err)
      return null
    }
  }

  // Get columns for a table
  async function getColumns(tableId: string): Promise<DataTableColumn[]> {
    await startSync()
    const db = await electricSync.getDB()
    if (!db) return []

    try {
      const result = await db.query<DataTableColumn>(
        `SELECT * FROM data_table_columns WHERE data_table_id = $1 ORDER BY "order"`,
        [tableId]
      )
      return result.rows
    } catch (err) {
      console.error('[useDataTableSync] Query error:', err)
      return []
    }
  }

  // Subscribe to changes
  function onChange(callback: () => void) {
    return electricSync.onChange((change) => {
      if (
        change.table === 'data_tables' ||
        change.table === 'data_table_columns' ||
        change.table === 'table_migrations'
      ) {
        callback()
      }
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
    onChange,
  }
}

