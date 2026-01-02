/**
 * File Upload API
 * 
 * Upload a file to Minio and track in database.
 * 
 * Usage: POST /api/files/upload
 * Content-Type: multipart/form-data
 * 
 * Form fields:
 * - file: The file to upload
 * - ownerType: 'system' | 'user' | 'workspace' | 'app'
 * - ownerId: (optional) Owner ID
 * - workspaceId: (optional) Workspace ID for workspace/app files
 * - folder: (optional) Custom folder path
 * - description: (optional) File description
 * - tags: (optional) JSON array of tags
 * - isPublic: (optional) 'true' or 'false'
 */

import { uploadFile, getMimeType, buildWorkspaceFilePath, buildUserFilePath, buildSystemFilePath } from '~~/server/utils/minio'
import { generateUUID } from '~~/server/utils/uuid'
import { files } from '~~/server/db/schema/files'
import type { FileOwnerType } from '#shared/types/db'
import { db } from 'hub:db'

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }
  
  const config = useRuntimeConfig()
  const bucketName = config.minio.bucket
  
  try {
    // Parse multipart form data
    const formData = await readMultipartFormData(event)
    
    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'No file uploaded',
      })
    }
    
    // Extract file and fields
    let fileData: { data: Buffer; filename?: string; type?: string } | null = null
    const fields: Record<string, string> = {}
    
    for (const part of formData) {
      if (part.filename) {
        // This is the file
        fileData = {
          data: part.data,
          filename: part.filename,
          type: part.type,
        }
      } else if (part.name) {
        // This is a form field
        fields[part.name] = part.data.toString('utf-8')
      }
    }
    
    if (!fileData || !fileData.filename) {
      throw createError({
        statusCode: 400,
        message: 'No file found in upload',
      })
    }
    
    // Parse fields
    const ownerType = (fields.ownerType || 'user') as FileOwnerType
    const ownerId = fields.ownerId || user.id
    const workspaceId = fields.workspaceId || null
    const folder = fields.folder || ''
    const description = fields.description || null
    const tags = fields.tags ? JSON.parse(fields.tags) : null
    const isPublic = fields.isPublic === 'true'
    
    // Generate file ID and object key
    const fileId = generateUUID()
    const timestamp = Date.now()
    const safeFileName = fileData.filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueFileName = `${timestamp}_${safeFileName}`
    
    // Build object key based on owner type
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
        if (!workspaceId) {
          throw createError({
            statusCode: 400,
            message: 'workspaceId is required for workspace/app files',
          })
        }
        objectKey = buildWorkspaceFilePath(workspaceId, folder ? `${folder}/${uniqueFileName}` : uniqueFileName)
        break
      default:
        objectKey = `uploads/${uniqueFileName}`
    }
    
    // Detect mime type
    const mimeType = fileData.type || getMimeType(fileData.filename)
    
    // Upload to Minio
    // Note: Sanitize metadata values to avoid invalid header characters
    const sanitizeHeaderValue = (value: string) => {
      // Remove or replace characters that are invalid in HTTP headers
      return value.replace(/[^\x20-\x7E]/g, '_').replace(/\s+/g, '_')
    }
    
    const uploadResult = await uploadFile({
      bucketName,
      objectName: objectKey,
      data: fileData.data,
      size: fileData.data.length,
      contentType: mimeType,
      metadata: {
        'x-amz-meta-file-id': fileId,
        'x-amz-meta-original-name': sanitizeHeaderValue(fileData.filename),
        'x-amz-meta-uploaded-by': user.id,
      },
    })
    
    // Save to database
    const now = new Date()
    
    const [fileRecord] = await db.insert(files).values({
      id: fileId,
      bucket: bucketName,
      objectKey,
      fileName: fileData.filename,
      mimeType,
      size: fileData.data.length,
      etag: uploadResult.etag,
      ownerType,
      ownerId,
      workspaceId,
      uploadedBy: user.id,
      metadata: {},
      tags,
      description,
      isPublic,
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
    console.error('[File Upload] Error:', err)
    
    if (err.statusCode) {
      throw err
    }
    
    throw createError({
      statusCode: 500,
      message: `Upload failed: ${err.message}`,
    })
  }
})

