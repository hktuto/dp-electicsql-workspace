# File Manager Component

## Overview

The File Manager component provides a comprehensive interface for managing files in the Minio bucket within the dynamic page editor. It allows users to browse, upload, preview, and manage files that can be used in their dynamic pages.

**Important:** This file manager is designed for the **Dynamic Component System** (Phase 3.4), which allows super admins to build apps. Files are scoped by `bucketRoot` from `useDynamicRenderContext`, not by workspace ID.

## Features

### ✅ Implemented

1. **File Listing**
   - Grid and list view modes
   - Real-time file display from Minio
   - File metadata (name, size, type, upload date)

2. **Search & Filter**
   - Search files by name and description
   - Filter by file type (All, System Files, Images, Documents, Videos, Audio)
   - System Files filter shows seeded files from `server/seed/minio/`
   - Debounced search for performance

3. **File Upload**
   - Drag-and-drop upload interface
   - Multiple file upload support
   - Custom folder specification
   - Optional file descriptions
   - Upload progress indication

4. **File Preview**
   - Image preview in modal
   - Direct download for other file types
   - Full-screen image viewing

5. **File Management**
   - Delete files with confirmation
   - Copy file URL to clipboard
   - File selection for insertion into pages
   - Visual file type icons

6. **Folder Navigation**
   - Breadcrumb navigation
   - Navigate up to parent folder
   - Create new folders (UI ready, backend support needed)
   - Client-side folder filtering

### 🔄 Pending Backend Support

1. **Folder Management**
   - Create folders (API endpoint needed)
   - Delete folders
   - Move files between folders
   - Rename folders

2. **Advanced Features**
   - Bulk operations (move, delete multiple files)
   - File versioning
   - File sharing/permissions
   - Thumbnail generation for images

## Usage

The File Manager is accessible from the dynamic page editor's floating icon:

1. Click the floating pencil icon (bottom center by default)
2. Navigate to the "Files" tab
3. Browse, upload, and manage files

### Uploading Files

1. Click the "Upload" button
2. Drag files into the upload area or click to select
3. Optionally specify a folder path
4. Add a description (optional)
5. Click "Upload" to confirm

### Managing Files

- **Grid View**: Click on a file card to select it
- **List View**: Use checkboxes to select files
- **Actions Menu**: Click the three-dot menu for options:
  - Preview: View images or download other files
  - Copy URL: Copy the file URL to clipboard
  - Delete: Remove the file (with confirmation)

### Folder Navigation

- Click on breadcrumb items to navigate to parent folders
- Click "Up" button to go to parent folder
- Click "New Folder" to create a new folder (requires backend support)

## Technical Details

### Composable: `useFileManager`

Located at: `layers/dynamicPage/app/composables/useFileManager.ts`

Provides:
- File listing with pagination
- File upload
- File deletion
- URL generation (presigned and public)
- File selection management
- Helper functions (icon detection, size formatting, etc.)

### API Endpoints Used

- `GET /api/files` - List files with filtering
- `POST /api/files/upload` - Upload files
- `DELETE /api/files/:id` - Delete a file
- `POST /api/files/presign` - Get presigned URLs for download

### File Organization

Files are organized by:
- **Bucket Root**: Scoped by `bucketRoot` from `useDynamicRenderContext` (e.g., "docpal")
- **Owner Type**: system (for dynamic components and seeded files)
- **Folder Path**: Custom folder structure within bucket root (e.g., "docpal/uploads", "docpal/images")
- **System Files**: Seeded files from `server/seed/minio/` with `ownerType: 'system'`

### File Naming

Uploaded files are automatically renamed with:
- Timestamp prefix for uniqueness
- Sanitized filename (special characters replaced with `_`)
- Original extension preserved

Example: `1704123456789_my_image.jpg`

## Component Structure

```
layers/dynamicPage/app/
├── components/
│   └── dynamicPage/
│       └── editor/
│           └── section/
│               ├── files.vue          # Main file manager UI
│               └── FILE_MANAGER.md    # This documentation
└── composables/
    └── useFileManager.ts              # File operations composable
```

## Styling

The component uses:
- Element Plus components (el-table, el-upload, el-dialog, etc.)
- Custom SCSS with CSS variables for theming
- Responsive grid layout for file cards
- Smooth transitions and hover effects

## Future Enhancements

1. **Drag & Drop to Page**
   - Drag files from manager directly onto the page
   - Automatic component creation based on file type
   - Image → Image component
   - PDF → Document viewer component

2. **File Organization**
   - Folder tree view in sidebar
   - Favorite files
   - Recent files
   - File tags and categories

3. **Collaboration**
   - File comments
   - File sharing with team members
   - Activity log (who uploaded/modified)

4. **Performance**
   - Virtual scrolling for large file lists
   - Lazy loading of thumbnails
   - Caching of file metadata

5. **Advanced Upload**
   - Resume interrupted uploads
   - Upload queue management
   - Paste images from clipboard
   - URL import

## Integration with Dynamic Pages

Once implemented, files can be:
1. Selected from the file manager
2. Dragged onto the page canvas
3. Automatically converted to appropriate components
4. Linked to component props (e.g., image src, document url)

## Notes

- Files are scoped by `bucketRoot` from dynamic render context (not workspace)
- This is designed for super admin app building (Phase 3.4)
- All file operations require authentication
- File URLs are presigned for security (expire after 1 hour)
- Deleted files are soft-deleted in the database
- File metadata is stored in PostgreSQL, actual files in Minio
- System files (seeded) are marked as `ownerType: 'system'` and `isPublic: true`

## Querying Seeded Files

Seeded files from `server/seed/minio/` can be accessed by:
1. Click the "System Files" filter in the file manager
2. This queries files with `ownerType: 'system'`
3. All seeded files are public and tagged with `'seed'`

For detailed information on querying seeded files, see [SEEDED_FILES_GUIDE.md](./SEEDED_FILES_GUIDE.md).

## Related Documentation

- [Phase 3.4: Dynamic Components](../../../../docs/PLAN/PHASE_3.4_DYNAMIC_COMPONENTS.md)
- [Minio Configuration](../../../../server/utils/minio.ts)
- [File Schema](../../../../server/db/schema/files.ts)

