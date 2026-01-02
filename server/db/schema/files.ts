/**
 * Files Schema
 * 
 * Tracks files stored in Minio for querying, ownership, and audit.
 */

import { pgTable, text, integer, timestamp, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'
import { workspaces } from './workspaces'

/**
 * File ownership type
 */
export type FileOwnerType = 'system' | 'user' | 'workspace' | 'app'

/**
 * Files table - tracks all files stored in Minio
 */
export const files = pgTable('files', {
  // Primary key
  id: text('id').primaryKey(),
  
  // Minio location
  bucket: text('bucket').notNull(),
  objectKey: text('object_key').notNull(),      // Full path in bucket
  
  // File info
  fileName: text('file_name').notNull(),        // Original filename
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),              // Size in bytes
  etag: text('etag'),                           // Minio ETag for versioning
  
  // Ownership
  ownerType: text('owner_type').notNull().$type<FileOwnerType>(),
  ownerId: text('owner_id'),                    // User ID, Workspace ID, App ID, or null for system
  
  // For workspace/app files, link to workspace
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // Upload info
  uploadedBy: text('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),  // Custom metadata
  tags: jsonb('tags').$type<string[]>(),                     // Searchable tags
  description: text('description'),
  
  // Access control
  isPublic: boolean('is_public').default(false),
  
  // Soft delete
  deletedAt: timestamp('deleted_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Unique constraint on bucket + object key
  uniqueIndex('files_bucket_object_key_idx').on(table.bucket, table.objectKey),
  
  // Index for querying by owner
  index('files_owner_idx').on(table.ownerType, table.ownerId),
  
  // Index for querying by workspace
  index('files_workspace_idx').on(table.workspaceId),
  
  // Index for querying by uploader
  index('files_uploaded_by_idx').on(table.uploadedBy),
  
  // Index for finding non-deleted files
  index('files_not_deleted_idx').on(table.deletedAt),
])

/**
 * Type for inserting a new file record
 */
export type NewFile = typeof files.$inferInsert

/**
 * Type for selecting a file record
 */
export type File = typeof files.$inferSelect

