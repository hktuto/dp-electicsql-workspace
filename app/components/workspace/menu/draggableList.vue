<script setup lang="ts">
import type { MenuItem } from '#shared/types/db'
import { useWorkspaceMenuContext } from '~/composables/useWorkspaceMenuContext'
import draggable from 'vuedraggable'

interface Props {
  items: MenuItem[]
  level: number
  isRoot?: boolean
  parentId?: string | null
  isAdmin?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isAdmin: true,
  isRoot: false,
})

const menuContext = useWorkspaceMenuContext()

// Local reactive copy for draggable
// const localItems = ref<MenuItem[]>([...props.items])

// Watch for external changes (from parent/context)
// But skip if we're dragging - let vuedraggable handle it

const emit = defineEmits<{
  (e: 'items-change'): void
}>()
// watch(localItems, (newItems, oldItems) => {
//   console.log('localItems on watch', props.isRoot, props.level)
//   if(props.isRoot) {
//     console.log('localItems is on root', newItems, oldItems)
//     // menuContext.state.value.items = [...localItems.value]
//     // await menuContext.updateMenu(menuContext.state.value.items)
//   }else{
//     emit('items-change')
//   }
// }, { deep: true })

function handleItemsChange() {
  console.log('items change', props.level,)
  if(props.isRoot) {
    console.log('items change is on root', props.items)

    // menuContext.state.value.items = [...localItems.value]
    // await menuContext.updateMenu(menuContext.state.value.items)
  }else{
    emit('items-change')
  }
}

// Handle drag end - vuedraggable already updated localItems
// We just need to sync this change back to the menu context
async function handleDragEnd(event: any) {
  menuContext.state.value.isDragging = false
  
  // Wait a tick to ensure all localItems are updated
  await nextTick()
  
  // Now collect the entire menu structure by reading from all lists
  // vuedraggable has already updated all localItems correctly
  // We just need to update the menu context with the current localItems
  // updateMenuContext()
  
  // Save to server
  // await menuContext.updateMenu(menuContext.state.value.items)
}

// Update the menu context with current localItems
// This syncs the current list back to the parent context
function updateMenuContext() {
  if (props.parentId === null) {
    // We're at root level - update root items
    menuContext.state.value.items = [...localItems.value]
  } else {
    // We're in a folder - find parent and update its children
    const updateParentChildren = (items: MenuItem[]): MenuItem[] => {
      return items.map(item => {
        if (item.id === props.parentId && item.type === 'folder') {
          // Found the parent - update its children
          return {
            ...item,
            children: [...localItems.value],
          }
        }
        if (item.children) {
          // Keep looking in children
          return {
            ...item,
            children: updateParentChildren(item.children),
          }
        }
        return item
      })
    }
    
    menuContext.state.value.items = updateParentChildren(menuContext.state.value.items)
  }
}

// Handle drag start
function handleDragStart() {
  menuContext.state.value.isDragging = true
}

// Helper to find item by id
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

// Check if folder is expanded
function isExpanded(itemId: string): boolean {
  return menuContext.state.value.expandedFolders.has(itemId)
}
</script>

<template>
  {{ items }}
  <draggable
    :list="items"
    :disabled="!isAdmin"
    item-key="id"
    class="draggable-list"
    :class="{ [`level-${level}`]: true }"
    group="menu-items"
    ghost-class="ghost"
    drag-class="dragging"
    handle=".drag-handle"
    :animation="200"
    @start="handleDragStart"
    @end="handleDragEnd"
  >
    <template #item="{ element }">
      <div class="draggable-item">
        <!-- Menu Item -->
        <WorkspaceMenuItem
          :item="element"
          :is-admin="isAdmin"
        />

        <!-- Nested Children (if folder and expanded) -->
        <div
          v-if="element.type === 'folder' && element.children && isExpanded(element.id)"
          class="nested-children"
        >
          <WorkspaceMenuDraggableList
            :items="element.children"
            :level="level + 1"
            :parent-id="element.id"
            :is-admin="isAdmin"
            @items-change="handleItemsChange"
          />
        </div>
      </div>
    </template>
  </draggable>
</template>

<style scoped lang="scss">
.draggable-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.draggable-item {
  display: flex;
  flex-direction: column;
}

.nested-children {
  padding-left: 20px;
  margin-top: 2px;
}

// Drag states
:deep(.ghost) {
  opacity: 0.5;
  background: var(--el-color-primary-light-9);
  border: 1px dashed var(--el-color-primary);
  border-radius: var(--app-border-radius-s);
}

:deep(.dragging) {
  opacity: 0.8;
  transform: rotate(2deg);
}

// Level-based indentation (for non-nested items)
.level-0 {
  // Root level
}

.level-1 {
  // First nested level
}

.level-2 {
  // Second nested level
}
</style>

