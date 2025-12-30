import type { MenuItem } from '#shared/types/db'
import type { InjectionKey, Ref, ComputedRef } from 'vue'

// Menu state for component
export interface MenuState {
  items: MenuItem[]
  expandedFolders: Set<string>
  editingItemId: string | null
  isDragging: boolean
}

// Menu context interface
export interface MenuContext {
  state: Ref<MenuState>
  workspaceSlug: ComputedRef<string>
  toggleFolder: (id: string) => void
  startEdit: (id: string) => void
  saveEdit: (id: string, newLabel: string) => Promise<void>
  cancelEdit: () => void
  deleteItem: (id: string) => Promise<void>
  addItem: (parentId: string | null, type: MenuItem['type']) => Promise<void>
  updateMenu: (newMenu: MenuItem[]) => Promise<void>
  navigateToItem: (item: MenuItem) => void
}

export const WorkspaceMenuContextKey: InjectionKey<MenuContext> = Symbol('WorkspaceMenuContext')

export function useWorkspaceMenuContext() {
  const context = inject(WorkspaceMenuContextKey)

  if (!context) {
    throw new Error('useWorkspaceMenuContext must be used within WorkspaceMenu component')
  }
  
  return context
}

