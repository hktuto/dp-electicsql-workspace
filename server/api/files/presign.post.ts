/**
 * Presigned URL API
 * 
 * Generate presigned URLs for direct upload/download to Minio.
 * Useful for large files or when you want the client to upload directly.
 * 
 * Usage: POST /api/files/presign
 * Body:
 * {
 *   "action": "upload" | "download",
 *   "fileId": string (for download),
 *   "fileName": string (for upload),
 *   "contentType": string (for upload),
 *   "ownerType": string (for upload),
 *   "ownerId": string (for upload),
 *   "workspaceId": string (for upload, optional),
 *   "folder": string (for upload, optional),
 *   "expirySeconds": number (optional, default 3600)
 * }
 */

import { db } from 'hub:db'
import { eq, and, isNull } from 'drizzle-orm'
import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  buildWorkspaceFilePath,
  buildUserFilePath,
  buildSystemFilePath,
} from '~/server/utils/minio'
import { generateUUID } from '~/server/utils/uuid'
import { files, type FileOwnerType } from '~/server/db/schema/files'

interface PresignRequest {
  action: 'upload' | 'download'
  fileId?: string
  fileName?: string
  contentType?: string
  ownerType?: FileOwnerType
  ownerId?: string
  workspaceId?: string
  folder?: string
  expirySeconds?: number
}

export default defineEventHandler(async (event) => {
  // Must be authenticated
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }
  
  const body = await readBody<PresignRequest>(event)
  const config = useRuntimeConfig()
  const bucketName = config.minio.bucket
  const expirySeconds = body.expirySeconds || 3600
  
  try {
    if (body.action === 'download') {
      // Generate download URL
      if (!body.fileId) {
        throw createError({
          statusCode: 400,
          message: 'fileId is required for download',
        })
      }
      
      // Get file record
      const [fileRecord] = await db
        .select()
        .from(files)
        .where(and(
          eq(files.id, body.fileId),
          isNull(files.deletedAt)
        ))
        .limit(1)
      
      if (!fileRecord) {
        throw createError({
          statusCode: 404,
          message: 'File not found',
        })
      }
      
      // Check access for non-public files
      if (!fileRecord.isPublic) {
        // TODO: Add more granular permission checks
      }
      
      const url = await getPresignedDownloadUrl(
        fileRecord.bucket,
        fileRecord.objectKey,
        expirySeconds
      )
      
      return {
        success: true,
        action: 'download',
        url,
        expiresIn: expirySeconds,
        file: {
          id: fileRecord.id,
          fileName: fileRecord.fileName,
          mimeType: fileRecord.mimeType,
          size: fileRecord.size,
        },
      }
      
    } else if (body.action === 'upload') {
      // Generate upload URL
      if (!body.fileName) {
        throw createError({
          statusCode: 400,
          message: 'fileName is required for upload',
        })
      }
      
      const ownerType = body.ownerType || 'user'
      const ownerId = body.ownerId || user.id
      const folder = body.folder || ''
      
      // Generate file ID and object key
      const fileId = generateUUID()
      const timestamp = Date.now()
      const safeFileName = body.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
      const uniqueFileName = `${timestamp}_${safeFileName}`
      
      // Build object key
      let objectKey: string
      switch (ownerType) {
        case 'system':
          objectKey = buildSystemFilePath(folder || 'uploads', uniqueFileName)
          break
        case 'user':
          objectKey = buildUserFilePath(ownerId, folder ? `${folder}/${uniqueFileName}` : uniqueFileName)
          break
        case 'workspace':
        case 'app':
          if (!body.workspaceId) {
            throw createError({
              statusCode: 400,
              message: 'workspaceId is required for workspace/app files',
            })
          }
          objectKey = buildWorkspaceFilePath(
            body.workspaceId,
            folder ? `${folder}/${uniqueFileName}` : uniqueFileName
          )
          break
        default:
          objectKey = `uploads/${uniqueFileName}`
      }
      
      const url = await getPresignedUploadUrl(bucketName, objectKey, expirySeconds)
      
      return {
        success: true,
        action: 'upload',
        url,
        expiresIn: expirySeconds,
        fileId,
        objectKey,
        bucket: bucketName,
        // Client should call /api/files/confirm after upload
        confirmUrl: `/api/files/confirm`,
      }
      
    } else {
      throw createError({
        statusCode: 400,
        message: 'Invalid action. Use "upload" or "download"',
      })
    }
    
  } catch (err: any) {
    console.error('[Presign] Error:', err)
    
    if (err.statusCode) {
      throw err
    }
    
    throw createError({
      statusCode: 500,
      message: `Presign failed: ${err.message}`,
    })
  }
})

