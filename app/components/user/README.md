# User Profile Menu Component

## Component: `<UserProfileMenu />`

Location: `/app/components/user/profileMenu.vue`

### Features

- ✅ Two display modes: collapse (avatar only) and expand (avatar + name)
- ✅ Auto-generated avatar from user name or email
- ✅ Dropdown menu with user info header
- ✅ Edit profile action
- ✅ Company switcher (inline list, not nested dropdown)
- ✅ Edit company (only shown if user is admin/owner)
- ✅ Logout action
- ✅ Direct click event binding (no `command` prop)
- ✅ Active company indicator
- ✅ Responsive and styled with CSS variables

---

## Usage

### Basic Usage (Expand Mode)

```vue
<template>
  <div class="header">
    <UserProfileMenu />
  </div>
</template>
```

Shows: Avatar + User Name + Dropdown Arrow

### Collapse Mode

```vue
<template>
  <div class="sidebar">
    <UserProfileMenu :collapse="true" />
  </div>
</template>
```

Shows: Avatar only

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `collapse` | `boolean` | `false` | When `true`, shows avatar only. When `false`, shows avatar + name |

---

## Dropdown Menu Structure

```
┌─────────────────────────────────────┐
│ [Avatar]  User Name                 │
│           user@email.com            │
│           [Super Admin Badge]       │  ← Header (always visible)
├─────────────────────────────────────┤
│ 👤 Edit Profile                     │  ← Click to edit profile
├─────────────────────────────────────┤
│ Companies                           │  ← Section title
│                                     │
│ [A] Company A              ✓       │  ← Active company (checkmark)
│ [B] Company B                       │  ← Click to switch
│ [C] Company C                       │  ← Click to switch
│                                     │
├─────────────────────────────────────┤
│ 🏢 Edit Company                     │  ← Only if admin/owner
├─────────────────────────────────────┤
│ 🚪 Logout                           │  ← Logout action
└─────────────────────────────────────┘
```

---

## Example Integration

### In Header Layout

```vue
<template>
  <div class="app-header">
    <div class="header-left">
      <Logo />
      <Navigation />
    </div>
    
    <div class="header-right">
      <UserProfileMenu />
    </div>
  </div>
</template>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--app-space-m);
}
</style>
```

### In Sidebar (Collapsed)

```vue
<template>
  <div class="app-sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <UserProfileMenu :collapse="collapsed" />
    </div>
    
    <nav class="sidebar-nav">
      <!-- Navigation items -->
    </nav>
  </div>
</template>

<script setup>
const collapsed = ref(false)
</script>
```

---

## Styling

The component uses CSS variables for consistent styling:

- `--app-space-*` for spacing
- `--app-font-size-*` for typography
- `--app-text-color-*` for text colors
- `--el-fill-color-*` for backgrounds (Element Plus)
- `--app-primary-color` for active states

### Custom Styling Example

```vue
<style>
/* Make the trigger button more prominent */
:deep(.user-profile-trigger) {
  border: 1px solid var(--app-border-color);
  padding: var(--app-space-s) var(--app-space-m);
}

/* Wider dropdown menu */
:deep(.user-profile-menu) {
  min-width: 320px;
}
</style>
```

---

## Events & Actions

All actions use direct `@click` binding (not `command`):

### 1. Edit Profile
```typescript
function handleEditProfile() {
  router.push('/profile')
}
```
Routes to `/profile` (you'll need to create this page)

### 2. Switch Company
```typescript
async function handleSwitchCompany(companyId: string) {
  await companyContext.setCompanyById(companyId)
  ElMessage.success('Company switched')
  // Optionally navigate to company page
}
```

### 3. Edit Company
```typescript
function handleEditCompany() {
  router.push(`/company/${currentCompany.slug}`)
}
```
Only visible if `companyContext.canManageCompany` is true

### 4. Logout
```typescript
async function handleLogout() {
  await logout()
  companyContext.clearCompany()
  router.push('/auth/login')
}
```

---

## Permissions

The component automatically handles permissions:

- **Edit Company** button only shows if:
  - User is super admin, OR
  - User has 'owner' or 'admin' role in current company

Checked via:
```typescript
companyContext.canManageCompany
```

---

## State Management

The component uses:

- `useAuth()` - Current user data
- `useCompanySync()` - Company list synced via Electric SQL
- `useCompanyContext()` - Current company context
- `useRouter()` - Navigation

All data is reactive and updates automatically when:
- User data changes
- Companies are added/removed
- Current company switches

---

## Responsive Behavior

### Collapse Mode
- Best for narrow sidebars
- Shows only avatar (32px)
- Minimal padding
- No hover background

### Expand Mode
- Best for headers and wide sidebars
- Shows avatar (36px) + name + company
- Full padding with hover effect
- Dropdown arrow indicator

---

## TODO: Create Profile Page

The "Edit Profile" action routes to `/profile`, which doesn't exist yet.

You'll need to create:
- `app/pages/profile.vue` (wrapper)
- `app/components/global/userProfile.vue` (actual component)

With fields:
- Name
- Email (read-only or with verification)
- Avatar upload
- Password change

