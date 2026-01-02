/**
 * File Download API
 * 
 * Download a file by ID.
 * 
 * Usage: GET /api/files/:id
 * Query params:
 * - download: 'true' to force download instead of inline display
 */

import { db } from 'hub:db'
import { eq, and, isNull } from 'drizzle-orm'
import { downloadFile } from '~/server/utils/minio'
import { files } from '~/server/db/schema/files'

export default defineEventHandler(async (event) => {
  const fileId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const forceDownload = query.download === 'true'
  
  if (!fileId) {
    throw createError({
      statusCode: 400,
      message: 'File ID is required',
    })
  }
  
  try {
    // Get file record
    const [fileRecord] = await db
      .select()
      .from(files)
      .where(and(
        eq(files.id, fileId),
        isNull(files.deletedAt)  // Not soft-deleted
      ))
      .limit(1)
    
    if (!fileRecord) {
      throw createError({
        statusCode: 404,
        message: 'File not found',
      })
    }
    
    // Check access
    // If file is not public, user must be authenticated
    if (!fileRecord.isPublic) {
      const user = event.context.user
      if (!user) {
        throw createError({
          statusCode: 401,
          message: 'Unauthorized',
        })
      }
      
      // TODO: Add more granular permission checks
      // e.g., check if user has access to workspace
    }
    
    // Get file from Minio
    const stream = await downloadFile(fileRecord.bucket, fileRecord.objectKey)
    
    // Set response headers
    setHeader(event, 'Content-Type', fileRecord.mimeType)
    setHeader(event, 'Content-Length', fileRecord.size.toString())
    setHeader(event, 'ETag', fileRecord.etag || '')
    
    // Set disposition (inline or download)
    const disposition = forceDownload ? 'attachment' : 'inline'
    setHeader(
      event,
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(fileRecord.fileName)}"`
    )
    
    // Cache control for public files
    if (fileRecord.isPublic) {
      setHeader(event, 'Cache-Control', 'public, max-age=31536000')
    } else {
      setHeader(event, 'Cache-Control', 'private, no-cache')
    }
    
    return stream
    
  } catch (err: any) {
    console.error('[File Download] Error:', err)
    
    if (err.statusCode) {
      throw err
    }
    
    throw createError({
      statusCode: 500,
      message: `Download failed: ${err.message}`,
    })
  }
})

