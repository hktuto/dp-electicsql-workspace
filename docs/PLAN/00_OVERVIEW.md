# DocPal - Project Development Plan

## Overview

This document outlines the phased development plan for DocPal, a low-code platform with dynamic tables, views, dashboards, and workflow automation.

**Tech Stack:**
- Frontend: Nuxt 4, Element Plus, SCSS + CSS Variables
- Backend: NuxtHub, PostgreSQL, Drizzle ORM
- Real-time Sync: Electric SQL with PGLite + Shared Worker
- File Storage: MinIO (S3-compatible)
- Workflow: Temporal
- AI: OpenAI + Ollama

**Deployment:**
- Development: Self-hosted (Docker)
- Production DB: Neon (PostgreSQL)
- UAT/Production App: Vercel

---

## Frontend Architecture

### Dual Navigation System

The application supports two navigation modes:

1. **Dock Mode (Dockview)** - A dynamic dock/tab view at `/tab`
2. **URL Navigation** - Standard page-based routing

### Component Structure

All pages follow this pattern:

```
/app/components/global/[PageName].vue    <- Entry component (reusable)
/app/pages/[url].vue                     <- Route wrapper (passes component to Dockview or renders directly)
```

### Navigation Wrapper

A custom `useAppRouter` composable wraps `vue-router` to:
- Detect if user is in dock mode (`/tab/*`)
- Convert page navigation to Dockview panel open (when in dock mode)
- Fall back to standard `vue-router` navigation (when in URL mode)

### Route Structure

```
/                                           <- User home
/auth/login                                 <- Login page
/auth/invited                               <- Invited user landing
/auth/reset_password                        <- Reset password
/auth/forget_password                       <- Forget password
/company/:slug                              <- Company settings
/workspaces                                 <- Workspace list
/workspaces/:slug                           <- Workspace detail
/workspaces/:slug/setting                   <- Workspace settings
/workspaces/:slug/folder/:folderSlug        <- Folder view
/workspaces/:slug/folder/:folderSlug/setting <- Folder settings
/workspaces/:slug/table/:tableSlug          <- Table view
/workspaces/:slug/table/:tableSlug/setting  <- Table settings
/workspaces/:slug/view/:viewSlug            <- View renderer
/workspaces/:slug/view/:viewSlug/setting    <- View settings
/workspaces/:slug/dashboard/:dashboardSlug  <- Dashboard view
/workspaces/:slug/dashboard/:dashboardSlug/setting <- Dashboard settings
/chats                                      <- Chat list (future)
/chats/:chatId                              <- Chat detail (future)
/public/view/:viewId                        <- Public shared view
/public/dashboard/:dashboardId              <- Public shared dashboard
```

Note: No admin-specific routes. Access is controlled by user permissions.

---

## Phase Overview

| Phase | Focus | Priority | Est. Duration |
|-------|-------|----------|---------------|
| 0.0 | Infrastructure: DB, Electric SQL, Seeding | Setup | 1 week |
| 1.0 | Foundation: Auth, User, Seed | Highest | 1-2 weeks |
| 2.0 | Company Management | High | 1-2 weeks |
| 3.0 | Workspace & Navigation Menu | High | 2 weeks |
| 4.0 | Dynamic Tables & Columns | High | 3-4 weeks |
| 5.0 | Views (Grid, Kanban, Calendar, etc.) | High | 3-4 weeks |
| 6.0 | Dashboards & Widgets | Medium | 2-3 weeks |
| 7.0 | User Invites & Permissions | Medium | 2-3 weeks |
| 8.0 | Templates & History | Medium | 2 weeks |
| 9.0 | Workflow Engine (Temporal) | Low | 3-4 weeks |
| 10.0 | AI Integration | Low | 2-3 weeks |

---

## Architecture Notes

### Multi-Database Migration Path

Currently designed for single database. To migrate to multi-schema or multi-database:

**Multi-Schema (Recommended first step):**
- Each company gets a PostgreSQL schema: `company_{id}`
- Shared tables (users, companies) stay in `public` schema
- Dynamic tables created in company schema
- Connection pooling handles schema switching

**Multi-Database:**
- Separate database per company
- Requires connection management per tenant
- More complex but better isolation

**Migration Effort:** Medium. Main changes:
1. Add schema/database routing logic
2. Update all queries to include schema prefix
3. Update Electric SQL shape configurations
4. Handle cross-schema references (users)

### Electric SQL Shape Strategy

Shapes define what data syncs to each client:

```typescript
// Shape per user based on userPermissionLookup
const userShape = {
  companies: { where: `id IN (${user.companies.join(',')})` },
  workspaces: { where: `id IN (${user.workspaces.join(',')})` },
  dataTables: { where: `id IN (${user.tables.join(',')})` },
  // Dynamic table shapes created on-demand
}
```

### Change Event Broadcasting

The Electric SQL worker broadcasts change events for all shape syncs:

```typescript
// Worker broadcasts these events
{ type: 'DATA_CHANGE', shapeName, tableName, changes: { insert: [], update: [], delete: [] } }
```

### Electric SQL Data Pattern

**Query on demand, subscribe to changes** - Data lives in PGLite only, NOT in global refs.

**Sync Composables:**
- Only store sync STATE (isSyncing, error, lastSyncAt)
- Provide query helpers (findById, getAll, etc.) that query PGLite
- Provide change subscription (onChange callback)

**Components:**
- Query what they need from sync composable
- Store in LOCAL ref for that component only
- Subscribe to changes and re-query

**Benefits:**
- ✅ No memory duplication (scales to 100k+ rows)
- ✅ Each component manages its own view
- ✅ Pagination/filtering at query level

**Change Event UX:**

| Context | Behavior |
|---------|----------|
| List views | Auto-refresh silently |
| Detail/Settings forms | Show notification if user has unsaved changes |
| Grid views | Highlight inserted/updated/deleted rows |

---

## Current Status

- [x] Phase 0.0: Infrastructure - ✅ Complete
- [x] Phase 1.0: Foundation (Auth & User) - ✅ Complete
- [x] Phase 2.0: Company Management - ✅ Complete
- [🔄] Phase 3.0: Workspace & Navigation - ⚡ Backend Complete, Core UI Complete (Menu system pending)
- [ ] Phase 4.0: Dynamic Tables - Not Started
- [ ] Phase 5.0: Views - Not Started
- [ ] Phase 6.0: Dashboards - Not Started
- [ ] Phase 7.0: Permissions - Not Started
- [ ] Phase 8.0: Templates & History - Not Started
- [ ] Phase 9.0: Workflow - Not Started
- [ ] Phase 10.0: AI - Not Started

---

## Recent Updates (2024-12-29)

### Phase 3.0 Progress
- ✅ **Backend**: Complete CRUD APIs, Electric SQL sync, row-level filtering
- ✅ **Frontend Pages**: Workspace list, detail, settings pages created
- ✅ **Custom Popover System**: Replaced dialogs with smart-positioned popovers
- ✅ **Icon Picker**: Notion-style icon picker with categories and search
- ✅ **User Profile Menu**: Dropdown with company switcher
- ✅ **Two-Stage Search**: Preview with dimming + commit filter
- ✅ **Bug Fixes**: JWT payload consistency, auto-company selection, sync delays
- ⏳ **Pending**: Menu sidebar integration with drag-and-drop

### New Components
- `CommonPopoverDialog` - Smart-positioned popover with mobile fallback
- `CommonIconPicker` - Category-based icon selector
- `CommonIconPickerInput` - Form input wrapper
- `UserProfileMenu` - User dropdown with company switcher
- `WorkspaceListCard` - Individual workspace card

### New Composables
- `useBreakpoint()` - Global responsive breakpoint detection
- `useWorkspaceSync()` - Workspace data sync with Electric SQL

### Documentation
- Created 13 new documentation files
- Updated project rules with popover guidelines
- Comprehensive progress report in `docs/PROGRESS/20251229.md`

