import type { ColumnType } from '#shared/types/data-table'
import type { DataTableColumn } from '#shared/types/db'
import { db } from 'hub:db'
/**
 * Generate a short unique ID for table names
 * Format: dt_xxxxxxx (where x is alphanumeric)
 */
export function generateTableName(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'dt_'
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Map column type to PostgreSQL type
 */
export function mapColumnTypeToPostgres(type: ColumnType, config?: any): string {
  switch (type) {
    case 'text':
      return config?.maxLength ? `VARCHAR(${config.maxLength})` : 'VARCHAR(255)'
    
    case 'long_text':
      return 'TEXT'
    
    case 'number':
      return config?.decimals ? `DECIMAL(15, ${config.decimals})` : 'DOUBLE PRECISION'
    
    case 'currency':
      return `DECIMAL(15, ${config?.precision || 2})`
    
    case 'date':
      return config?.displayFormat === 'time' ? 'TIME' : 'TIMESTAMP'
    
    case 'checkbox':
    case 'switch':
      return 'BOOLEAN'
    
    case 'email':
    case 'phone':
    case 'url':
      return 'VARCHAR(255)'
    
    case 'select':
      return 'VARCHAR(255)'
    
    case 'multi_select':
      return 'TEXT[]'
    
    case 'color':
      return 'VARCHAR(50)'
    
    case 'geolocation':
      return 'JSONB' // Store as {lat: number, lng: number}
    
    case 'relation':
      return 'UUID'
    
    case 'lookup':
    case 'formula':
      return 'TEXT' // Computed values stored as text
    
    case 'attachment':
      return 'JSONB' // Store as array of {url, name, size, type}
    
    default:
      return 'TEXT'
  }
}

/**
 * Generate CREATE TABLE SQL for a new dynamic table
 */
export function generateCreateTableSql(tableName: string): string {
  return `
    CREATE TABLE ${tableName} (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_by UUID REFERENCES users(id),
      updated_by UUID REFERENCES users(id),
      _update_token TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    
    -- Create index on created_at for sorting
    CREATE INDEX ${tableName}_created_at_idx ON ${tableName}(created_at);
    
    -- Create index on updated_at for sorting
    CREATE INDEX ${tableName}_updated_at_idx ON ${tableName}(updated_at);
  `.trim()
}

/**
 * Generate DROP TABLE SQL
 */
export function generateDropTableSql(tableName: string): string {
  return `DROP TABLE IF EXISTS ${tableName} CASCADE;`
}

/**
 * Generate ADD COLUMN SQL
 */
export function generateAddColumnSql(
  tableName: string,
  column: Pick<DataTableColumn, 'name' | 'type' | 'required' | 'defaultValue' | 'isUnique' | 'config'>
): string {
  const pgType = mapColumnTypeToPostgres(column.type, column.config)
  const notNull = column.required ? ' NOT NULL' : ''
  const defaultVal = column.defaultValue ? ` DEFAULT '${column.defaultValue}'` : ''
  const unique = column.isUnique ? ' UNIQUE' : ''
  
  let sql = `ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${pgType}${notNull}${defaultVal}${unique};`
  
  // Add index for frequently queried column types
  if (['relation', 'select', 'date'].includes(column.type)) {
    sql += `\nCREATE INDEX ${tableName}_${column.name}_idx ON ${tableName}(${column.name});`
  }
  
  return sql
}

/**
 * Generate DROP COLUMN SQL
 */
export function generateDropColumnSql(tableName: string, columnName: string): string {
  return `ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${columnName} CASCADE;`
}

/**
 * Generate ALTER COLUMN SQL for type changes
 */
export function generateAlterColumnSql(
  tableName: string,
  column: Pick<DataTableColumn, 'name' | 'type' | 'required' | 'defaultValue' | 'isUnique' | 'config'>
): string {
  const pgType = mapColumnTypeToPostgres(column.type, column.config)
  const sqls: string[] = []
  
  // Change type (may cause data loss)
  sqls.push(`ALTER TABLE ${tableName} ALTER COLUMN ${column.name} TYPE ${pgType} USING ${column.name}::${pgType};`)
  
  // Change NOT NULL constraint
  if (column.required) {
    sqls.push(`ALTER TABLE ${tableName} ALTER COLUMN ${column.name} SET NOT NULL;`)
  } else {
    sqls.push(`ALTER TABLE ${tableName} ALTER COLUMN ${column.name} DROP NOT NULL;`)
  }
  
  // Change default value
  if (column.defaultValue) {
    sqls.push(`ALTER TABLE ${tableName} ALTER COLUMN ${column.name} SET DEFAULT '${column.defaultValue}';`)
  } else {
    sqls.push(`ALTER TABLE ${tableName} ALTER COLUMN ${column.name} DROP DEFAULT;`)
  }
  
  return sqls.join('\n')
}

/**
 * Generate RENAME COLUMN SQL
 */
export function generateRenameColumnSql(tableName: string, oldName: string, newName: string): string {
  return `ALTER TABLE ${tableName} RENAME COLUMN ${oldName} TO ${newName};`
}

/**
 * Validate table name (only alphanumeric and underscore)
 */
export function validateTableName(tableName: string): boolean {
  return /^dt_[a-z0-9_]+$/.test(tableName)
}

/**
 * Validate column name (snake_case, no reserved words)
 */
export function validateColumnName(columnName: string): boolean {
  const reserved = ['id', 'created_by', 'updated_by', '_update_token', 'created_at', 'updated_at', 'select', 'from', 'where', 'order', 'group', 'having']
  return /^[a-z][a-z0-9_]*$/.test(columnName) && !reserved.includes(columnName.toLowerCase())
}

/**
 * Execute raw SQL on the database
 */
export async function executeSql(sql: string) {
  return await db.execute(sql)
}

