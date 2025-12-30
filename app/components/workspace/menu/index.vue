<script setup lang="ts">
import type { MenuItem } from '#shared/types/db'
import type { MenuState, MenuContext } from '~/composables/useWorkspaceMenuContext'
import { WorkspaceMenuContextKey } from '~/composables/useWorkspaceMenuContext'
import { v4 as uuidv4 } from 'uuid'

interface Props {
  workspaceId: string
  initialMenu: MenuItem[]
  isAdmin: boolean
}

const props = defineProps<Props>()

// Helper: Get all folder IDs recursively
function getAllFolderIds(items: MenuItem[]): string[] {
  const folderIds: string[] = []
  for (const item of items) {
    if (item.type === 'folder') {
      folderIds.push(item.id)
      if (item.children) {
        folderIds.push(...getAllFolderIds(item.children))
      }
    }
  }
  return folderIds
}

// State management - all folders expanded by default
const menuState = ref<MenuState>({
  items: [...props.initialMenu],
  expandedFolders: new Set<string>(getAllFolderIds(props.initialMenu)),
  editingItemId: null,
  isDragging: false,
})

// Helper: Deep compare menu items using JSON stringification
function areMenuItemsEqual(a: MenuItem[], b: MenuItem[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Debounced save to avoid too many API calls during drag
const saveTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const isSaving = ref(false)
const pendingSave = ref(false)

// Track what we last saved to avoid infinite loop with Electric sync
const lastSavedHash = ref<string | null>(null)

function getMenuHash(menu: MenuItem[]): string {
  return JSON.stringify(menu)
}

async function debouncedSave(menu: MenuItem[]) {
  // Clear any pending save
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value)
  }
  
  // If currently saving, mark as pending
  if (isSaving.value) {
    pendingSave.value = true
    return
  }
  
  // Skip if nothing changed from last save
  const currentHash = getMenuHash(menu)
  if (currentHash === lastSavedHash.value) {
    console.log('[Menu] Skip save - no changes from last save')
    return
  }
  
  // Debounce for 300ms
  saveTimeout.value = setTimeout(async () => {
    isSaving.value = true
    try {
      // Store hash BEFORE saving so we can ignore the Electric sync echo
      lastSavedHash.value = getMenuHash(menu)
      
      await saveMenuToServer(menu)
      console.log('[Menu] Saved to server')
      
      // If there was a pending save, save again
      if (pendingSave.value) {
        pendingSave.value = false
        const latestHash = getMenuHash(menuState.value.items)
        if (latestHash !== lastSavedHash.value) {
          lastSavedHash.value = latestHash
          await saveMenuToServer(menuState.value.items)
        }
      }
    } finally {
      isSaving.value = false
    }
  }, 300)
}

// Watch for drag changes and save
watch(() => menuState.value.items, (newMenu) => {
  // Only auto-save if we're not receiving external updates
  if (!menuState.value.isDragging) return
  
  console.log('[Menu] Items changed during drag, will save...')
}, { deep: true })

// Watch for external menu updates (from Electric SQL sync)
watch(() => props.initialMenu, (newMenu, oldMenu) => {
  // Skip update if we're dragging
  if (menuState.value.isDragging) {
    console.log('[Menu] Skipping external update during drag')
    return
  }
  
  // Skip update if menu hasn't actually changed from our local state
  if (areMenuItemsEqual(menuState.value.items, newMenu)) {
    console.log('[Menu] No changes detected, skipping update')
    return
  }
  
  // Skip update if this is just an echo of what we saved
  const newMenuHash = getMenuHash(newMenu)
  if (newMenuHash === lastSavedHash.value) {
    console.log('[Menu] Skipping echo of our own save')
    return
  }
  
  console.log('[Menu] External changes detected, updating menu')
  
  // Preserve expanded state when updating
  const previousExpandedFolders = new Set(menuState.value.expandedFolders)
  
  // Update items
  menuState.value.items = [...newMenu]
  
  // Restore expanded state for folders that still exist
  const newFolderIds = getAllFolderIds(newMenu)
  menuState.value.expandedFolders = new Set(
    newFolderIds.filter(id => previousExpandedFolders.has(id))
  )
  
  // Auto-expand new folders
  const oldFolderIds = new Set(getAllFolderIds(oldMenu || []))
  const newlyAddedFolders = newFolderIds.filter(id => !oldFolderIds.has(id))
  newlyAddedFolders.forEach(id => menuState.value.expandedFolders.add(id))
  
  // Cancel editing if the item being edited no longer exists
  if (menuState.value.editingItemId) {
    const stillExists = findItemById(newMenu, menuState.value.editingItemId)
    if (!stillExists) {
      menuState.value.editingItemId = null
    }
  }
}, { deep: true })

// Helper: Find item by id recursively
function findItemById(items: MenuItem[], id: string): MenuItem | null {
  for (const item of items) {
    if (item.id === id) return item
    if (item.children) {
      const found = findItemById(item.children, id)
      if (found) return found
    }
  }
  return null
}

// Helper: Remove item by id recursively
function removeItemById(items: MenuItem[], id: string): MenuItem[] {
  return items.filter(item => {
    if (item.id === id) return false
    if (item.children) {
      item.children = removeItemById(item.children, id)
    }
    return true
  })
}

// Helper: Update order numbers
function updateOrderNumbers(items: MenuItem[]): MenuItem[] {
  return items.map((item, index) => ({
    ...item,
    order: index,
    children: item.children ? updateOrderNumbers(item.children) : undefined,
  }))
}

// API call to update menu
async function saveMenuToServer(menu: MenuItem[]) {
  try {
    await $fetch(`/api/workspaces/${props.workspaceId}`, {
      method: 'PUT',
      body: { menu },
    })
  } catch (error) {
    console.error('Failed to update menu:', error)
    ElMessage.error('Failed to update menu')
    throw error
  }
}

// Actions
const toggleFolder = (id: string) => {
  if (menuState.value.expandedFolders.has(id)) {
    menuState.value.expandedFolders.delete(id)
  } else {
    menuState.value.expandedFolders.add(id)
  }
}

const startEdit = (id: string) => {
  if (!props.isAdmin) return
  menuState.value.editingItemId = id
}

const saveEdit = async (id: string, newLabel: string) => {
  if (!props.isAdmin || !newLabel.trim()) return

  const item = findItemById(menuState.value.items, id)
  if (!item) return

  // Update locally
  item.label = newLabel.trim()
  item.slug = newLabel.trim().toLowerCase().replace(/\s+/g, '-')
  menuState.value.editingItemId = null

  // Save to server
  await saveMenuToServer(menuState.value.items)
}

const cancelEdit = () => {
  menuState.value.editingItemId = null
}

const deleteItem = async (id: string) => {
  if (!props.isAdmin) return

  // Remove from local state
  menuState.value.items = removeItemById(menuState.value.items, id)
  
  // Update order numbers
  menuState.value.items = updateOrderNumbers(menuState.value.items)

  // Save to server
  await saveMenuToServer(menuState.value.items)
}

const addItem = async (parentId: string | null, type: MenuItem['type']) => {
  if (!props.isAdmin) return

  const newItem: MenuItem = {
    id: uuidv4(),
    label: `New ${type}`,
    slug: `new-${type}-${Date.now()}`,
    type,
    order: 0,
    children: type === 'folder' ? [] : undefined,
  }

  if (parentId) {
    // Add to parent folder
    const parent = findItemById(menuState.value.items, parentId)
    if (parent && parent.type === 'folder') {
      if (!parent.children) parent.children = []
      newItem.order = parent.children.length
      parent.children.push(newItem)
      // Auto-expand parent
      menuState.value.expandedFolders.add(parentId)
    }
  } else {
    // Add to root
    newItem.order = menuState.value.items.length
    menuState.value.items.push(newItem)
  }

  // Save to server
  await saveMenuToServer(menuState.value.items)

  // Auto-start editing
  menuState.value.editingItemId = newItem.id
}

const updateMenu = async (newMenu: MenuItem[]) => {
  // Update order numbers
  const orderedMenu = updateOrderNumbers(newMenu)
  menuState.value.items = orderedMenu

  // Save to server
  await saveMenuToServer(orderedMenu)
}

// Handle menu changes from draggable list (v-model update)
async function handleMenuChange(newItems: MenuItem[]) {
  console.log('[Menu] Menu changed from drag:', newItems.length, 'items')
  
  // Update order numbers
  const orderedMenu = updateOrderNumbers(newItems)
  menuState.value.items = orderedMenu
  
  // Debounced save to server
  debouncedSave(orderedMenu)
}

// Create context object
const menuContext: MenuContext = {
  state: menuState,
  toggleFolder,
  startEdit,
  saveEdit,
  cancelEdit,
  deleteItem,
  addItem,
  updateMenu,
}

// Provide context to children
provide(WorkspaceMenuContextKey, menuContext)

// Add item popover
const addItemPopover = ref()
const addItemTarget = ref<HTMLElement | null>(null)

function openAddMenu(event: MouseEvent) {
  if (!props.isAdmin) return
  addItemTarget.value = event.currentTarget as HTMLElement
  addItemPopover.value?.open(addItemTarget.value)
}

async function handleAddItem(type: MenuItem['type']) {
  await menuContext.addItem(null, type)
  addItemPopover.value?.close()
}
</script>

<template>
  <div class="workspace-menu">
    <!-- Header -->
    <div class="menu-header">
      <h3>Navigation</h3>
      <el-button
        v-if="isAdmin"
        text
        circle
        size="small"
        @click="openAddMenu"
      >
        <Icon name="material-symbols:add" />
      </el-button>
    </div>

    <!-- Menu Content -->
    <div class="menu-content">
      <div v-if="menuContext.state.value.items.length === 0" class="empty-state">
        <Icon name="material-symbols:folder-open-outline" size="48" />
        <p class="empty-title">No items yet</p>
        <p class="empty-description">
          {{ isAdmin ? 'Click + to add your first table' : 'No items to display' }}
        </p>
      </div>

      <WorkspaceMenuDraggableList
        v-else
        v-model="menuState.items"
        :level="0"
        :parent-id="null"
        :is-admin="isAdmin"
        @update:model-value="handleMenuChange"
      />
    </div>

    <!-- Add Item Popover -->
    <CommonPopoverDialog
      ref="addItemPopover"
      placement="bottom-start"
      :width="200"
    >
      <div class="add-menu">
        <div class="add-menu-item" @click="handleAddItem('folder')">
          <Icon name="material-symbols:folder-outline" />
          <span>Folder</span>
        </div>
        <div class="add-menu-item" @click="handleAddItem('table')">
          <Icon name="material-symbols:table-outline" />
          <span>Table</span>
        </div>
        <div class="add-menu-item" @click="handleAddItem('view')">
          <Icon name="material-symbols:view-list-outline" />
          <span>View</span>
        </div>
        <div class="add-menu-item" @click="handleAddItem('dashboard')">
          <Icon name="material-symbols:dashboard-outline" />
          <span>Dashboard</span>
        </div>
      </div>
    </CommonPopoverDialog>
  </div>
</template>

<style scoped lang="scss">
.workspace-menu {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--app-space-m);
  border-bottom: 1px solid var(--app-border-color);

  h3 {
    margin: 0;
    font-size: var(--app-font-size-m);
    font-weight: 600;
  }
}

.menu-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--app-space-s);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--app-space-xl) var(--app-space-m);
  text-align: center;
  color: var(--app-text-color-secondary);

  .empty-title {
    margin: var(--app-space-m) 0 var(--app-space-xs);
    font-size: var(--app-font-size-m);
    font-weight: 500;
  }

  .empty-description {
    margin: 0;
    font-size: var(--app-font-size-s);
  }
}

.add-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.add-menu-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  padding: var(--app-space-s) var(--app-space-m);
  border-radius: var(--app-border-radius-s);
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: var(--el-fill-color-light);
  }

  span {
    font-size: var(--app-font-size-s);
  }
}
</style>
