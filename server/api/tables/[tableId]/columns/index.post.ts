import { eq, desc } from 'drizzle-orm'
import { db } from 'hub:db'
import { dataTables, dataTableColumns, tableMigrations } from 'hub:db:schema'
import { generateAddColumnSql, executeSql, validateColumnName } from '~~/server/utils/dynamic-table'

export default defineEventHandler(async (event) => {
  // Auth check
  await requireAuth(event)
  
  const tableId = getRouterParam(event, 'tableId')
  if (!tableId) {
    throw createError({ statusCode: 400, message: 'Table ID is required' })
  }

  const body = await readBody(event)
  const {
    name,
    label,
    type,
    required = false,
    order = 0,
    defaultValue,
    isUnique = false,
    isHidden = false,
    isPrimaryDisplay = false,
    config,
    validationRules,
  } = body

  if (!name || !label || !type) {
    throw createError({ statusCode: 400, message: 'Name, label, and type are required' })
  }

  if (!validateColumnName(name)) {
    throw createError({ 
      statusCode: 400, 
      message: 'Invalid column name. Use snake_case and avoid reserved words' 
    })
  }

  // Get table metadata
  const [table] = await db.select().from(dataTables).where(eq(dataTables.id, tableId)).limit(1)
  if (!table) {
    throw createError({ statusCode: 404, message: 'Table not found' })
  }

  // Check if column name already exists
  const [existing] = await db.select()
    .from(dataTableColumns)
    .where(eq(dataTableColumns.dataTableId, tableId))
    .where(eq(dataTableColumns.name, name))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 400, message: 'Column name already exists' })
  }

  try {
    // Add column to physical table
    const addColumnSql = generateAddColumnSql(table.tableName, {
      name,
      type,
      required,
      defaultValue,
      isUnique,
      config,
    })
    
    await executeSql(addColumnSql)

    // Get next version number
    const [lastMigration] = await db.select()
      .from(tableMigrations)
      .where(eq(tableMigrations.dataTableId, tableId))
      .orderBy(desc(tableMigrations.version))
      .limit(1)
    
    const nextVersion = (lastMigration?.version || 0) + 1

    // Store migration history
    await db.insert(tableMigrations).values({
      dataTableId: tableId,
      companyId: table.companyId,
      version: nextVersion,
      migrationSql: addColumnSql,
      rollbackSql: `ALTER TABLE ${table.tableName} DROP COLUMN ${name};`,
      description: `Add column: ${label}`,
    })

    // Create column metadata
    const [newColumn] = await db.insert(dataTableColumns).values({
      dataTableId: tableId,
      workspaceId: table.workspaceId,
      companyId: table.companyId,
      name,
      label,
      type,
      required,
      order,
      defaultValue,
      isUnique,
      isHidden,
      isPrimaryDisplay,
      config,
      validationRules,
    }).returning()

    return {
      success: true,
      column: newColumn,
    }
  } catch (error: any) {
    console.error('Failed to add column:', error)
    
    // Cleanup: try to drop the column if it was created
    try {
      await executeSql(`ALTER TABLE ${table.tableName} DROP COLUMN IF EXISTS ${name};`)
    } catch (cleanupError) {
      console.error('Failed to cleanup column:', cleanupError)
    }

    throw createError({
      statusCode: 500,
      message: `Failed to add column: ${error.message}`,
    })
  }
})

