import { inject } from 'vue'
import type { InjectionKey, Ref } from 'vue'

export interface DockItem {
  id: string
  label: string
  icon?: string
  url?: string
  urlRule?: string
  action?: () => void
  component?: any
  order?: number
}

export interface DockContext {
  items: Ref<DockItem[]>
  addItem: (item: DockItem) => void
  removeItem: (id: string) => void
  updateItem: (id: string, updates: Partial<DockItem>) => void
}

export const DockContextKey: InjectionKey<DockContext> = Symbol('DockContext')

export function useDockItems() {
  const context = inject(DockContextKey)

  if (!context) {
    throw new Error('useDockItems must be used within a component that provides DockContext')
  }

  return context
}

