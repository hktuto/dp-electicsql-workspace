import { db } from 'hub:db'
import { sql } from 'drizzle-orm'

/**
 * Get CREATE TABLE SQL for PGLite
 * 
 * GET /api/schema/tables
 * GET /api/schema/tables?table=users
 * 
 * Returns the CREATE TABLE SQL statements for synced tables.
 * Used by Electric worker to create tables in PGLite.
 */

// Tables that are synced to PGLite
const SYNCED_TABLES = [
  'users',
  'companies',
  'company_members',
  'company_invites',
  'workspaces', // Added in Phase 3.0
  'data_tables', // Added in Phase 4.0
  'data_table_columns', // Added in Phase 4.0
  'table_migrations', // Added in Phase 4.0
]

// Column type mapping from PostgreSQL to PGLite-compatible types
const TYPE_MAPPING: Record<string, string> = {
  'uuid': 'UUID',
  'text': 'TEXT',
  'boolean': 'BOOLEAN',
  'integer': 'INTEGER',
  'bigint': 'BIGINT',
  'smallint': 'SMALLINT',
  'real': 'REAL',
  'double precision': 'DOUBLE PRECISION',
  'numeric': 'NUMERIC',
  'timestamp without time zone': 'TIMESTAMP',
  'timestamp with time zone': 'TIMESTAMPTZ',
  'date': 'DATE',
  'time without time zone': 'TIME',
  'time with time zone': 'TIMETZ',
  'jsonb': 'JSONB',
  'json': 'JSON',
  'bytea': 'BYTEA',
  'ARRAY': 'TEXT[]', // Simplified - arrays become text arrays
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const requestedTable = query.table as string | undefined

  // Filter tables if specific table requested
  const tablesToProcess = requestedTable 
    ? SYNCED_TABLES.filter(t => t === requestedTable)
    : SYNCED_TABLES

  if (requestedTable && tablesToProcess.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Table "${requestedTable}" not found in synced tables`,
    })
  }

  const schemas: Record<string, string> = {}

  for (const tableName of tablesToProcess) {
    try {
      // Get column information from information_schema
      const columnsResult = await db.execute(sql`
        SELECT 
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `)

      // Get primary key constraints
      const constraintsResult = await db.execute(sql`
        SELECT 
          tc.constraint_type,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = ${tableName}
          AND tc.constraint_type = 'PRIMARY KEY'
      `)

      // Extract rows from results
      type ColumnRow = {
        column_name: string
        data_type: string
        udt_name: string
        is_nullable: string
        column_default: string | null
        character_maximum_length: number | null
      }

      type ConstraintRow = {
        constraint_type: string
        column_name: string
      }

      const columns = ((columnsResult as any).rows || columnsResult) as ColumnRow[]
      const constraints = ((constraintsResult as any).rows || constraintsResult) as ConstraintRow[]

      const primaryKeys = new Set(
        Array.isArray(constraints) ? constraints.map((c: ConstraintRow) => c.column_name) : []
      )

      // Build CREATE TABLE statement
      const columnDefs = columns.map(col => {
        let typeName = TYPE_MAPPING[col.data_type] || col.data_type.toUpperCase()
        
        // Handle array types
        if (col.data_type === 'ARRAY') {
          typeName = col.udt_name.replace('_', '') + '[]'
        }

        // Handle varchar with length
        if (col.data_type === 'character varying' && col.character_maximum_length) {
          typeName = `VARCHAR(${col.character_maximum_length})`
        }

        let def = `${col.column_name} ${typeName}`

        // Add PRIMARY KEY
        if (primaryKeys.has(col.column_name)) {
          def += ' PRIMARY KEY'
        }

        // Add NOT NULL
        if (col.is_nullable === 'NO' && !primaryKeys.has(col.column_name)) {
          def += ' NOT NULL'
        }

        // Add DEFAULT (simplified - skip complex expressions)
        if (col.column_default && !col.column_default.includes('nextval')) {
          // Clean up default value
          let defaultVal = col.column_default
          // Convert now() to NOW()
          defaultVal = defaultVal.replace(/now\(\)/gi, 'NOW()')
          // Remove type casts for simple values
          if (defaultVal.includes('::')) {
            const parts = defaultVal.split('::')
            if (parts[0] === 'false' || parts[0] === 'true') {
              defaultVal = parts[0].toUpperCase()
            }
          }
          def += ` DEFAULT ${defaultVal}`
        }

        return `      ${def}`
      })

      const createSql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n${columnDefs.join(',\n')}\n    )`
      schemas[tableName] = createSql

    } catch (error) {
      console.error(`Failed to generate schema for ${tableName}:`, error)
      schemas[tableName] = `-- Error generating schema for ${tableName}`
    }
  }

  return {
    tables: tablesToProcess,
    schemas,
  }
})
