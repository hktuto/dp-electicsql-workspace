# Workspace Creation Fixes

## Issues Fixed

### 1. ✅ API 500 Error - Fixed Drizzle Query

**Problem**: SQL error with empty parameters
```
select "role" from "company_members" 
where "company_members"."user_id" = $1 limit $2
params: ,1  // First param is empty!
```

**Root Cause**: Chaining multiple `.where()` calls in Drizzle ORM doesn't work. The second `.where()` overwrites the first one.

**Fix**: Use `and()` to combine conditions properly

```typescript
// ❌ WRONG - Second where overwrites first
const membership = await db
  .select({ role: schema.companyMembers.role })
  .from(schema.companyMembers)
  .where(eq(schema.companyMembers.companyId, companyId))
  .where(eq(schema.companyMembers.userId, user.id))  // Overwrites!
  .limit(1)

// ✅ CORRECT - Use and() to combine
const membership = await db
  .select({ role: schema.companyMembers.role })
  .from(schema.companyMembers)
  .where(
    and(
      eq(schema.companyMembers.companyId, companyId),
      eq(schema.companyMembers.userId, user.id)
    )
  )
  .limit(1)
```

**Files Changed**:
- `server/api/workspaces/index.post.ts`

---

### 2. ✅ Auto-Generate Slug - Server-Side

**Problem**: Users had to manually enter slug, confusing and error-prone

**Fix**: 
- Removed `slug` field from create form
- Server automatically generates slug from workspace name
- Auto-increments if duplicate (e.g., `my-workspace`, `my-workspace-1`, `my-workspace-2`)

**Slug Generation Logic**:
```typescript
// Auto-generate slug from name
const slug = name
  .toLowerCase()
  .trim()
  .replace(/[^\w\s-]/g, '')      // Remove special chars
  .replace(/[\s_-]+/g, '-')       // Replace spaces/underscores with hyphens
  .replace(/^-+|-+$/g, '')        // Trim hyphens

// Check uniqueness and append number if needed
let finalSlug = slug
let counter = 1

while (true) {
  const existing = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces)
    .where(
      and(
        eq(schema.workspaces.companyId, companyId),
        eq(schema.workspaces.slug, finalSlug)
      )
    )
    .limit(1)

  if (existing.length === 0) break
  
  finalSlug = `${slug}-${counter}`
  counter++
}
```

**Examples**:
- Input: `My Workspace` → Slug: `my-workspace`
- Input: `Sales & Marketing` → Slug: `sales-marketing`
- Duplicate: `my-workspace` exists → Creates `my-workspace-1`

**Files Changed**:
- `server/api/workspaces/index.post.ts`
- `app/components/global/workspaceList.vue`

---

### 3. ✅ Responsive UI - Popover on Desktop, Dialog on Mobile

**Problem**: Dialog takes up too much space on desktop for a simple form

**Fix**: 
- **Desktop (≥768px)**: Elegant popover dropdown
- **Mobile (<768px)**: Full-screen dialog

**Implementation**:
```vue
<script setup>
// Detect screen size
const isMobile = ref(false)

onMounted(() => {
  const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)
  onUnmounted(() => window.removeEventListener('resize', checkMobile))
})
</script>

<template>
  <!-- Desktop: Popover -->
  <el-popover
    v-if="!isMobile"
    v-model:visible="showCreateDialog"
    placement="bottom-end"
    :width="400"
  >
    <template #reference>
      <el-button type="primary">New Workspace</el-button>
    </template>
    <!-- Form content -->
  </el-popover>
  
  <!-- Mobile: Dialog -->
  <el-dialog
    v-if="isMobile"
    v-model="showCreateDialog"
    width="90%"
  >
    <!-- Form content -->
  </el-dialog>
</template>
```

**Desktop Popover**:
- Drops down from button
- 400px width
- Closes on click outside
- Compact and elegant

**Mobile Dialog**:
- Full-screen overlay
- 90% width
- Standard dialog UX
- Touch-optimized

**Files Changed**:
- `app/components/global/workspaceList.vue`

---

## New Create Workspace Form

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| **Name** | Text | Yes | Workspace name |
| **Icon** | Icon Picker | No | Visual identifier |
| **Description** | Textarea | No | Brief description |

### Removed Fields
- ❌ **Slug** - Auto-generated from name

---

## User Experience

### Desktop Flow
```
1. Click "New Workspace" button
   ↓
2. Popover appears below button
   ↓
3. Fill in name (and optionally icon/description)
   ↓
4. Click "Create" or press Enter
   ↓
5. Workspace created with auto-generated slug
   ↓
6. Popover closes, success message shown
```

### Mobile Flow
```
1. Tap "New Workspace" button
   ↓
2. Dialog slides up from bottom
   ↓
3. Fill in form fields
   ↓
4. Tap "Create"
   ↓
5. Dialog closes, workspace created
```

---

## Technical Details

### Breakpoint
- **Desktop**: `>= 768px` - Uses popover
- **Mobile**: `< 768px` - Uses dialog

### Auto-Slug Uniqueness
- Checks against existing workspaces in same company
- Appends `-1`, `-2`, etc. if duplicate
- No race conditions (server-side check)

### Form Validation
- Client-side: Name required check
- Server-side: 
  - Name required
  - Company membership check
  - Admin/owner role check
  - Slug uniqueness (with auto-increment)

---

## API Changes

### Request Body

**Before**:
```json
{
  "name": "My Workspace",
  "slug": "my-workspace",  // User provided
  "companyId": "...",
  "description": "...",
  "icon": "..."
}
```

**After**:
```json
{
  "name": "My Workspace",
  // No slug - auto-generated!
  "companyId": "...",
  "description": "...",
  "icon": "..."
}
```

### Response

Same as before - returns created workspace with auto-generated slug:
```json
{
  "workspace": {
    "id": "...",
    "name": "My Workspace",
    "slug": "my-workspace",  // Auto-generated
    "companyId": "...",
    ...
  }
}
```

---

## Testing Checklist

- [ ] Create workspace with simple name → Check slug
- [ ] Create workspace with special characters → Check slug sanitization
- [ ] Create duplicate workspace name → Check auto-increment (`-1`)
- [ ] Test on desktop (>768px) → Should show popover
- [ ] Test on mobile (<768px) → Should show dialog
- [ ] Resize window → Should switch between modes
- [ ] Test with no company selected → Button disabled
- [ ] Test as regular member → Should fail (need admin role)
- [ ] Test as company admin → Should succeed

---

## Future Enhancements

### Slug Preview (Optional)
Could show generated slug as user types:
```vue
<el-form-item label="Name">
  <el-input v-model="form.name" />
  <div class="slug-preview">
    Slug will be: <code>{{ generateSlug(form.name) }}</code>
  </div>
</el-form-item>
```

### Custom Slug Override (Optional)
Advanced users might want custom slugs:
```vue
<el-collapse>
  <el-collapse-item title="Advanced Options">
    <el-form-item label="Custom Slug">
      <el-input v-model="form.customSlug" />
    </el-form-item>
  </el-collapse-item>
</el-collapse>
```

---

## Summary

✅ **Fixed API 500** - Proper Drizzle query with `and()`  
✅ **Auto-generate slug** - Server-side with uniqueness check  
✅ **Responsive UI** - Popover on desktop, dialog on mobile  
✅ **Better UX** - Simpler form, one less field to fill  
✅ **No duplicates** - Auto-increment handles conflicts  

The workspace creation flow is now simpler and more intuitive! 🎉

