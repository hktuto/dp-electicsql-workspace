/**
 * File Conversions Schema
 * 
 * Tracks conversions/derivatives of files (thumbnails, previews, different formats, etc.)
 */

import { pgTable, text, uuid, integer, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { files } from './files'

/**
 * File Conversions table - tracks conversions/derivatives of files
 */
export const fileConversions = pgTable('file_conversions', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Source file
  sourceFileId: text('source_file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  // Version tracking
  sourceFileVersion: integer('source_file_version').notNull().default(1),
  
  // Conversion info
  name: text('name').notNull(),                     // e.g., 'thumbnail_small', 'preview', 'optimized'
  
  // Minio location (for converted file)
  bucket: text('bucket'),                           // Bucket where converted file is stored
  objectKey: text('object_key'),                    // Object key in Minio for converted file
  
  // File info (for converted file)
  fileName: text('file_name'),                      // Generated filename
  mimeType: text('mime_type').notNull(),            // Target mime type
  size: integer('size'),                            // Size in bytes (once completed)
  etag: text('etag'),                                // Minio ETag
  
  
  
  // Status tracking
  status: text('status').$type<'pending' | 'processing' | 'completed' | 'failed'>().notNull().default('pending'),
  
  // Processing info
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  
  // Error handling
  error: text('error'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  
  // Conversion parameters (e.g., {width: 200, height: 200, quality: 80})
  parameters: jsonb('parameters').$type<Record<string, any>>(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Find conversions by source file
  index('file_conversions_source_idx').on(table.sourceFileId),
  
  // Find pending conversions for workflow processing
  index('file_conversions_status_idx').on(table.status),
  
  // Unique constraint: one conversion name per source file + version
  uniqueIndex('file_conversions_unique_idx').on(table.sourceFileId, table.name, table.sourceFileVersion),
  
  // Index for querying by bucket + object key
  index('file_conversions_location_idx').on(table.bucket, table.objectKey),
])

/**
 * Type for inserting a new file conversion record
 */
export type NewFileConversion = typeof fileConversions.$inferInsert

/**
 * Type for selecting a file conversion record
 */
export type FileConversion = typeof fileConversions.$inferSelect

