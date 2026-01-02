/**
 * Minio Clear Endpoint
 * 
 * Deletes all files from the Minio bucket.
 * For development use only - use with caution!
 * 
 * Usage: POST /api/dev/minio-clear
 * Headers: x-dev-secret: docpal-dev-secret
 */

import { listFiles, deleteFiles } from '~~/server/utils/minio'

export default defineEventHandler(async (event) => {
  // Security check for development
  const devSecret = getHeader(event, 'x-dev-secret')
  if (devSecret !== 'docpal-dev-secret') {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: Invalid dev secret',
    })
  }
  
  const config = useRuntimeConfig()
  const bucketName = config.minio.bucket
  
  try {
    console.log(`[Minio Clear] Listing all files in bucket "${bucketName}"...`)
    
    // List all files in the bucket
    const files = await listFiles(bucketName, '', true)
    
    if (files.length === 0) {
      return {
        success: true,
        message: 'Bucket is already empty',
        bucket: bucketName,
        deletedCount: 0,
      }
    }
    
    console.log(`[Minio Clear] Found ${files.length} files to delete`)
    
    // Extract object names
    const objectNames = files.map(f => f.name)
    
    // Delete all files in batches (Minio supports batch delete)
    // Split into chunks of 1000 (Minio's limit for removeObjects)
    const BATCH_SIZE = 1000
    let deletedCount = 0
    
    for (let i = 0; i < objectNames.length; i += BATCH_SIZE) {
      const batch = objectNames.slice(i, i + BATCH_SIZE)
      await deleteFiles(bucketName, batch)
      deletedCount += batch.length
      console.log(`[Minio Clear] Deleted ${deletedCount}/${objectNames.length} files`)
    }
    
    console.log(`[Minio Clear] Successfully deleted all ${deletedCount} files`)
    
    return {
      success: true,
      message: `Deleted ${deletedCount} files from bucket`,
      bucket: bucketName,
      deletedCount,
      deletedFiles: objectNames,
    }
    
  } catch (err: any) {
    console.error('[Minio Clear] Error:', err)
    throw createError({
      statusCode: 500,
      message: `Minio clear failed: ${err.message}`,
    })
  }
})

