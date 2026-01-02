/**
 * Confirm Upload API
 * 
 * After client uploads directly to Minio via presigned URL,
 * call this endpoint to create the database record.
 * 
 * Usage: POST /api/files/confirm
 * Body:
 * {
 *   "fileId": string,
 *   "objectKey": string,
 *   "fileName": string,
 *   "mimeType": string,
 *   "size": number,
 *   "ownerType": string,
 *   "ownerId": string,
 *   "workspaceId": string (optional),
 *   "description": string (optional),
 *   "tags": string[] (optional),
 *   "isPublic": boolean (optional)
 * }
 */

import { db } from 'hub:db'
import { getFileStat } from '~~/server/utils/minio'
import { files } from '~~/server/db/schema/files'
import type { FileOwnerType } from '#shared/types/db'

interface ConfirmRequest {
  fileId: string
  objectKey: string
  fileName: string
  mimeType: string
  size: number
  ownerType: FileOwnerType
  ownerId?: string
  workspaceId?: string
  description?: string
  tags?: string[]
  isPublic?: boolean
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
  
  const body = await readBody<ConfirmRequest>(event)
  const config = useRuntimeConfig()
  const bucketName = config.minio.bucket
  
  // Validate required fields
  if (!body.fileId || !body.objectKey || !body.fileName) {
    throw createError({
      statusCode: 400,
      message: 'fileId, objectKey, and fileName are required',
    })
  }
  
  try {
    // Verify file exists in Minio
    const stat = await getFileStat(bucketName, body.objectKey)
    
    // Save to database
    const now = new Date()
    
    const [fileRecord] = await db.insert(files).values({
      id: body.fileId,
      bucket: bucketName,
      objectKey: body.objectKey,
      fileName: body.fileName,
      mimeType: body.mimeType || stat.metaData?.['content-type'] || 'application/octet-stream',
      size: body.size || stat.size,
      etag: stat.etag,
      ownerType: body.ownerType || 'user',
      ownerId: body.ownerId || user.id,
      workspaceId: body.workspaceId || null,
      uploadedBy: user.id,
      metadata: {},
      tags: body.tags || null,
      description: body.description || null,
      isPublic: body.isPublic || false,
      createdAt: now,
      updatedAt: now,
    }).returning()
    
    return {
      success: true,
      file: {
        id: fileRecord.id,
        fileName: fileRecord.fileName,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size,
        objectKey: fileRecord.objectKey,
        isPublic: fileRecord.isPublic,
        createdAt: fileRecord.createdAt,
      },
    }
    
  } catch (err: any) {
    console.error('[File Confirm] Error:', err)
    
    // If file doesn't exist in Minio
    if (err.code === 'NotFound') {
      throw createError({
        statusCode: 404,
        message: 'File not found in storage. Upload may have failed.',
      })
    }
    
    if (err.statusCode) {
      throw err
    }
    
    throw createError({
      statusCode: 500,
      message: `Confirm failed: ${err.message}`,
    })
  }
})

