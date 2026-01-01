import { eq, desc } from 'drizzle-orm'
import { db } from 'hub:db'
import { dataTables, dataTableColumns, tableMigrations } from 'hub:db:schema'
import { generateAlterColumnSql, generateRenameColumnSql, executeSql, validateColumnName } from '~~/server/utils/dynamic-table'
import { requireAuth, getUpdateToken } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Auth check
  const user = await requireAuth(event)
  
  const tableId = getRouterParam(event, 'tableId')
  const columnId = getRouterParam(event, 'id')
  
  if (!tableId || !columnId) {
    throw createError({ statusCode: 400, message: 'Table ID and Column ID are required' })
  }

  const body = await readBody(event)
  const {
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
  } = body

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

  // Check if this is a structural change (requires ALTER TABLE)
  const isStructuralChange = 
    (type && type !== existingColumn.type) ||
    (required !== undefined && required !== existingColumn.required) ||
    (defaultValue !== undefined && defaultValue !== existingColumn.defaultValue) ||
    (isUnique !== undefined && isUnique !== existingColumn.isUnique) ||
    (name && name !== existingColumn.name)

  try {
    // Get update token from headers (used for both migration and column update)
    const updateToken = getUpdateToken(event)
    
    let migrationSql = ''
    let rollbackSql = ''

    if (isStructuralChange) {
      // Validate new name if changing
      if (name && name !== existingColumn.name) {
        if (!validateColumnName(name)) {
          throw createError({ 
            statusCode: 400, 
            message: 'Invalid column name. Use snake_case and avoid reserved words' 
          })
        }

        // Check for name conflicts
        const [conflict] = await db.select()
          .from(dataTableColumns)
          .where(eq(dataTableColumns.dataTableId, tableId))
          .where(eq(dataTableColumns.name, name))
          .limit(1)

        if (conflict && conflict.id !== columnId) {
          throw createError({ statusCode: 400, message: 'Column name already exists' })
        }
      }

      // Build ALTER TABLE statements
      const sqls: string[] = []
      const rollbacks: string[] = []

      // Rename column if name changed
      if (name && name !== existingColumn.name) {
        sqls.push(generateRenameColumnSql(table.tableName, existingColumn.name, name))
        rollbacks.push(generateRenameColumnSql(table.tableName, name, existingColumn.name))
      }

      // Alter column if type/constraints changed
      if (type || required !== undefined || defaultValue !== undefined) {
        const alterSql = generateAlterColumnSql(table.tableName, {
          name: name || existingColumn.name,
          type: type || existingColumn.type,
          required: required !== undefined ? required : existingColumn.required,
          defaultValue: defaultValue !== undefined ? defaultValue : existingColumn.defaultValue,
          isUnique: isUnique !== undefined ? isUnique : existingColumn.isUnique,
          config: config || existingColumn.config,
        })
        
        sqls.push(alterSql)
        
        // Rollback: restore original column definition
        rollbacks.push(generateAlterColumnSql(table.tableName, {
          name: name || existingColumn.name,
          type: existingColumn.type,
          required: existingColumn.required,
          defaultValue: existingColumn.defaultValue,
          isUnique: existingColumn.isUnique,
          config: existingColumn.config,
        }))
      }

      migrationSql = sqls.join('\n')
      rollbackSql = rollbacks.reverse().join('\n')

      // Execute structural changes
      await executeSql(migrationSql)

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
        migrationSql,
        rollbackSql,
        description: `Update column: ${label || existingColumn.label}`,
        createdBy: user.userId,
        updateToken,
      })
    }

    // Update column metadata
    const [updated] = await db.update(dataTableColumns)
      .set({
        ...(name && { name }),
        ...(label && { label }),
        ...(type && { type }),
        ...(required !== undefined && { required }),
        ...(order !== undefined && { order }),
        ...(defaultValue !== undefined && { defaultValue }),
        ...(isUnique !== undefined && { isUnique }),
        ...(isHidden !== undefined && { isHidden }),
        ...(isPrimaryDisplay !== undefined && { isPrimaryDisplay }),
        ...(config && { config }),
        ...(validationRules && { validationRules }),
        updateToken,
        updatedAt: new Date(),
      })
      .where(eq(dataTableColumns.id, columnId))
      .returning()

    return {
      success: true,
      column: updated,
      structuralChange: isStructuralChange,
    }
  } catch (error: any) {
    console.error('Failed to update column:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to update column: ${error.message}`,
    })
  }
})

