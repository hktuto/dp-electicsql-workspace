/**
 * Minio Seed Endpoint
 * 
 * Scans the seed folder and uploads files to Minio with DB records.
 * For development use only.
 * 
 * Seed folder structure: server/seed/minio/
 *   - system/
 *     - default-avatar.svg
 *     - logo.svg
 *   - templates/
 *     - ...
 * 
 * Files are uploaded with their folder path preserved.
 * Example: server/seed/minio/system/logo.svg -> system/logo.svg in Minio
 * 
 * Usage: POST /api/dev/minio-seed
 * Headers: x-dev-secret: docpal-dev-secret
 */

import { db } from 'hub:db'
import { eq } from 'drizzle-orm'
import { ensureBucket, uploadFile, fileExists, getMimeType } from '~~/server/utils/minio'
import { generateUUID } from '~~/server/utils/uuid'
import { files } from '~~/server/db/schema/files'
import { promises as fs } from 'fs'
import { join, relative, basename } from 'path'

// Seed folder path (relative to project root)
const SEED_FOLDER = 'server/seed/minio'

interface SeedResult {
  bucket: string
  seedFolder: string
  created: string[]
  skipped: string[]
  errors: string[]
}

/**
 * Recursively scan a directory and return all file paths
 */
async function scanDirectory(dir: string): Promise<string[]> {
  const files: string[] = []
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subFiles = await scanDirectory(fullPath)
        files.push(...subFiles)
      } else if (entry.isFile()) {
        // Skip hidden files and common non-asset files
        if (!entry.name.startsWith('.') && !entry.name.endsWith('.gitkeep')) {
          files.push(fullPath)
        }
      }
    }
  } catch (err: any) {
    // Directory doesn't exist or can't be read
    console.warn(`[Minio Seed] Could not scan directory ${dir}: ${err.message}`)
  }
  
  return files
}

/**
 * Get project root directory
 */
function getProjectRoot(): string {
  // In Nuxt, process.cwd() is the project root
  return process.cwd()
}

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
  const projectRoot = getProjectRoot()
  const seedFolderPath = join(projectRoot, SEED_FOLDER)
  
  const results: SeedResult = {
    bucket: bucketName,
    seedFolder: SEED_FOLDER,
    created: [],
    skipped: [],
    errors: [],
  }
  
  try {
    // 1. Ensure bucket exists
    await ensureBucket(bucketName)
    console.log(`[Minio Seed] Bucket "${bucketName}" ready`)
    
    // 2. Check if seed folder exists
    try {
      await fs.access(seedFolderPath)
    } catch {
      return {
        success: true,
        message: `Seed folder not found: ${SEED_FOLDER}. Create it and add files to seed.`,
        ...results,
      }
    }
    
    // 3. Scan seed folder for files
    const filePaths = await scanDirectory(seedFolderPath)
    
    if (filePaths.length === 0) {
      return {
        success: true,
        message: 'Seed folder is empty. Add files to seed.',
        ...results,
      }
    }
    
    console.log(`[Minio Seed] Found ${filePaths.length} files to seed`)
    
    // 4. Process each file
    for (const filePath of filePaths) {
      try {
        // Calculate object key (path in Minio)
        // e.g., /project/server/seed/minio/system/logo.svg -> system/logo.svg
        const objectKey = relative(seedFolderPath, filePath)
        const fileName = basename(filePath)
        
        // Check if already exists in Minio
        const existsInMinio = await fileExists(bucketName, objectKey)
        
        // Check if already exists in DB
        const existingRecord = await db
          .select({ id: files.id })
          .from(files)
          .where(eq(files.objectKey, objectKey))
          .limit(1)
        
        const existsInDb = existingRecord.length > 0
        
        // Skip if both exist
        if (existsInMinio && existsInDb) {
          results.skipped.push(objectKey)
          console.log(`[Minio Seed] Skipped (exists): ${objectKey}`)
          continue
        }
        
        // Read file content
        const fileContent = await fs.readFile(filePath)
        const fileStat = await fs.stat(filePath)
        const mimeType = getMimeType(fileName)
        
        // Upload to Minio if needed
        let etag: string | undefined
        if (!existsInMinio) {
          const uploadResult = await uploadFile({
            bucketName,
            objectName: objectKey,
            data: fileContent,
            size: fileStat.size,
            contentType: mimeType,
          })
          etag = uploadResult.etag
          console.log(`[Minio Seed] Uploaded: ${objectKey}`)
        }
        
        // Create DB record if needed
        if (!existsInDb) {
          const fileId = generateUUID()
          const now = new Date()
          
          // Determine owner type based on path
          const ownerType = objectKey.startsWith('system/') ? 'system' : 'system'
          
          await db.insert(files).values({
            id: fileId,
            bucket: bucketName,
            objectKey,
            fileName,
            mimeType,
            size: fileStat.size,
            etag: etag || null,
            ownerType,
            ownerId: null,
            workspaceId: null,
            uploadedBy: null,
            metadata: { seeded: true, seedPath: filePath },
            tags: ['seed', objectKey.split('/')[0]],  // Tag with top-level folder
            description: `Seeded from ${SEED_FOLDER}/${objectKey}`,
            isPublic: true,
            createdAt: now,
            updatedAt: now,
          })
          console.log(`[Minio Seed] Created DB record: ${objectKey}`)
        }
        
        results.created.push(objectKey)
        
      } catch (err: any) {
        const errorMsg = `${filePath}: ${err.message}`
        results.errors.push(errorMsg)
        console.error(`[Minio Seed] Error: ${errorMsg}`)
      }
    }
    
    return {
      success: true,
      message: `Minio seed completed. ${results.created.length} created, ${results.skipped.length} skipped.`,
      ...results,
    }
    
  } catch (err: any) {
    console.error('[Minio Seed] Error:', err)
    throw createError({
      statusCode: 500,
      message: `Minio seed failed: ${err.message}`,
    })
  }
})
