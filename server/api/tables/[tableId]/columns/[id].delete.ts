import { eq, desc } from 'drizzle-orm'
import { db } from 'hub:db'
import { dataTables, dataTableColumns, tableMigrations } from 'hub:db:schema'
import { generateDropColumnSql, executeSql } from '~~/server/utils/dynamic-table'

export default defineEventHandler(async (event) => {
  // Auth check
  await requireAuth(event)
  
  const tableId = getRouterParam(event, 'tableId')
  const columnId = getRouterParam(event, 'id')
  
  if (!tableId || !columnId) {
    throw createError({ statusCode: 400, message: 'Table ID and Column ID are required' })
  }

  // Get existing column
  const [existingColumn] = await db.select()
    .from(dataTableColumns)
    .where(eq(dataTableColumns.id, columnId))
    .limit(1)

  if (!existingColumn) {
    throw createError({ statusCode: 404, message: 'Column not found' })
  }

  if (existingColumn.dataTableId !== tableId) {
    throw createError({ statusCode: 403, message: 'Column does not belong to this table' })
  }

  // Get table metadata
  const [table] = await db.select().from(dataTables).where(eq(dataTables.id, tableId)).limit(1)
  if (!table) {
    throw createError({ statusCode: 404, message: 'Table not found' })
  }

  try {
    // Drop column from physical table
    const dropSql = generateDropColumnSql(table.tableName, existingColumn.name)
    await executeSql(dropSql)

    // Get next version number
    const [lastMigration] = await db.select()
      .from(tableMigrations)
      .where(eq(tableMigrations.dataTableId, tableId))
      .orderBy(desc(tableMigrations.version))
      .limit(1)
    
    const nextVersion = (lastMigration?.version || 0) + 1

    // Store migration history
    // Note: Rollback is not practical as we lose data
    await db.insert(tableMigrations).values({
      dataTableId: tableId,
      companyId: table.companyId,
      version: nextVersion,
      migrationSql: dropSql,
      rollbackSql: null,
      description: `Drop column: ${existingColumn.label}`,
    })

    // Delete column metadata
    await db.delete(dataTableColumns).where(eq(dataTableColumns.id, columnId))

    return {
      success: true,
      message: 'Column deleted successfully',
    }
  } catch (error: any) {
    console.error('Failed to delete column:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to delete column: ${error.message}`,
    })
  }
})

