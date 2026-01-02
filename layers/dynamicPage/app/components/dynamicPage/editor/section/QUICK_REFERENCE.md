# File Manager Quick Reference

## 🎯 Key Changes

### 1. No Workspace Dependency
- ❌ **Before**: Files scoped by `workspaceId`
- ✅ **Now**: Files scoped by `bucketRoot` from `useDynamicRenderContext`

### 2. System Files Support
- New "System Files" filter to view seeded files
- Seeded files have `ownerType: 'system'`
- All seeded files are public (`isPublic: true`)

## 📁 File Structure

```
Minio Bucket
└── docpal/                    ← bucketRoot
    ├── uploads/               ← User uploaded files
    ├── images/
    └── documents/

System Files (Seeded)
└── system/                    ← Seeded from server/seed/minio/system/
    ├── logo.svg
    ├── default-avatar.svg
    └── icons/
        └── home.svg
```

## 🔍 Query Examples

### Get All Files (Scoped by bucketRoot)
```typescript
await fileManager.listFiles({})
// Returns files filtered by bucketRoot on client-side
```

### Get System/Seeded Files
```typescript
await fileManager.listFiles({
  ownerType: 'system'
})
// Returns all seeded files from server/seed/minio/
```

### Get Images Only
```typescript
await fileManager.listFiles({
  mimeType: 'image/'
})
```

### Search Files
```typescript
await fileManager.listFiles({
  search: 'logo'
})
```

## 📤 Upload Files

Files are uploaded to:
```
{bucketRoot}/{currentFolder}/{uploadFolder}/{filename}
```

Example:
- `bucketRoot`: "docpal"
- `currentFolder`: "images"
- `uploadFolder`: "avatars"
- Result: `docpal/images/avatars/1234567890_avatar.jpg`

## 🎨 UI Filters

| Filter | Value | Description |
|--------|-------|-------------|
| All Files | `all` | Shows all files (filtered by bucketRoot) |
| System Files | `system` | Shows seeded files only |
| Images | `image/` | Shows image files only |
| Documents | `application/` | Shows document files |
| Videos | `video/` | Shows video files |
| Audio | `audio/` | Shows audio files |

## 🔗 File URLs

### Public URL (for public files)
```typescript
const url = `/api/files/${fileId}`
```

### Presigned URL (temporary, secure)
```typescript
const url = await fileManager.getFileUrl(fileId)
// Expires in 1 hour
```

## 🌱 Seeding Files

### 1. Add files to seed folder
```bash
mkdir -p server/seed/minio/system
cp logo.svg server/seed/minio/system/
```

### 2. Run seed endpoint
```bash
curl -X POST http://localhost:3000/api/dev/minio-seed \
  -H "x-dev-secret: docpal-dev-secret"
```

### 3. View in File Manager
- Open file manager
- Click "System Files" filter
- Seeded files appear

## 🔧 Context Integration

The file manager uses `useDynamicRenderContext`:

```typescript
const { bucketRoot } = useDynamicRenderContext()
// bucketRoot.value = 'docpal' (default)

// Files are filtered by this root:
filteredFiles = files.filter(f => 
  f.objectKey.startsWith(bucketRoot.value)
)
```

## 📚 Documentation

- [FILE_MANAGER.md](./FILE_MANAGER.md) - Complete file manager documentation
- [SEEDED_FILES_GUIDE.md](./SEEDED_FILES_GUIDE.md) - Detailed guide on querying seeded files
- [Phase 3.4 Plan](../../../../docs/PLAN/PHASE_3.4_DYNAMIC_COMPONENTS.md) - Dynamic component system overview

## 🚀 Common Tasks

### Task: Add a logo to the system
```bash
# 1. Add file
cp my-logo.svg server/seed/minio/system/

# 2. Seed
curl -X POST http://localhost:3000/api/dev/minio-seed \
  -H "x-dev-secret: docpal-dev-secret"

# 3. Use in component
const response = await $api('/files?ownerType=system&search=logo')
const logoUrl = `/api/files/${response.files[0].id}`
```

### Task: Upload a file for dynamic component
```typescript
await fileManager.uploadFile({
  file: browserFile,
  ownerType: 'system',
  folder: `${bucketRoot.value}/components`,
  isPublic: true
})
```

### Task: Get all icons
```typescript
const response = await $api('/files?ownerType=system&search=icon')
const icons = response.files
```

## ⚠️ Important Notes

1. **Authentication Required**: All file API endpoints require authentication
2. **Public vs Private**: Seeded files are public, uploaded files can be public or private
3. **Client-Side Filtering**: Folder filtering is done client-side based on `objectKey`
4. **Bucket Root**: Always use `bucketRoot` from context, don't hardcode paths
5. **Super Admin Feature**: This is designed for Phase 3.4 app building by super admins

