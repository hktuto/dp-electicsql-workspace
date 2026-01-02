# Phase 3.4: Dynamic Component System

## Overview

Build a dynamic component rendering system that allows **Apps**, **Pages**, and **Components** to be defined, stored, and rendered from configuration. This phase lays the foundation for future AI-assisted app building while improving current code organization.

**Key Insight:** We will use this system to build DocPal itself (dogfooding), ensuring the architecture is battle-tested.

**Timing:** Perfect moment - we're already refactoring all components due to Electric SQL sync pattern changes.

---

## Architecture Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                           DocPal                                │
├─────────────────────────────┬───────────────────────────────────┤
│       SYSTEM APPS           │          USER APPS                │
│   (Built-in, code-managed)  │   (Created per workspace)         │
├─────────────────────────────┼───────────────────────────────────┤
│ • Auth (login, register)    │ • Public booking website          │
│ • User Home (workspace list)│ • Sales CRM portal                │
│ • Workspace Shell           │ • TV dashboard display            │
│ • Company Management        │ • External client chat            │
│ • Admin Panel               │ • Custom inventory app            │
├─────────────────────────────┼───────────────────────────────────┤
│ Data: users, workspaces,    │ Data: workspace tables,           │
│ companies, system configs   │ views, dashboards, workflows      │
└─────────────────────────────┴───────────────────────────────────┘

Hierarchy:
App → Pages → Layout → ComponentNodes
```

---

## Goals

### Phase 3.4.1: Foundation (Complete) ✅
- TypeScript types for App, Page, ComponentNode
- Component metadata system (props, events, hooks)
- Component registry and discovery
- Dynamic renderer with security
- Component versioning & migration system

### Phase 3.4.2: App System & POC (Current) 🔄
- App architecture (system + user types)
- NavLayout and PageLayout components
- Routing integration with Apps
- Full POC validation

### Phase 3.4.3: Database Migration (After POC)
- Move from JSON files to database
- API endpoints for CRUD
- Electric SQL sync

### Phase 3.4.4: Builder UI (Future)
- Visual page builder
- App templates & cloning
- App Creator App for marketers/admins
- AI-assisted building

---

## Core Types

### App

The top-level container for a collection of pages with shared configuration.

```typescript
type AppType = 'system' | 'user'

type App = {
  id: string                    // UUID
  type: AppType                 // 'system' = DocPal built-in, 'user' = workspace custom
  workspaceId: string | null    // null for system apps
  
  // Display
  title: string
  description: string
  icon?: string
  
  // Routing
  baseUrl: string               // URL pattern, e.g., "/workspaces/:slug" or "/auth"
  defaultPageId?: string        // Which page to show at baseUrl root
  
  // Shell/Navigation
  navLayout: string             // Component ID for navigation shell
                                // e.g., 'nav-sidebar', 'nav-tabs', 'nav-desktop', 'nav-minimal'
  
  // Content (inline JSON for now)
  pages: Page[]
  
  // Auth
  isPublic: boolean             // Public = no auth required
  authRules?: AuthRule[]        // Extend later for role-based access
  
  // Storage (Minio)
  bucketPrefix: string          // Folder path for app static assets (images, docs)
                                // e.g., "system/auth/" or "workspaces/{id}/apps/booking/"
  
  // Data Access
  dataScope: DataScope
  
  // Metadata
  meta?: AppMeta                // HTML meta, SEO, theme settings
  status: 'draft' | 'published' | 'archived'
  version: number
  
  createdAt?: Date
  updatedAt?: Date
}

type DataScope = {
  type: 'system' | 'workspace'
  
  // For system apps: which system data can be accessed
  systemAccess?: ('users' | 'workspaces' | 'companies' | 'workflows')[]
  
  // For user apps: defaults to full workspace data access
  // Could restrict later: tables?: string[], views?: string[]
}

type AppMeta = {
  favicon?: string
  themeColor?: string
  ogImage?: string
  ogTitle?: string
  ogDescription?: string
  // ... standard HTML meta fields
}

type AuthRule = {
  // Extend later for role-based access
  type: 'role' | 'permission' | 'custom'
  value: string
}
```

### Page

A single page within an App, containing layout and content.

```typescript
type Page = {
  id: string
  name: string
  icon?: string
  slug: string                  // URL segment within app (e.g., "settings", "dashboard")
  
  // Layout
  layout: string                // Component ID for page layout wrapper
                                // e.g., 'layout-page', 'layout-grid', 'layout-centered'
  content: ComponentNode[]      // Components placed inside the layout
  
  // Navigation
  showInNav: boolean            // Show in app navigation
  navOrder: number              // Sort order in navigation
  parentPageId?: string         // For nested navigation (submenus)
  
  // Auth (page-level override)
  requiresAuth: boolean
  authRules?: AuthRule[]
  
  // Page-specific meta (overrides app meta)
  meta?: PageMeta
}

type PageMeta = {
  title?: string                // Browser tab title
  description?: string          // Meta description
  // ... page-specific overrides
}
```

### ComponentNode

A node in the component tree that gets rendered dynamically.

```typescript
type ComponentNode = {
  id: string                    // Unique within tree
  componentId: string           // References ComponentSchema.id
  version?: number              // Component version (for migrations)
  
  // Configuration
  props?: Record<string, any>
  eventHandlers?: Record<string, any>  // JSONLogic expressions
  customStyle?: Record<string, any>
  customClass?: string
  
  // Slots (named children)
  slots?: {
    default?: ComponentNode[]
    [slotName: string]: ComponentNode[] | undefined
  }
  
  // Legacy: direct children (use slots.default instead)
  children?: ComponentNode[]
}
```

### ComponentSchema

Metadata for a registered component (stored in registry).

```typescript
type ComponentType = 'component' | 'container' | 'provider' | 'nav-layout' | 'page-layout'

type ComponentSchema = {
  id: string                    // Unique identifier
  name: string                  // Display name
  type: ComponentType
  description: string           // For AI/humans
  category: string              // For organization
  icon?: string                 // For UI display
  
  // Version for migrations
  version: number
  versionName?: string          // e.g., "1.0.0"
  
  // JSON Schema definitions
  props?: JSONSchema
  events?: JSONSchema
  slots?: JSONSchema
  exposes?: JSONSchema
  
  // Requirements
  requiredProviders?: string[]
  requiredParent?: string[]
  
  // Metadata
  isSystem?: boolean            // System component (can't be deleted)
  isPublic?: boolean            // Available to all workspaces
}
```

---

## System Components

### NavLayout Components (App Shell)

| ID | Description | Use Case |
|----|-------------|----------|
| `nav-sidebar` | Sidebar navigation + content area | Main workspace app |
| `nav-topbar` | Top navigation bar | User home |
| `nav-tabs` | Tab-based navigation | Multi-page forms |
| `nav-desktop` | Virtual desktop / dock style | Power users |
| `nav-minimal` | No navigation, just content | Auth pages, landing |
| `nav-none` | Fullscreen, no chrome | TV dashboards, kiosks |

### PageLayout Components (Page Wrapper)

| ID | Description | Use Case |
|----|-------------|----------|
| `layout-page` | Standard scrollable page | Most pages |
| `layout-grid` | CSS Grid layout | Dashboards, widgets |
| `layout-centered` | Centered content | Login, forms |
| `layout-sidebar-submenu` | Page with sub-navigation | Settings pages |
| `layout-fullscreen` | Edge-to-edge, no padding | Full-screen views |
| `layout-waterfall` | Masonry/waterfall | Card galleries |
| `layout-split` | Resizable split panes | Editor views |

---

## System Apps Definition

### Example: Auth App

```typescript
const authApp: App = {
  id: 'app-auth',
  type: 'system',
  workspaceId: null,
  
  title: 'Authentication',
  description: 'Login and registration',
  icon: 'i-heroicons-key',
  
  baseUrl: '/auth',
  defaultPageId: 'login',
  
  navLayout: 'nav-minimal',
  
  pages: [
    {
      id: 'login',
      name: 'Login',
      slug: 'login',
      layout: 'layout-centered',
      content: [
        {
          id: 'login-form',
          componentId: 'auth-login-form',
          props: { redirectTo: '/' }
        }
      ],
      showInNav: false,
      navOrder: 0,
      requiresAuth: false
    },
    {
      id: 'register',
      name: 'Register',
      slug: 'register',
      layout: 'layout-centered',
      content: [
        {
          id: 'register-form',
          componentId: 'auth-register-form',
          props: {}
        }
      ],
      showInNav: false,
      navOrder: 1,
      requiresAuth: false
    },
    {
      id: 'forgot-password',
      name: 'Forgot Password',
      slug: 'forgot-password',
      layout: 'layout-centered',
      content: [
        {
          id: 'forgot-form',
          componentId: 'auth-forgot-password-form',
          props: {}
        }
      ],
      showInNav: false,
      navOrder: 2,
      requiresAuth: false
    }
  ],
  
  isPublic: true,
  dataScope: { type: 'system', systemAccess: ['users'] },
  bucketPrefix: 'system/auth/',
  
  meta: {
    ogTitle: 'DocPal - Sign In',
    themeColor: '#4F46E5'
  },
  status: 'published',
  version: 1
}
```

### Example: User Home App

```typescript
const userHomeApp: App = {
  id: 'app-user-home',
  type: 'system',
  workspaceId: null,
  
  title: 'Home',
  description: 'User dashboard and workspace list',
  icon: 'i-heroicons-home',
  
  baseUrl: '/',
  defaultPageId: 'workspaces',
  
  navLayout: 'nav-topbar',
  
  pages: [
    {
      id: 'workspaces',
      name: 'Workspaces',
      slug: '',
      layout: 'layout-page',
      content: [
        {
          id: 'workspace-list',
          componentId: 'workspace-list',
          props: {}
        }
      ],
      showInNav: true,
      navOrder: 0,
      requiresAuth: true
    },
    {
      id: 'settings',
      name: 'Settings',
      slug: 'settings',
      layout: 'layout-page',
      content: [
        {
          id: 'user-settings',
          componentId: 'user-settings-form',
          props: {}
        }
      ],
      showInNav: true,
      navOrder: 1,
      requiresAuth: true
    }
  ],
  
  isPublic: false,
  dataScope: { type: 'system', systemAccess: ['workspaces', 'companies', 'users'] },
  bucketPrefix: 'system/user-home/',
  
  status: 'published',
  version: 1
}
```

### Example: Workspace App

```typescript
const workspaceApp: App = {
  id: 'app-workspace',
  type: 'system',
  workspaceId: null,  // Template - instantiated per workspace
  
  title: 'Workspace',
  description: 'Main workspace application',
  icon: 'i-heroicons-squares-2x2',
  
  baseUrl: '/workspaces/:slug',
  defaultPageId: 'dashboard',
  
  navLayout: 'nav-sidebar',
  
  pages: [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: 'i-heroicons-chart-bar',
      slug: '',
      layout: 'layout-page',
      content: [
        {
          id: 'workspace-dashboard',
          componentId: 'workspace-dashboard',
          props: {}
        }
      ],
      showInNav: true,
      navOrder: 0,
      requiresAuth: true
    },
    {
      id: 'tables',
      name: 'Tables',
      icon: 'i-heroicons-table-cells',
      slug: 'tables',
      layout: 'layout-page',
      content: [
        {
          id: 'table-list',
          componentId: 'data-table-list',
          props: {}
        }
      ],
      showInNav: true,
      navOrder: 1,
      requiresAuth: true
    },
    {
      id: 'table-detail',
      name: 'Table',
      slug: 'tables/:tableId',
      layout: 'layout-page',
      content: [
        {
          id: 'table-viewer',
          componentId: 'data-table-viewer',
          props: {}  // tableId from route params
        }
      ],
      showInNav: false,
      navOrder: 0,
      requiresAuth: true
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: 'i-heroicons-cog-6-tooth',
      slug: 'settings',
      layout: 'layout-sidebar-submenu',
      content: [
        {
          id: 'workspace-settings',
          componentId: 'workspace-settings-form',
          props: {}
        }
      ],
      showInNav: true,
      navOrder: 99,
      requiresAuth: true
    }
  ],
  
  isPublic: false,
  dataScope: { type: 'workspace' },  // Full workspace access
  bucketPrefix: 'workspaces/:workspaceId/',
  
  status: 'published',
  version: 1
}
```

### Example: Company App

```typescript
const companyApp: App = {
  id: 'app-company',
  type: 'system',
  workspaceId: null,
  
  title: 'Company',
  description: 'Company management',
  icon: 'i-heroicons-building-office',
  
  baseUrl: '/company/:slug',
  defaultPageId: 'members',
  
  navLayout: 'nav-sidebar',
  
  pages: [
    {
      id: 'members',
      name: 'Members',
      icon: 'i-heroicons-users',
      slug: 'members',
      layout: 'layout-page',
      content: [
        {
          id: 'member-list',
          componentId: 'company-member-list',
          props: {}
        }
      ],
      showInNav: true,
      navOrder: 0,
      requiresAuth: true
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: 'i-heroicons-cog-6-tooth',
      slug: 'settings',
      layout: 'layout-page',
      content: [
        {
          id: 'company-settings',
          componentId: 'company-settings-form',
          props: {}
        }
      ],
      showInNav: true,
      navOrder: 1,
      requiresAuth: true
    }
  ],
  
  isPublic: false,
  dataScope: { type: 'system', systemAccess: ['companies', 'users', 'workspaces'] },
  bucketPrefix: 'companies/:companyId/',
  
  status: 'published',
  version: 1
}
```

---

## User Apps (Examples)

### Public Booking App

```typescript
const bookingApp: App = {
  id: 'uuid-booking-app',
  type: 'user',
  workspaceId: 'workspace-123',
  
  title: 'Public Booking',
  description: 'Customer booking portal',
  icon: 'i-heroicons-calendar',
  
  baseUrl: '/workspaces/:slug/apps/booking',
  defaultPageId: 'book',
  
  navLayout: 'nav-minimal',
  
  pages: [
    {
      id: 'book',
      name: 'Book Appointment',
      slug: '',
      layout: 'layout-centered',
      content: [
        {
          id: 'booking-form',
          componentId: 'booking-form',
          props: { showAvailability: true }
        }
      ],
      showInNav: false,
      navOrder: 0,
      requiresAuth: false  // Public!
    },
    {
      id: 'confirm',
      name: 'Confirmation',
      slug: 'confirm/:bookingId',
      layout: 'layout-centered',
      content: [
        {
          id: 'booking-confirmation',
          componentId: 'booking-confirmation',
          props: {}
        }
      ],
      showInNav: false,
      navOrder: 1,
      requiresAuth: false
    }
  ],
  
  isPublic: true,
  dataScope: { type: 'workspace' },
  bucketPrefix: 'workspaces/workspace-123/apps/booking/',
  
  meta: {
    ogTitle: 'Book Your Appointment',
    ogDescription: 'Schedule your next visit with us'
  },
  status: 'published',
  version: 1
}
```

### Sales CRM App

```typescript
const crmApp: App = {
  id: 'uuid-crm-app',
  type: 'user',
  workspaceId: 'workspace-123',
  
  title: 'Sales CRM',
  description: 'Customer relationship management',
  icon: 'i-heroicons-user-group',
  
  baseUrl: '/workspaces/:slug/apps/crm',
  defaultPageId: 'customers',
  
  navLayout: 'nav-sidebar',
  
  pages: [
    {
      id: 'customers',
      name: 'Customers',
      icon: 'i-heroicons-users',
      slug: '',
      layout: 'layout-page',
      content: [
        {
          id: 'customer-table',
          componentId: 'data-table-viewer',
          props: { tableId: 'customers-table' }
        }
      ],
      showInNav: true,
      navOrder: 0,
      requiresAuth: true
    },
    {
      id: 'deals',
      name: 'Deals',
      icon: 'i-heroicons-currency-dollar',
      slug: 'deals',
      layout: 'layout-page',
      content: [
        {
          id: 'deals-board',
          componentId: 'kanban-board',
          props: { tableId: 'deals-table' }
        }
      ],
      showInNav: true,
      navOrder: 1,
      requiresAuth: true
    }
  ],
  
  isPublic: false,
  dataScope: { type: 'workspace' },
  bucketPrefix: 'workspaces/workspace-123/apps/crm/',
  
  status: 'published',
  version: 1
}
```

### TV Dashboard App

```typescript
const tvDashboardApp: App = {
  id: 'uuid-tv-dashboard',
  type: 'user',
  workspaceId: 'workspace-123',
  
  title: 'TV Dashboard',
  description: 'Big screen display for office',
  icon: 'i-heroicons-tv',
  
  baseUrl: '/workspaces/:slug/apps/tv',
  defaultPageId: 'main',
  
  navLayout: 'nav-none',  // No navigation, fullscreen
  
  pages: [
    {
      id: 'main',
      name: 'Dashboard',
      slug: '',
      layout: 'layout-fullscreen',
      content: [
        {
          id: 'kpi-grid',
          componentId: 'dashboard-grid',
          props: { autoRefresh: 60 },
          slots: {
            default: [
              { id: 'sales-chart', componentId: 'chart-widget', props: { type: 'bar' } },
              { id: 'orders-count', componentId: 'metric-widget', props: { label: 'Orders' } },
              { id: 'revenue', componentId: 'metric-widget', props: { label: 'Revenue' } }
            ]
          }
        }
      ],
      showInNav: false,
      navOrder: 0,
      requiresAuth: false  // Public display
    }
  ],
  
  isPublic: true,
  dataScope: { type: 'workspace' },
  bucketPrefix: 'workspaces/workspace-123/apps/tv/',
  
  status: 'published',
  version: 1
}
```

---

## Routing Flow

```
User visits URL
       ↓
┌─────────────────────────────────────┐
│  1. Match URL against app.baseUrl   │
│     patterns (sorted by specificity)│
│     e.g., /workspaces/:slug matches │
│     app-workspace                   │
└─────────────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  2. Load App definition             │
│     - System apps: from JSON/code   │
│     - User apps: from DB            │
└─────────────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  3. Match remaining path to page    │
│     e.g., /settings matches page    │
│     with slug: 'settings'           │
│     Use defaultPageId if root       │
└─────────────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  4. Check auth                      │
│     - App level: app.isPublic       │
│     - Page level: page.requiresAuth │
│     Redirect to /auth/login if fail │
└─────────────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  5. Render                          │
│     a. NavLayout (app shell)        │
│     b. PageLayout (page wrapper)    │
│     c. Page.content (components)    │
└─────────────────────────────────────┘
```

### URL Examples

| URL | App | Page | Notes |
|-----|-----|------|-------|
| `/auth/login` | app-auth | login | Public |
| `/` | app-user-home | workspaces | Requires auth |
| `/settings` | app-user-home | settings | User settings |
| `/workspaces/my-shop` | app-workspace | dashboard | Workspace home |
| `/workspaces/my-shop/tables` | app-workspace | tables | Table list |
| `/workspaces/my-shop/tables/abc123` | app-workspace | table-detail | Specific table |
| `/company/acme/members` | app-company | members | Company members |
| `/workspaces/my-shop/apps/booking` | booking-app (user) | book | Public booking |
| `/workspaces/my-shop/apps/crm/deals` | crm-app (user) | deals | CRM deals |

---

## Implementation Steps

### Phase 3.4.2: App System & POC (Current)

#### Step 1: Update Types ✅
- [x] Add App type to `shared/dynamicComponent/dynamic-page.ts`
- [x] Add Page type with new structure
- [x] Add DataScope, AppMeta, PageMeta types
- [ ] Update ComponentNode with slots support

#### Step 2: Create System Apps JSON
- [ ] Create `app/data/apps/` folder
- [ ] Create `app-auth.json`
- [ ] Create `app-user-home.json`
- [ ] Create `app-workspace.json`
- [ ] Create `app-company.json`

#### Step 3: Build NavLayout Components
- [ ] `NavSidebar.global.vue` - Sidebar navigation
- [ ] `NavTopbar.global.vue` - Top navigation
- [ ] `NavMinimal.global.vue` - No navigation
- [ ] `NavNone.global.vue` - Fullscreen, no chrome

#### Step 4: Build PageLayout Components
- [ ] `LayoutPage.global.vue` - Standard page
- [ ] `LayoutCentered.global.vue` - Centered content
- [ ] `LayoutGrid.global.vue` - Grid layout
- [ ] `LayoutFullscreen.global.vue` - Edge-to-edge

#### Step 5: App Router Integration
- [ ] Create `useAppRouter` composable
- [ ] Match URL to App
- [ ] Match remaining path to Page
- [ ] Extract route params
- [ ] Handle 404s

#### Step 6: App Renderer
- [ ] Create `AppRenderer.vue` - Renders full app
- [ ] Inject NavLayout
- [ ] Inject PageLayout
- [ ] Render page content via DynamicRenderer

#### Step 7: POC Testing
- [ ] Test all system apps render correctly
- [ ] Test navigation between apps
- [ ] Test navigation between pages within app
- [ ] Test route param passing
- [ ] Test auth flow
- [ ] Test 404 handling

---

### Phase 3.4.3: Database Migration (After POC)

#### Prerequisites
- All POC tests passing
- Schema is stable and validated
- No major design changes anticipated

#### Database Schema

```sql
-- Apps table
CREATE TABLE apps (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('system', 'user')),
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  
  base_url TEXT NOT NULL,
  default_page_id TEXT,
  nav_layout TEXT NOT NULL,
  
  -- Inline JSON for pages
  pages JSONB NOT NULL,
  
  is_public BOOLEAN DEFAULT false,
  auth_rules JSONB,
  
  bucket_prefix TEXT,
  data_scope JSONB NOT NULL,
  meta JSONB,
  
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(workspace_id, base_url)
);

CREATE INDEX idx_apps_workspace ON apps(workspace_id);
CREATE INDEX idx_apps_type ON apps(type);
CREATE INDEX idx_apps_base_url ON apps(base_url);

-- Component schemas table (existing, updated)
CREATE TABLE ui_components (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('component', 'container', 'provider', 'nav-layout', 'page-layout')),
  description TEXT,
  category TEXT,
  icon TEXT,
  
  version INTEGER DEFAULT 1,
  version_name TEXT,
  
  props_schema JSONB,
  events_schema JSONB,
  slots_schema JSONB,
  exposes_schema JSONB,
  
  required_providers TEXT[],
  required_parent TEXT[],
  
  is_system BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ui_components_category ON ui_components(category);
CREATE INDEX idx_ui_components_type ON ui_components(type);
```

#### API Endpoints

```
# Apps
GET    /api/apps                      # List all accessible apps
GET    /api/apps/:id                  # Get app by ID
POST   /api/workspaces/:id/apps       # Create user app
PUT    /api/workspaces/:id/apps/:id   # Update user app
DELETE /api/workspaces/:id/apps/:id   # Delete user app

# Components
GET    /api/components                # List all component schemas
GET    /api/components/:id            # Get component schema
```

---

### Phase 3.4.4: Builder UI (Future)

- [ ] Visual page editor with drag & drop
- [ ] Component picker/drawer
- [ ] Props editor panel
- [ ] App Creator App for marketers/admins
- [ ] App templates library
- [ ] Clone/duplicate apps
- [ ] Custom domain support (requires backend proxy)
- [ ] AI-assisted building

---

## File Structure

```
app/
├── data/
│   ├── apps/                          # System app definitions (JSON)
│   │   ├── app-auth.json
│   │   ├── app-user-home.json
│   │   ├── app-workspace.json
│   │   └── app-company.json
│   └── components/                    # Component schemas (JSON)
│       └── component-registry.json
├── components/
│   ├── app/
│   │   ├── AppRenderer.vue            # Renders full app (nav + page + content)
│   │   └── AppLoader.vue              # Loads app by URL
│   ├── dynamicPage/
│   │   ├── DynamicRenderer.vue        # Renders component tree
│   │   └── ...
│   ├── navLayout/                     # NavLayout components
│   │   ├── NavSidebar.global.vue
│   │   ├── NavTopbar.global.vue
│   │   ├── NavMinimal.global.vue
│   │   └── NavNone.global.vue
│   └── pageLayout/                    # PageLayout components
│       ├── LayoutPage.global.vue
│       ├── LayoutCentered.global.vue
│       ├── LayoutGrid.global.vue
│       └── LayoutFullscreen.global.vue
├── composables/
│   ├── useAppRegistry.ts              # App registry (loads from JSON/DB)
│   ├── useAppRouter.ts                # URL → App → Page matching
│   ├── useComponentRegistry.ts        # Component schema registry
│   └── useDynamicRender.ts            # Rendering logic
└── pages/
    └── [...all].vue                   # Catch-all route for dynamic apps

shared/
└── dynamicComponent/
    └── dynamic-page.ts                # All types (App, Page, ComponentNode, etc.)

server/db/schema/                      # ⏸️ After POC validation
├── apps.ts
└── ui-components.ts
```

---

## Current Status

### ✅ Phase 3.4.1: Foundation Complete
- [x] TypeScript types (`shared/dynamicComponent/dynamic-page.ts`)
- [x] Component versioning system
- [x] Migration composable (`useComponentMigration`)
- [x] Dynamic renderer with edit/view mode
- [x] Component registry structure
- [x] `useDynamicRender` with undo/redo

### 🔄 Phase 3.4.2: App System (Current)

**New scope added:**
- [ ] App type definitions
- [ ] System apps JSON definitions
- [ ] NavLayout components
- [ ] PageLayout components
- [ ] App router integration
- [ ] App renderer
- [ ] Full POC validation

**Existing POC tasks:**
- [ ] Event listener testing
- [ ] Router implementation
- [ ] Error boundary testing
- [ ] Props & validation
- [ ] Slot rendering
- [ ] Edit mode features
- [ ] Real component integration

### ⏸️ Phase 3.4.3: Database Migration (After POC)
- Waiting for POC validation

### 🔮 Phase 3.4.4: Builder UI (Future)
- App Creator App for marketers/super admins
- Visual page builder
- App templates & cloning
- Custom domain support
- AI-assisted building

---

## Development Strategy

```
Phase 1 (Now):     JSON files in code → Fast iteration, easy debugging
Phase 2 (Stable):  Move to DB → Dynamic CRUD, multi-tenant
Phase 3 (Future):  App Creator App → Non-technical users create apps
```

---

## Success Criteria

### Phase 3.4.2 Complete When:
- ✅ All system apps defined in JSON
- ✅ NavLayout components render correctly
- ✅ PageLayout components render correctly
- ✅ App router matches URLs to apps/pages
- ✅ Full DocPal UI rendered via dynamic system
- ✅ User apps can be defined (hardcoded for testing)
- ✅ No regressions in existing functionality

### Phase 3.4.3 Complete When:
- ✅ Apps stored in database
- ✅ API endpoints working
- ✅ User apps CRUD working
- ✅ Electric SQL sync (if applicable)

### Phase 3.4.4 Complete When:
- ✅ App Creator App functional
- ✅ Non-technical users can create apps
- ✅ App templates available
- ✅ Custom domains supported
