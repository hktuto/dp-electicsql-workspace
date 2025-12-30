<script setup lang="ts">
import type { MenuItem } from '#shared/types/db'
import { v4 as uuidv4 } from 'uuid'

// Types from useWorkspaceMenuContext (auto-imported)
import type { MenuState, MenuContext } from '#layers/workspace/app/composables/useWorkspaceMenuContext'
import { WorkspaceMenuContextKey } from '#layers/workspace/app/composables/useWorkspaceMenuContext'

interface Props {
  workspaceId: string
  workspaceSlug: string
  initialMenu: MenuItem[]
  isAdmin: boolean
}

const props = defineProps<Props>()
  const { $api } = useNuxtApp()
const router = useRouter()

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

// Helper: Get all table IDs recursively
function getAllTableIds(items: MenuItem[]): string[] {
  const tableIds: string[] = []
  for (const item of items) {
    if (item.type === 'table') {
      tableIds.push(item.id)
    }
    if (item.children) {
      tableIds.push(...getAllTableIds(item.children))
    }
  }
  return tableIds
}

const deleteItem = async (id: string) => {
  if (!props.isAdmin) return

  // Find the item to check its type
  const item = findItemById(menuState.value.items, id)
  if (!item) return

  // If it's a table, delete the physical table via API
  if (item.type === 'table') {
    try {
      await $api(`/api/workspaces/${props.workspaceId}/tables/${id}`, {
        method: 'DELETE',
      })
      ElMessage.success(`Table "${item.label}" deleted successfully`)
    } catch (error: any) {
      console.error('Failed to delete table:', error)
      ElMessage.error(error.data?.message || 'Failed to delete table')
      return // Don't remove from menu if API call failed
    }
  }
  
  // If it's a folder, delete all tables inside recursively
  if (item.type === 'folder' && item.children) {
    const tableIds = getAllTableIds(item.children)
    for (const tableId of tableIds) {
      try {
        await $fetch(`/api/workspaces/${props.workspaceId}/tables/${tableId}`, {
          method: 'DELETE',
        })
      } catch (error: any) {
        console.error(`Failed to delete table ${tableId}:`, error)
        ElMessage.error(`Failed to delete some tables in folder "${item.label}"`)
        return // Don't remove from menu if any API call failed
      }
    }
    if (tableIds.length > 0) {
      ElMessage.success(`Deleted ${tableIds.length} table(s) from folder "${item.label}"`)
    }
  }

  // Navigate away if user is currently viewing the deleted item (use slug)
  const currentPath = router.currentRoute.value.path
  if (item.slug && (
      currentPath.includes(`/tables/${item.slug}`) || 
      currentPath.includes(`/view/${item.slug}`) || 
      currentPath.includes(`/folder/${item.slug}`) || 
      currentPath.includes(`/dashboard/${item.slug}`)
    )) {
    router.push(`/workspaces/${props.workspaceSlug}`)
  }

  // Remove from local state
  menuState.value.items = removeItemById(menuState.value.items, id)
  
  // Update order numbers
  menuState.value.items = updateOrderNumbers(menuState.value.items)

  // Save to server
  await saveMenuToServer(menuState.value.items)
}

const addItem = async (parentId: string | null, type: MenuItem['type']) => {
  if (!props.isAdmin) return

  // For tables, open the creation dialog instead of adding directly
  if (type === 'table') {
    createTableForm.value = { name: '', description: '', icon: '' }
    createTableParentId.value = parentId
    
    // We need a target element, use document.body as fallback
    const target = document.activeElement as HTMLElement || document.body
    createTableTarget.value = target
    createTablePopover.value?.open(target)
    return
  }

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
function openSetting(slug: string, type: MenuItem['type']) {
  router.push(`/workspaces/${props.workspaceSlug}/${type}/${slug}/setting`)
}
// Navigate to menu item
function navigateToItem(item: MenuItem) {
  const base = `/workspaces/${props.workspaceSlug}`
  console.log('navigateToItem', item)
  switch (item.type) {
    case 'folder':
      router.push(`${base}/folder/${item.slug}`)
      break
    case 'table':
      router.push(`${base}/tables/${item.slug}`)
      break
    case 'view':
      router.push(`${base}/view/${item.slug}`)
      break
    case 'dashboard':
      router.push(`${base}/dashboard/${item.slug}`)
      break
    default:
      console.warn('Unknown item type:', item.type)
  }
}

// Create context object
const menuContext: MenuContext = {
  state: menuState,
  workspaceSlug: computed(() => props.workspaceSlug),
  toggleFolder,
  startEdit,
  saveEdit,
  cancelEdit,
  deleteItem,
  addItem,
  updateMenu,
  navigateToItem,
  openSetting,
}

// Provide context to children
provide(WorkspaceMenuContextKey, menuContext)

// Add item popover
const addItemPopover = ref()
const addItemTarget = ref<HTMLElement | null>(null)

// Table creation dialog
const createTablePopover = ref()
const createTableTarget = ref<HTMLElement | null>(null)
const createTableParentId = ref<string | null>(null)
const createTableForm = ref({
  name: '',
  description: '',
  icon: '',
})

function openAddMenu(event: MouseEvent) {
  if (!props.isAdmin) return
  addItemTarget.value = event.currentTarget as HTMLElement
  addItemPopover.value?.open(addItemTarget.value)
}

async function handleAddItem(type: MenuItem['type'], parentId: string | null = null) {
  addItemPopover.value?.close()
  
  if (type === 'table') {
    // Open table creation dialog
    createTableForm.value = { name: '', description: '', icon: '' }
    createTableParentId.value = parentId
    
    // Open popover at the add button location
    if (addItemTarget.value) {
      createTableTarget.value = addItemTarget.value
      createTablePopover.value?.open(addItemTarget.value)
    }
  } else {
    // For other types (folder, view, dashboard), add directly
    await menuContext.addItem(parentId, type)
  }
}

async function handleCreateTable() {
  if (!createTableForm.value.name.trim()) {
    ElMessage.error('Table name is required')
    return
  }

  try {
    // Create table via API
    const newTable = await $api(`/api/workspaces/${props.workspaceId}/tables`, {
      method: 'POST',
      body: {
        name: createTableForm.value.name,
        description: createTableForm.value.description || undefined,
        icon: createTableForm.value.icon || undefined,
      },
    })
    if(!newTable || !newTable.success || !newTable.table) {
      ElMessage.error('Failed to create table')
      return
    }
    // Create menu item with type 'table'
    const menuItem: MenuItem = {
      id: newTable.table.id,
      label: newTable.table.name,
      slug: newTable.table.slug,
      type: 'table',  // Explicitly set type as 'table'
      order: 0,
    }

    // Add to menu (root or folder)
    const parentId = createTableParentId.value
    if (parentId) {
      // Add to parent folder
      const parent = findItemById(menuState.value.items, parentId)
      if (parent && parent.type === 'folder') {
        if (!parent.children) parent.children = []
        menuItem.order = parent.children.length
        parent.children.push(menuItem)
        // Auto-expand parent
        menuState.value.expandedFolders.add(parentId)
      }
    } else {
      // Add to root
      menuItem.order = menuState.value.items.length
      menuState.value.items.push(menuItem)
    }

    // Save menu to server
    await saveMenuToServer(menuState.value.items)

    // Close popover
    createTablePopover.value?.close()

    // Navigate to table
    ElMessage.success(`Table "${newTable.table.name}" created successfully`)
    router.push(`/workspaces/${props.workspaceSlug}/tables/${newTable.table.slug}`)
  } catch (error: any) {
    console.error('Failed to create table:', error)
    ElMessage.error(error.data?.message || 'Failed to create table')
  }
}
</script>

<template>
  <div class="workspace-menu">
    <!-- Header -->
    <Teleport defer to="#workspace-sidebar-actions-start">
        <el-button
          v-if="isAdmin"
          text
          circle
          size="small"
          @click="openAddMenu"
        >
          <Icon name="material-symbols:add" />
        </el-button>
      </Teleport>

    <!-- Menu Content -->
    <div class="menu-content">
      <!-- Empty State -->
      <div v-if="menuContext.state.value.items.length === 0" class="empty-state">
        <Icon name="material-symbols:folder-open-outline" size="48" />
        <p class="empty-title">No items yet</p>
        <p class="empty-description">
          {{ isAdmin ? 'Click + to add your first table' : 'No items to display' }}
        </p>
      </div>

      <!-- Draggable Menu Items -->
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

    <!-- Create Table Dialog -->
    <CommonPopoverDialog
      ref="createTablePopover"
      placement="right-start"
      :width="400"
      title="Create New Table"
    >
      <el-form label-position="top" class="create-table-form">
        <el-form-item label="Table Name" required>
          <el-input
            v-model="createTableForm.name"
            placeholder="e.g. Projects, Customers, Tasks"
            maxlength="100"
            @keyup.enter="handleCreateTable"
          />
        </el-form-item>

        <el-form-item label="Description">
          <el-input
            v-model="createTableForm.description"
            type="textarea"
            :rows="3"
            placeholder="Optional description for this table"
            maxlength="500"
          />
        </el-form-item>

        <el-form-item label="Icon">
          <CommonIconPickerInput v-model="createTableForm.icon" />
        </el-form-item>

        <div class="form-actions">
          <el-button @click="createTablePopover?.close()">Cancel</el-button>
          <el-button type="primary" @click="handleCreateTable">
            Create Table
          </el-button>
        </div>
      </el-form>
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
  padding: var(--app-space-xs);
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
  padding: var(--app-space-xs);
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
  padding: var(--app-space-xs);
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

.create-table-form {
  padding: var(--app-space-m);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--app-space-s);
  margin-top: var(--app-space-m);
}
</style>
