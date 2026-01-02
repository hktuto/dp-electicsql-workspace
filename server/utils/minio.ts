/**
 * Minio Client Utility
 * 
 * Provides upload, download, and management functions for Minio object storage.
 */

import { Client } from 'minio'

// ============================================
// Client Singleton
// ============================================

let minioClient: Client | null = null

/**
 * Get or create Minio client instance
 */
export function getMinioClient(): Client {
  if (!minioClient) {
    const config = useRuntimeConfig()
    
    minioClient = new Client({
      endPoint: config.minio.endpoint || 'localhost',
      port: parseInt(config.minio.port || '9000'),
      useSSL: config.minio.useSSL === 'true',
      accessKey: config.minio.accessKey || 'minioadmin',
      secretKey: config.minio.secretKey || 'minioadmin',
    })
  }
  
  return minioClient
}

// ============================================
// Bucket Operations
// ============================================

/**
 * Ensure bucket exists, create if not
 */
export async function ensureBucket(bucketName: string): Promise<void> {
  const client = getMinioClient()
  
  const exists = await client.bucketExists(bucketName)
  if (!exists) {
    await client.makeBucket(bucketName)
    console.log(`[Minio] Created bucket: ${bucketName}`)
  }
}

/**
 * Set bucket policy for public read (optional)
 */
export async function setBucketPublicRead(bucketName: string, prefix: string = '*'): Promise<void> {
  const client = getMinioClient()
  
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucketName}/${prefix}`],
      },
    ],
  }
  
  await client.setBucketPolicy(bucketName, JSON.stringify(policy))
  console.log(`[Minio] Set public read policy on ${bucketName}/${prefix}`)
}

// ============================================
// Upload Operations
// ============================================

export interface UploadOptions {
  bucketName: string
  objectName: string          // Full path in bucket (e.g., "workspaces/123/apps/booking/logo.png")
  data: Buffer | Readable
  size?: number
  contentType?: string
  metadata?: Record<string, string>
}

export interface UploadResult {
  bucketName: string
  objectName: string
  etag: string
  versionId?: string
}

import type { Readable } from 'stream'

/**
 * Upload a file to Minio
 */
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const client = getMinioClient()
  
  const metaData: Record<string, string> = {
    'Content-Type': options.contentType || 'application/octet-stream',
    ...options.metadata,
  }
  
  const result = await client.putObject(
    options.bucketName,
    options.objectName,
    options.data,
    options.size,
    metaData
  )
  
  return {
    bucketName: options.bucketName,
    objectName: options.objectName,
    etag: result.etag,
    versionId: result.versionId ?? undefined,
  }
}

/**
 * Upload from a file path (server-side)
 */
export async function uploadFromPath(
  bucketName: string,
  objectName: string,
  filePath: string,
  contentType?: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  const client = getMinioClient()
  
  const metaData: Record<string, string> = {
    'Content-Type': contentType || 'application/octet-stream',
    ...metadata,
  }
  
  const result = await client.fPutObject(bucketName, objectName, filePath, metaData)
  
  return {
    bucketName,
    objectName,
    etag: result.etag,
    versionId: result.versionId ?? undefined,
  }
}

// ============================================
// Download Operations
// ============================================

/**
 * Get file as stream
 */
export async function downloadFile(
  bucketName: string,
  objectName: string
): Promise<Readable> {
  const client = getMinioClient()
  return await client.getObject(bucketName, objectName)
}

/**
 * Download to a file path (server-side)
 */
export async function downloadToPath(
  bucketName: string,
  objectName: string,
  filePath: string
): Promise<void> {
  const client = getMinioClient()
  await client.fGetObject(bucketName, objectName, filePath)
}

/**
 * Get file as Buffer
 */
export async function downloadFileAsBuffer(
  bucketName: string,
  objectName: string
): Promise<Buffer> {
  const stream = await downloadFile(bucketName, objectName)
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

// ============================================
// Presigned URLs
// ============================================

/**
 * Generate presigned URL for download (GET)
 * @param expirySeconds - URL expiry in seconds (default: 1 hour)
 */
export async function getPresignedDownloadUrl(
  bucketName: string,
  objectName: string,
  expirySeconds: number = 3600
): Promise<string> {
  const client = getMinioClient()
  return await client.presignedGetObject(bucketName, objectName, expirySeconds)
}

/**
 * Generate presigned URL for upload (PUT)
 * @param expirySeconds - URL expiry in seconds (default: 1 hour)
 */
export async function getPresignedUploadUrl(
  bucketName: string,
  objectName: string,
  expirySeconds: number = 3600
): Promise<string> {
  const client = getMinioClient()
  return await client.presignedPutObject(bucketName, objectName, expirySeconds)
}

// ============================================
// File Management
// ============================================

/**
 * Check if file exists
 */
export async function fileExists(
  bucketName: string,
  objectName: string
): Promise<boolean> {
  const client = getMinioClient()
  
  try {
    await client.statObject(bucketName, objectName)
    return true
  } catch (err: any) {
    if (err.code === 'NotFound') {
      return false
    }
    throw err
  }
}

/**
 * Get file metadata/stats
 */
export async function getFileStat(
  bucketName: string,
  objectName: string
) {
  const client = getMinioClient()
  return await client.statObject(bucketName, objectName)
}

/**
 * Delete a file
 */
export async function deleteFile(
  bucketName: string,
  objectName: string
): Promise<void> {
  const client = getMinioClient()
  await client.removeObject(bucketName, objectName)
}

/**
 * Delete multiple files
 */
export async function deleteFiles(
  bucketName: string,
  objectNames: string[]
): Promise<void> {
  const client = getMinioClient()
  await client.removeObjects(bucketName, objectNames)
}

/**
 * List files in a directory/prefix
 */
export async function listFiles(
  bucketName: string,
  prefix: string = '',
  recursive: boolean = true
): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
  const client = getMinioClient()
  
  return new Promise((resolve, reject) => {
    const files: Array<{ name: string; size: number; lastModified: Date }> = []
    const stream = client.listObjects(bucketName, prefix, recursive)
    
    stream.on('data', (obj) => {
      if (obj.name && obj.size !== undefined && obj.lastModified !== undefined) {
        files.push({
          name: obj.name,
          size: obj.size,
          lastModified: obj.lastModified,
        })
      }
    })
    stream.on('end', () => resolve(files))
    stream.on('error', reject)
  })
}

/**
 * Copy a file within Minio
 */
export async function copyFile(
  sourceBucket: string,
  sourceObject: string,
  destBucket: string,
  destObject: string
): Promise<void> {
  const client = getMinioClient()
  
  await client.copyObject(
    destBucket,
    destObject,
    `/${sourceBucket}/${sourceObject}`
  )
}

// ============================================
// Path Helpers
// ============================================

/**
 * Build object path for app files
 */
export function buildAppFilePath(
  workspaceId: string,
  appId: string,
  fileName: string
): string {
  return `workspaces/${workspaceId}/apps/${appId}/${fileName}`
}

/**
 * Build object path for workspace files
 */
export function buildWorkspaceFilePath(
  workspaceId: string,
  fileName: string
): string {
  return `workspaces/${workspaceId}/${fileName}`
}

/**
 * Build object path for user files
 */
export function buildUserFilePath(
  userId: string,
  fileName: string
): string {
  return `users/${userId}/${fileName}`
}

/**
 * Build object path for system files
 */
export function buildSystemFilePath(
  category: string,
  fileName: string
): string {
  return `system/${category}/${fileName}`
}

// ============================================
// Mime Type Detection
// ============================================

const MIME_TYPES: Record<string, string> = {
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  
  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  
  // Text
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  
  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.rar': 'application/vnd.rar',
  
  // Media
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0] || ''
  return MIME_TYPES[ext] || 'application/octet-stream'
}

