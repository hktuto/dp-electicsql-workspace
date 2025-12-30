# Phase 3.2: Wrapper Layout & Responsive Design

## Goals

- Refactor page wrappers for consistent layout across app
- Implement responsive main menu (desktop aside / mobile toggle)
- Create workspace wrapper with catch-all routing
- Use container queries for all responsive behavior

---

## Requirements Reference

See `docs/REQUIRMENT/20251230_wrapper_design.md`

---

## Tasks

### 3.2.1: Main Wrapper (`WrapperMain`)

- [x] Refactor `app/components/wrapper/main.vue`
- [x] Layout: Main Menu (left) + Content (slot)
- [x] Main Menu structure:
  - Logo (top)
  - Menu items (middle)
  - Footer (bottom)
- [x] Two display states:
  - Collapse: icons only
  - Expand: icons + labels
- [x] Responsive behavior:
  - Desktop: aside element, stick to left
  - Mobile: toggle button (bottom-left), slide-in menu
- [x] Use ResizeObserver for responsive (container queries can't style container itself)

### 3.2.2: Workspace Wrapper (`WrapperWorkspace`)

- [x] Create `layers/workspace/app/components/wrapper/workspace.vue`
- [x] Layout:
  - Left: Workspace Menu
  - Right: Header + Content
- [x] Header structure:
  - Breadcrumb (left)
  - Header right with teleport target ID for action buttons
- [x] Content area renders based on route prop
- [x] Wrapped by `WrapperMain`
- [x] Responsive workspace menu:
  - Toggle button in workspace header
  - Use ResizeObserver for responsive

### 3.2.3: Workspace Catch-All Route

- [x] Create `/app/pages/workspaces/[slug]/[...all].vue`
- [x] Handle all sub-routes:
  - `/` - Workspace home
  - `/setting` - Workspace settings
  - `/folder/:folderSlug` - Folder view (placeholder)
  - `/view/:viewSlug` - View (placeholder)
  - `/dashboard/:dashboardSlug` - Dashboard (placeholder)
- [x] Route parsing logic to determine which component to render

### 3.2.4: Workspace Menu Refinement

- [x] Move into `WrapperWorkspace` sidebar
- [x] Structure:
  - Top: Workspace name/icon
  - Middle: Navigation menu (folders, tables, views, dashboards)
  - Footer: Settings, other actions
- [x] Responsive: toggle in header on mobile
- [x] Click to navigate to folder/view/dashboard

### 3.2.5: Header Standardization

- [x] Use `var(--app-header-height)` for all headers
- [x] Main menu header, workspace sidebar header, workspace content header

### 3.2.6: Cleanup & Testing

- [x] Remove old workspace page wrappers (`[slug].vue`, `[slug]/setting.vue`)
- [x] Move workspace wrapper to workspace layer
- [x] Test all routes work correctly
- [x] Test responsive behavior at different sizes

---

## Key Fixes & Learnings

### useState for Workspace Persistence

The workspace data was resetting on sub-route navigation because `ref()` resets when component remounts. Fixed by using `useState()`:

```typescript
// Before (would reset on route change)
const workspace = ref<Workspace | null>(null)

// After (persists across route changes)
const workspace = useState<Workspace | null>('currentworkspace', () => null)
```

### ResizeObserver vs Container Queries

Container queries (`@container`) cannot style the container element itself, only descendants. For responsive layout changes on the container, use ResizeObserver + CSS classes:

```typescript
resizeObserver = new ResizeObserver((entries) => {
  isMobileView.value = entries[0].contentRect.width < 768
})
```

### Transform for Stacking Context

For `position: absolute` menus to stay within wrapper bounds, add `transform: translateZ(0)` to create a new stacking context.

---

## Component Structure

```
WrapperMain
├── MainMenu (CommonMenu)
│   ├── Logo
│   ├── MenuItems
│   └── Footer (UserProfileMenu, toggle)
└── <slot /> (Content)
    └── WrapperWorkspace (for workspace routes)
        ├── WorkspaceSidebar
        │   ├── WorkspaceName
        │   ├── WorkspaceMenu (navigation)
        │   └── Footer (Settings)
        └── WorkspaceContent
            ├── Header (Breadcrumb + Actions)
            └── Route-based content
```

---

## Route Structure

```
/workspaces/:slug/              → Workspace home
/workspaces/:slug/setting       → Workspace settings
/workspaces/:slug/folder/:id    → Folder view
/workspaces/:slug/view/:id      → Table/View
/workspaces/:slug/dashboard/:id → Dashboard
```

---

## File Locations

| Component | Location |
|-----------|----------|
| WrapperMain | `app/components/wrapper/main.vue` |
| CommonMenu | `app/components/common/menu/index.vue` |
| WrapperWorkspace | `layers/workspace/app/components/wrapper/workspace.vue` |
| WorkspaceMenu | `layers/workspace/app/components/workspace/menu/index.vue` |
| Catch-all route | `app/pages/workspaces/[slug]/[...all].vue` |

---

## Completion Criteria

- [x] WrapperMain with responsive main menu
- [x] WrapperWorkspace with responsive workspace menu
- [x] Catch-all route handling all workspace sub-routes
- [x] All responsive using ResizeObserver + CSS classes
- [x] Clean, maintainable code structure
- [x] Standardized header heights

---

## Status: ✅ COMPLETE (2024-12-30)
