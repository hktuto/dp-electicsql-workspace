/**
 * Dynamic Component & Page System Types
 * 
 * Type definitions for dynamic component rendering system.
 * 
 * Hierarchy: App → Pages → Layout → ComponentNodes
 */

// ============================================
// App Types
// ============================================

export type AppType = 'system' | 'user'

/**
 * App - Top-level container for a collection of pages
 * 
 * System apps: Built-in DocPal apps (auth, user home, workspace, company)
 * User apps: Custom apps created within workspaces (booking, CRM, dashboards)
 */
export interface AppNode {
  id: string
  type: AppType
  workspaceId: string | null    // null for system apps
  
  // Display
  title: string
  description: string
  icon?: string
  theme: string // theme style of this app, default to 'default'
  // Metadata
  meta?: AppMeta
  status: 'draft' | 'published' | 'archived'
  version: number
  
  // Routing
  baseUrl: string               // URL pattern, e.g., "/workspaces/:slug" or "/auth" or domain
  homePage?: string        // Which page to show at baseUrl root
  
  // Shell/Navigation
  navLayout: string             // Component ID for navigation shell
                                // e.g., 'nav-sidebar', 'nav-tabs', 'nav-desktop', 'nav-minimal'
  
  // Content
  pages: Page[]
  
  // Storage (Minio)
  bucketPrefix: string          // Folder path for app static assets
  
  createdAt?: string
  updatedAt?: string
}



/**
 * AppMeta - HTML meta and SEO settings for an app
 */
export interface AppMeta {
  favicon?: string
  themeColor?: string
  ogImage?: string
  ogTitle?: string
  ogDescription?: string
  [key: string]: any            // Allow additional meta fields
}

/**
 * AuthRule - Access control rule (extend later)
 */
export interface AuthRule {
  type: 'role' | 'permission' | 'custom'
  value: string
}

// ============================================
// Page Types
// ============================================

/**
 * Page - A single page within an App
 */
export interface Page {
  id: string
  title: string // page title for display
  slug: string // url friendly name
  // Page-specific meta
  meta?: PageMeta
  routeParams: Record<string, string> // route params needed for the page
  // Layout
  layout: string                // root component name for the page
  layoutProps: Record<string, any> // props for the layout
  content: ComponentNode[]      // Components placed inside the layout
  
  // Auth (page-level override)
  requiresAuth: boolean
  authRules?: AuthRule[]
  

}

/**
 * PageMeta - Page-specific meta overrides
 */
export interface PageMeta {
  title?: string
  description?: string
  [key: string]: any
}

// ============================================
// Component Metadata
// ============================================

export type ComponentType = 'component' | 'container' | 'provider' | 'nav-layout' | 'page-layout'

/**
 * Component ComponentOption - defines component schema and requirements
 * Exported from each .global.vue file
 */
export interface ComponentSchema {
  id: string                    // Unique identifier (e.g., 'workspace-detail')
  name: string                  // Display name (e.g., 'Workspace Detail')
  icon: string                  // Icon for component picker UI (emoji or icon name)
  type: ComponentType
  renderComponent: string       // The component to render, it should be a global component
  editComponent?: string        // The component to edit, it should be a global component
  description: string           // Human/AI readable description
  category: string              // Organization (e.g., 'workspace', 'table', 'form')
  
  // Versioning
  version: number               // Integer version for easy DB queries (1, 2, 3...)
  versionName: string           // Human-readable version (e.g., "1.0.0", "2.1.0-beta")
  
  // Schema definitions (JSON Schema format)
  props?: any // design later
  events?: any // design later
  slots?: { [key: string]: boolean } //  to future extend, create a object as now, later we can change the boolean to anything;
  exposes?: any /// design later
  
  // Migrations
  migrations?: ComponentMigration[]
  
  // Requirements
  requiredParent?: string[]     // Valid parent component IDs
  
  // Metadata
  deprecated?: boolean          // Mark as deprecated
  deprecationMessage?: string   // Why it's deprecated
}

/**
 * Component migration definition
 */
export interface ComponentMigration {
  fromVersion: number           // Source version (integer)
  toVersion: number             // Target version (integer)
  description: string           // What changed
  breaking: boolean             // Is this a breaking change?
  migrate: (node: ComponentNode) => ComponentNode  // Migration function
}



// ============================================
// Page Tree Structure
// ============================================

/**
 * Page tree node - represents a component instance in the page tree
 */
export interface ComponentNode {
  // Component reference
  componentId: string           // References ComponentSchema.id
  componentVersion: number      // Version when this node was created (integer)
  
  // Instance identity
  instanceId: string            // Unique ID in the tree
  
  // Component to render (denormalized from schema for performance)
  renderComponent: string       // The component to render in view mode
  editComponent?: string        // The component to render in edit mode
  
  // Configuration
  props?: Record<string, any>   // Static props or expressions
  eventHandlers?: Record<string, any>  // Event handler expressions (JSONLogic)
  customStyle?: Record<string, any>    // Custom CSS
  
  // Component structure
  slots?: Record<string, ComponentNode[] | string>
  
  // Metadata (optional, for tracking)
  createdAt?: string
  updatedAt?: string
  migratedAt?: string           // When last migrated
  migratedFrom?: number         // Original version if migrated
}

export const componentList: {
  [key: string]: ComponentSchema
} = {
  
}

export type AppTheme = {
  '--app-primary-h': string,
  '--app-primary-s': string,
  '--app-primary-l': string,

  '--app-accent-color': string,

  '--app-success-h': string,
  '--app-success-s': string,
  '--app-success-l': string,

  '--app-warning-h': string,
  '--app-warning-s': string,
  '--app-warning-l': string,

  '--app-danger-h': string,
  '--app-danger-s': string,
  '--app-danger-l': string,

  '--app-error-h': string,
  '--app-error-s': string,
  '--app-error-l': string,

  '--app-info-h': string,
  '--app-info-s': string,
  '--app-info-l': string,

  '--app-grey-hue': string,
  '--app-grey-saturation': string,

  '--app-custom-font': string,

  '--transparent-factor': string,

  '--app-font-size-xxs': string,
  '--app-font-size-xs': string,
  '--app-font-size-s': string,
  '--app-font-size-m': string,
  '--app-font-size-l': string,
  '--app-font-size-xl': string,
  '--app-font-size-xxl': string,
  '--app-line-height': string,
  '--app-font-weight': string,
  '--app-font-weight-title': string,

  '--app-border-radius-s': string,
  '--app-border-radius-m': string,
  '--app-border-radius-l': string,
  '--app-border-radius-xl': string,
  '--app-border-radius-xxl': string,
  
  '--app-space-xxs': string,
  '--app-space-xs': string,
  '--app-space-s': string,
  '--app-space-m': string,
  '--app-space-l': string,
  '--app-space-xl': string,
  '--app-space-xxl': string,

  '--app-content-max-width': string,

  [key: string]: string,
}

