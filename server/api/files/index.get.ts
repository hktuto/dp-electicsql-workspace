/**
 * List Files API
 * 
 * List files with filtering and pagination.
 * 
 * Usage: GET /api/files
 * Query params:
 * - ownerType: 'system' | 'user' | 'workspace' | 'app'
 * - ownerId: Filter by owner ID
 * - workspaceId: Filter by workspace ID
 * - mimeType: Filter by mime type (prefix match, e.g., 'image/')
 * - search: Search in fileName and description
 * - limit: Number of results (default 50, max 100)
 * - offset: Pagination offset
 * - includeDeleted: 'true' to include soft-deleted files
 */

import { db } from 'hub:db'
import { eq, and, like, isNull, or, desc } from 'drizzle-orm'
import { files } from '~~/server/db/schema/files'
import type { FileOwnerType } from '#shared/types/db'

export default defineEventHandler(async (event) => {
  // Must be authenticated
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }
  
  const query = getQuery(event)
  
  // Parse query params
  const ownerType = query.ownerType as FileOwnerType | undefined
  const ownerId = query.ownerId as string | undefined
  const workspaceId = query.workspaceId as string | undefined
  const mimeType = query.mimeType as string | undefined
  const search = query.search as string | undefined
  const limit = Math.min(parseInt(query.limit as string) || 50, 100)
  const offset = parseInt(query.offset as string) || 0
  const includeDeleted = query.includeDeleted === 'true'
  
  try {
    // Build conditions array
    const conditions = []
    
    // Filter by owner type
    if (ownerType) {
      conditions.push(eq(files.ownerType, ownerType))
    }
    
    // Filter by owner ID
    if (ownerId) {
      conditions.push(eq(files.ownerId, ownerId))
    }
    
    // Filter by workspace
    if (workspaceId) {
      conditions.push(eq(files.workspaceId, workspaceId))
    }
    
    // Filter by mime type (prefix)
    if (mimeType) {
      conditions.push(like(files.mimeType, `${mimeType}%`))
    }
    
    // Search
    if (search) {
      conditions.push(
        or(
          like(files.fileName, `%${search}%`),
          like(files.description, `%${search}%`)
        )
      )
    }
    
    // Exclude deleted unless requested
    if (!includeDeleted) {
      conditions.push(isNull(files.deletedAt))
    }
    
    // Execute query
    const results = await db
      .select({
        id: files.id,
        fileName: files.fileName,
        mimeType: files.mimeType,
        size: files.size,
        objectKey: files.objectKey,
        ownerType: files.ownerType,
        ownerId: files.ownerId,
        workspaceId: files.workspaceId,
        uploadedBy: files.uploadedBy,
        description: files.description,
        tags: files.tags,
        isPublic: files.isPublic,
        deletedAt: files.deletedAt,
        createdAt: files.createdAt,
        updatedAt: files.updatedAt,
      })
      .from(files)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(files.createdAt))
      .limit(limit)
      .offset(offset)
    
    // Get total count
    const countResult = await db
      .select({ count: files.id })
      .from(files)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
    
    return {
      success: true,
      files: results,
      pagination: {
        limit,
        offset,
        total: countResult.length,
        hasMore: countResult.length > offset + limit,
      },
    }
    
  } catch (err: any) {
    console.error('[List Files] Error:', err)
    
    throw createError({
      statusCode: 500,
      message: `List files failed: ${err.message}`,
    })
  }
})

