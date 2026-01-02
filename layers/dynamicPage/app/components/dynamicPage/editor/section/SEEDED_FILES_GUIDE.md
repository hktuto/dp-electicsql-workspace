# How to Query Seeded Files

## Overview

Files seeded via `/api/dev/minio-seed` are stored with specific metadata that makes them easy to query and filter.

## Seeded File Characteristics

When files are seeded from `server/seed/minio/`, they are created with:

```typescript
{
  ownerType: 'system',           // Always 'system' for seeded files
  ownerId: null,                 // No specific owner
  workspaceId: null,             // Not tied to any workspace
  isPublic: true,                // Publicly accessible
  tags: ['seed', 'system'],      // Tagged with 'seed' and folder name
  metadata: {
    seeded: true,                // Flag to identify seeded files
    seedPath: '/path/to/file'    // Original seed path
  },
  description: 'Seeded from server/seed/minio/...'
}
```

## Query Methods

### 1. Query All Seeded Files

To get all seeded files, filter by `ownerType: 'system'`:

```typescript
// In your component or composable
const { $api } = useNuxtApp()

const response = await $api('/files?ownerType=system')
// Returns all system files (including seeded files)
```

### 2. Query by Folder/Path

Seeded files preserve their folder structure in the `objectKey`. For example:
- `server/seed/minio/system/logo.svg` → `objectKey: 'system/logo.svg'`
- `server/seed/minio/system/icons/home.svg` → `objectKey: 'system/icons/home.svg'`

To filter by folder, you can:

**Option A: Client-side filtering**
```typescript
const response = await $api('/files?ownerType=system')
const systemFiles = response.files.filter(file => 
  file.objectKey.startsWith('system/')
)
```

**Option B: Use search parameter**
```typescript
// Search for files in 'system' folder
const response = await $api('/files?ownerType=system&search=system/')
```

### 3. Query by File Type

Filter seeded images, documents, etc.:

```typescript
// Get all seeded images
const response = await $api('/files?ownerType=system&mimeType=image/')

// Get all seeded SVGs
const response = await $api('/files?ownerType=system&mimeType=image/svg')

// Get all seeded PDFs
const response = await $api('/files?ownerType=system&mimeType=application/pdf')
```

### 4. Query by Tags

Seeded files are tagged with:
- `'seed'` - Identifies it as a seeded file
- Folder name (e.g., `'system'`, `'templates'`)

```typescript
// Note: Current API doesn't support tag filtering directly
// You'll need to filter client-side:
const response = await $api('/files?ownerType=system')
const seededFiles = response.files.filter(file => 
  file.tags?.includes('seed')
)
```

### 5. Search by Name

```typescript
// Search for logo files
const response = await $api('/files?ownerType=system&search=logo')

// Search for avatar files
const response = await $api('/files?ownerType=system&search=avatar')
```

## Complete Example in File Manager

Here's how to add a "System Files" filter to the file manager:

```vue
<script setup lang="ts">
// Add to file type filters
const fileTypes = [
  { label: 'All Files', value: 'all', icon: 'mdi:file' },
  { label: 'Seeded Files', value: 'system', icon: 'mdi:package-variant' }, // NEW
  { label: 'Images', value: 'image/', icon: 'mdi:file-image' },
  { label: 'Documents', value: 'application/', icon: 'mdi:file-document' },
  // ...
]

// Update loadFiles function
async function loadFiles() {
  const params: any = {
    search: fileManager.searchQuery.value || undefined,
  }
  
  // Filter by owner type for seeded files
  if (fileTypeFilter.value === 'system') {
    params.ownerType = 'system'
  } else if (fileTypeFilter.value !== 'all') {
    params.mimeType = fileTypeFilter.value
  }
  
  await fileManager.listFiles(params)
}
</script>
```

## Using Seeded Files in Dynamic Components

### Get File URL

```typescript
// Get public URL (no authentication required for public files)
const fileUrl = `/api/files/${fileId}`

// Or get presigned URL (for temporary access)
const response = await $api('/files/presign', {
  method: 'POST',
  body: {
    action: 'download',
    fileId: 'file-uuid',
    expirySeconds: 3600
  }
})
const presignedUrl = response.url
```

### Example: Using Seeded Logo

```typescript
// 1. Query for logo file
const response = await $api('/files?ownerType=system&search=logo')
const logoFile = response.files[0]

// 2. Use in component
const logoUrl = `/api/files/${logoFile.id}`

// 3. In template
<img :src="logoUrl" alt="Logo" />
```

## API Endpoint Reference

### GET /api/files

**Query Parameters:**
- `ownerType` - Filter by owner type (`'system'`, `'user'`, `'workspace'`, `'app'`)
- `ownerId` - Filter by owner ID
- `workspaceId` - Filter by workspace ID
- `mimeType` - Filter by MIME type (prefix match, e.g., `'image/'`)
- `search` - Search in fileName and description
- `limit` - Number of results (default 50, max 100)
- `offset` - Pagination offset
- `includeDeleted` - Include soft-deleted files (`'true'` or `'false'`)

**Response:**
```typescript
{
  success: true,
  files: [
    {
      id: string,
      fileName: string,
      mimeType: string,
      size: number,
      objectKey: string,
      ownerType: string,
      ownerId: string | null,
      workspaceId: string | null,
      uploadedBy: string | null,
      description: string | null,
      tags: string[] | null,
      isPublic: boolean,
      createdAt: string,
      updatedAt: string,
      deletedAt: string | null
    }
  ],
  pagination: {
    limit: number,
    offset: number,
    total: number,
    hasMore: boolean
  }
}
```

## Seeding Process

### 1. Add Files to Seed Folder

```bash
# Create folder structure
mkdir -p server/seed/minio/system/icons
mkdir -p server/seed/minio/templates

# Add files
cp logo.svg server/seed/minio/system/
cp avatar.svg server/seed/minio/system/
cp home-icon.svg server/seed/minio/system/icons/
```

### 2. Run Seed Command

```bash
# Via API (requires dev secret header)
curl -X POST http://localhost:3000/api/dev/minio-seed \
  -H "x-dev-secret: docpal-dev-secret"
```

Or create a script:

```typescript
// scripts/seed-minio.ts
const response = await fetch('http://localhost:3000/api/dev/minio-seed', {
  method: 'POST',
  headers: {
    'x-dev-secret': 'docpal-dev-secret'
  }
})
const result = await response.json()
console.log(result)
```

### 3. Verify Seeded Files

```bash
# Query seeded files
curl http://localhost:3000/api/files?ownerType=system \
  -H "Cookie: your-session-cookie"
```

## Best Practices

### 1. Organize Seed Files by Purpose

```
server/seed/minio/
├── system/              # System-wide assets
│   ├── logo.svg
│   ├── favicon.ico
│   └── default-avatar.svg
├── templates/           # Template assets
│   ├── email/
│   └── documents/
└── components/          # Component assets
    ├── icons/
    └── images/
```

### 2. Use Descriptive Names

```
✅ Good:
- default-user-avatar.svg
- company-logo-light.svg
- icon-home-outline.svg

❌ Bad:
- img1.svg
- file.png
- temp.jpg
```

### 3. Tag Appropriately

The seeder automatically tags files with:
- `'seed'` - All seeded files
- Folder name - e.g., `'system'`, `'templates'`

You can add more tags by modifying the seed script.

### 4. Use Public Access for Shared Assets

Seeded files are marked as `isPublic: true` by default, making them accessible without authentication. This is ideal for:
- Logos and branding
- Icons
- Template images
- Default avatars

## Troubleshooting

### Files Not Appearing

1. **Check if seed ran successfully:**
   ```bash
   # Check response from seed endpoint
   # Should show created/skipped files
   ```

2. **Verify database records:**
   ```sql
   SELECT * FROM files WHERE owner_type = 'system';
   ```

3. **Check Minio bucket:**
   - Access Minio console
   - Verify files exist in bucket

### Files Not Loading in UI

1. **Check authentication:**
   - Seeded files require user to be logged in (API requires auth)
   - Even though files are public, the list endpoint requires authentication

2. **Check query parameters:**
   ```typescript
   // Make sure ownerType is set correctly
   const params = { ownerType: 'system' }
   ```

3. **Check console for errors:**
   - Network errors
   - 401 Unauthorized
   - 500 Server errors

## Integration with Dynamic Components

When building dynamic components, seeded files can be used for:

1. **Default Component Assets**
   - Default images for image components
   - Placeholder avatars
   - Icon libraries

2. **Template Assets**
   - Pre-built page templates
   - Component templates
   - Layout templates

3. **System Assets**
   - Branding (logos, colors)
   - UI icons
   - Default backgrounds

### Example: Icon Picker Component

```vue
<script setup lang="ts">
const { $api } = useNuxtApp()
const icons = ref([])

// Load seeded icons
async function loadIcons() {
  const response = await $api('/files?ownerType=system&search=icon')
  icons.value = response.files
}

onMounted(() => loadIcons())
</script>

<template>
  <div class="icon-picker">
    <div v-for="icon in icons" :key="icon.id" class="icon-item">
      <img :src="`/api/files/${icon.id}`" :alt="icon.fileName" />
    </div>
  </div>
</template>
```

## Summary

To query seeded files:
1. Use `ownerType: 'system'` parameter
2. Filter by `objectKey` for folder structure
3. Use `mimeType` for file type filtering
4. Search by `fileName` or `description`
5. Check `tags` array for `'seed'` tag
6. All seeded files have `isPublic: true`

The file manager in the dynamic page editor can now access and display all seeded files by filtering with `ownerType: 'system'`.

