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
- [x] Use container queries (not media queries)

### 3.2.2: Workspace Wrapper (`WrapperWorkspace`)

- [x] Create `app/components/wrapper/workspace.vue`
- [x] Layout:
  - Left: Workspace Menu
  - Right: Header + Content
- [x] Header structure:
  - Breadcrumb (left)
  - Header right with teleport target ID for action buttons
- [x] Content area renders based on route
- [x] Wrapped by `WrapperMain`
- [x] Responsive workspace menu:
  - Toggle button in workspace header
  - Use container queries

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

- [x] Move from `WorkspaceDetail` into `WrapperWorkspace` sidebar slot
- [x] Structure:
  - Top: Workspace name/icon
  - Middle: Navigation menu (folders, tables, views, dashboards)
  - Footer: Settings, other actions
- [x] Responsive: toggle in header on mobile

### 3.2.5: Cleanup & Testing

- [x] Remove old workspace page wrappers (`[slug].vue`, `[slug]/setting.vue`)
- [ ] Test all routes work correctly
- [ ] Test responsive behavior at different sizes
- [ ] Ensure container queries work properly

---

## Component Structure

```
WrapperMain
├── MainMenu
│   ├── Logo
│   ├── MenuItems
│   └── Footer (UserProfileMenu, etc.)
└── <slot /> (Content)
    └── WrapperWorkspace (for workspace routes)
        ├── WorkspaceMenu
        │   ├── WorkspaceName
        │   ├── NavigationMenu
        │   └── Footer (Settings)
        └── WorkspaceContent
            ├── Header (Breadcrumb + Actions)
            └── <component :is="currentView" />
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

## Container Query Pattern

```scss
.wrapper {
  container-type: inline-size;
  container-name: wrapper;
}

@container wrapper (max-width: 768px) {
  .menu {
    // Mobile styles
  }
}

@container wrapper (min-width: 769px) {
  .menu {
    // Desktop styles
  }
}
```

---

## Completion Criteria

- [ ] WrapperMain with responsive main menu
- [ ] WrapperWorkspace with responsive workspace menu
- [ ] Catch-all route handling all workspace sub-routes
- [ ] All responsive using container queries
- [ ] Clean, maintainable code structure

---

## Status: 🟡 In Progress

