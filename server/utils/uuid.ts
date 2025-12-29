import { v7 as uuidv7 } from 'uuid'

/**
 * UUID Utilities
 * 
 * Using UUID v7 which is time-ordered (sortable) for better database indexing.
 * Required by Electric SQL - IDs must be generated client-side.
 */

/**
 * Generate a UUID v7
 * Time-ordered UUIDs that are sortable and better for database performance
 */
export function generateUUID(): string {
  return uuidv7()
}
