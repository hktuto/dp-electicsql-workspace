/**
 * File Delete API
 * 
 * Soft-delete a file by ID.
 * 
 * Usage: DELETE /api/files/:id
 * Query params:
 * - permanent: 'true' to permanently delete (also removes from Minio)
 */

import { db } from 'hub:db'
import { eq, and, isNull } from 'drizzle-orm'
import { deleteFile as deleteMinioFile } from '~/server/utils/minio'
import { files } from '~/server/db/schema/files'

export default defineEventHandler(async (event) => {
  const fileId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const permanent = query.permanent === 'true'
  
  if (!fileId) {
    throw createError({
      statusCode: 400,
      message: 'File ID is required',
    })
  }
  
  // Must be authenticated
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }
  
  try {
    // Get file record
    const [fileRecord] = await db
      .select()
      .from(files)
      .where(and(
        eq(files.id, fileId),
        isNull(files.deletedAt)
      ))
      .limit(1)
    
    if (!fileRecord) {
      throw createError({
        statusCode: 404,
        message: 'File not found',
      })
    }
    
    // Check ownership
    // TODO: Add more granular permission checks
    const canDelete = 
      fileRecord.uploadedBy === user.id ||
      fileRecord.ownerId === user.id
      // || user has admin role for workspace
    
    if (!canDelete) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to delete this file',
      })
    }
    
    if (permanent) {
      // Permanently delete from Minio and DB
      await deleteMinioFile(fileRecord.bucket, fileRecord.objectKey)
      await db.delete(files).where(eq(files.id, fileId))
      
      return {
        success: true,
        message: 'File permanently deleted',
        fileId,
      }
    } else {
      // Soft delete (just mark as deleted)
      await db
        .update(files)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(files.id, fileId))
      
      return {
        success: true,
        message: 'File deleted',
        fileId,
      }
    }
    
  } catch (err: any) {
    console.error('[File Delete] Error:', err)
    
    if (err.statusCode) {
      throw err
    }
    
    throw createError({
      statusCode: 500,
      message: `Delete failed: ${err.message}`,
    })
  }
})

