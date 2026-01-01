/**
 * Dynamic Component & Page System Types
 * 
 * Type definitions for dynamic component rendering system.
 */

// ============================================
// Component Metadata
// ============================================

export type ComponentType = 'component' | 'container' | 'provider'

/**
 * Component ComponentOption - defines component schema and requirements
 * Exported from each .global.vue file
 */
export interface ComponentSchema {
  id: string                    // Unique identifier (e.g., 'workspace-detail')
  name: string                  // Display name (e.g., 'Workspace Detail')
  type: ComponentType
  renderComponent: string       // The component to render, it should be a global component
  editComponent?: string       // The component to edit, it should be a global component
  description: string           // Human/AI readable description
  category: string              // Organization (e.g., 'workspace', 'table', 'form')
  
  // Schema definitions (JSON Schema format)
  props?: any // design later
  events?: any // design later
  slots?: { [key: string]: boolean } //  to future extend, create a object as now, later we can change the boolean to anything;
  exposes?: any /// design later
  
  // Requirements
  requiredParent?: string[]     // Valid parent component IDs
}



// ============================================
// Page Tree Structure
// ============================================

/**
 * Page tree node - represents a component instance in the page tree
 */
export interface ComponentNode {
  id: string                    // Unique node ID in the tree
  name: string
  type: ComponentType
  description: string
  category: string
  renderComponent: string
  editComponent?: string
  
  // Configuration
  props?: Record<string, any>   // Static props or expressions
  eventHandlers?: Record<string, any>  // Event handler expressions (JSONLogic)
  customStyle?: Record<string, any>    // Custom CSS
  
  // Component structure
  slots?: Record<string, ComponentNode[]>
}

export const componentList: {
  [key: string]: ComponentSchema
} ={
  "pageContainer":{
    id: "sideBarLayout",
    name: "Side Bar Layout",
    type: "container",
    description: "The left sidebar layout. left side contain logo, menu and footer, right side is the content area.",
    renderComponent: 'PageContainer',
    editComponent: "PageContainerEdit",
    category: "page",
    props: {
      logo: "",
      menu: [],
      footer: [],
    },
    slots:{
       default: true,
    }
  },
  "pageHeader":{
    id: "pageHeader",
    name: "Page Header",
    type: "container",
    description: "The header of the page. include breadcrumb, header right and content area.",
    category: "container",
    renderComponent: "PageHeader",
    editComponent: "PageHeaderEdit",
    props: {
      breadcrumb: [],
      headerRight: [],
    },
    slots:{
      actions: true,
    },
  },
  "workspaceList":{
    id: "workspaceList",
    name: "Workspace List",
    type: "container",
    description: "The list of workspaces.",
    category: "container",
    renderComponent: "WorkspaceList",
    editComponent: "WorkspaceListEdit",
    props: {
      workspaces: [],
    },
    slots:{
    },
    requiredParent: ["pageContainer"],
  },
  "workspaceDetail":{
    id: "workspaceDetail",
    name: "Workspace Detail",
    type: "container",
    description: "The detail of the workspace.",
    category: "container",
    renderComponent: "WorkspaceDetail",
    editComponent: "WorkspaceDetailEdit",
    props: {
      workspace: null,
    },
    slots:{
      default: true,
    },
    requiredParent: [],
  }
}

