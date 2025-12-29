# Company Context Flow

## Overview

The **current company** selection is managed by `useCompanyContext()` composable. This is client-side state that persists across sessions using cookies.

## Data Storage

### 1. Client-Side Cookie (Persistent)
```
Cookie Name: current_company_id
Value: <company-uuid>
Lifetime: 30 days
Path: /
```

### 2. Global State (In-Memory)
```typescript
useState('currentCompanyId')  // string | null
useState('currentCompany')     // Company object | null
useState('userRole')           // 'owner' | 'admin' | 'member' | null
```

**Important**: The current company is **NOT stored in the database**. It's purely client-side preference.

---

## User Flow

### Initial Login Flow

```
1. User logs in
   ↓
2. Auth middleware validates session
   ↓
3. HomePage loads → companySync.startSync()
   ↓
4. companyContext.init() is called
   ↓
5. Init checks for cookie:
   
   If cookie exists:
     → Try to set company from cookie
     → If invalid, clear cookie
   
   If no cookie OR cookie invalid:
     → Auto-select first available company
     → Save to cookie
```

### Company Selection Flow (HomePage)

```
HomePage displays company list
   ↓
User clicks a company card
   ↓
goToCompany(slug) is called
   ↓
companyContext.setCompanyBySlug(slug)
   ├─ Query company from PGLite (Electric SQL)
   ├─ Validate user has access
   ├─ Get user's role in company
   ├─ Update global state
   └─ Save to cookie
   ↓
Navigate to /company/:slug
```

### Company Switching Flow (After Login)

```
User is already in the app
   ↓
User clicks CompanySwitcher dropdown
   ↓
User selects different company
   ↓
companyContext.setCompanyById(companyId)
   ├─ Query company from PGLite
   ├─ Validate access
   ├─ Update global state
   └─ Update cookie
   ↓
UI auto-updates (reactive state)
Components watching currentCompany will re-render
```

---

## Code Integration Points

### 1. App Initialization

**Where**: `app/components/global/HomePage.vue`

```typescript
// Called when user is authenticated
watch(isAuthenticated, async (value) => {
  if (value) {
    await companySync.startSync()
    await loadCompanies()
    
    // Initialize company context from cookie or auto-select
    await companyContext.init()
  }
}, { immediate: true })
```

### 2. Company Selection

**Where**: `app/components/global/HomePage.vue`

```typescript
async function goToCompany(slug: string) {
  // Set company context first, then navigate
  const success = await companyContext.setCompanyBySlug(slug)
  if (success) {
    router.push(`/company/${slug}`)
  } else {
    ElMessage.error('Failed to access company')
  }
}
```

### 3. Company Switcher

**Where**: `app/components/common/CompanySwitcher.vue`

Use this component in your header/menu:

```vue
<template>
  <CompanySwitcher />
</template>
```

### 4. Logout

**Where**: Any logout handler

```typescript
async function handleLogout() {
  await logout()
  companyContext.clearCompany() // Clear company context
  router.push('/auth/login')
}
```

---

## Using Company Context in Components

### Read Current Company

```typescript
const { currentCompany, currentCompanyId, userRole } = useCompanyContext()

// Access reactive values
console.log(currentCompany.value?.name)
console.log(userRole.value) // 'owner', 'admin', 'member', or null
```

### Check Permissions

```typescript
const { canManageCompany, isOwner, isAdmin, isMember } = useCompanyContext()

// Use in templates
<el-button v-if="canManageCompany" type="primary">
  Manage Company
</el-button>
```

### Switch Company Programmatically

```typescript
const { setCompanyById, setCompanyBySlug } = useCompanyContext()

// By ID
await setCompanyById('company-uuid')

// By slug
await setCompanyBySlug('my-company')
```

### Watch Company Changes

```typescript
const { currentCompany } = useCompanyContext()

watch(() => currentCompany.value?.id, (newId) => {
  console.log('Company changed to:', newId)
  // Re-load data for new company
})
```

---

## Workspace Context

Workspaces filter by `currentCompany.id`:

```typescript
// In workspaceList.vue
watch(() => currentCompany.value?.id, () => {
  loadWorkspaces() // Re-load workspaces for new company
})

// Load workspaces
if (currentCompany.value?.id) {
  workspaces.value = await workspaceSync.getByCompanyId(currentCompany.value.id)
}
```

---

## Security Notes

1. **Client-side only**: Company selection is just UI preference
2. **Server validates access**: Every API call checks user's membership via `company_members` table
3. **Electric SQL filters**: Shapes only sync data for companies user belongs to
4. **Cookie can be tampered**: But server won't return data user doesn't have access to

---

## Troubleshooting

### User can't see workspaces
- Check if `currentCompany` is set
- Verify user is member of that company in `company_members` table
- Check Electric SQL sync is running

### Company context not persisting
- Check cookie is being set: `document.cookie`
- Verify cookie domain/path matches app URL
- Check cookie isn't being blocked by browser settings

### Init() not working
- Ensure it's called AFTER `companySync.startSync()` completes
- Check that Electric SQL has synced companies/members tables
- Verify user has at least one company membership

