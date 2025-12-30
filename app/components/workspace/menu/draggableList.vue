<script setup lang="ts">
import type { MenuItem } from '#shared/types/db'
import { useWorkspaceMenuContext } from '~/composables/useWorkspaceMenuContext'
import draggable from 'vuedraggable'

interface Props {
  modelValue: MenuItem[]
  level?: number
  parentId?: string | null
  isAdmin?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
  parentId: null,
  isAdmin: true,
})

const emit = defineEmits<{
  'update:modelValue': [items: MenuItem[]]
}>()

const menuContext = useWorkspaceMenuContext()

// Local copy that vuedraggable can mutate
const localItems = ref<MenuItem[]>([...props.modelValue])

// Track if we're syncing from props to prevent emit loop
const isSyncingFromProps = ref(false)

// Helper to compare arrays
function areItemsEqual(a: MenuItem[], b: MenuItem[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Sync from parent when props change (but not during drag)
watch(() => props.modelValue, (newItems) => {
  if (menuContext.state.value.isDragging) {
    return
  }
  
  // Skip if items are the same (prevents unnecessary updates)
  if (areItemsEqual(localItems.value, newItems)) {
    return
  }
  
  isSyncingFromProps.value = true
  localItems.value = [...newItems]
  nextTick(() => {
    isSyncingFromProps.value = false
  })
}, { deep: true })

// Emit changes when local items change (but not when syncing from props)
watch(localItems, (newItems) => {
  // Skip emit if we're just syncing from props
  if (isSyncingFromProps.value) {
    return
  }
  
  // Skip if items are the same as props (no real change)
  if (areItemsEqual(newItems, props.modelValue)) {
    return
  }
  
  emit('update:modelValue', [...newItems])
}, { deep: true })

// Handle drag start
function handleDragStart() {
  menuContext.state.value.isDragging = true
}

// Handle drag end
function handleDragEnd() {
  menuContext.state.value.isDragging = false
}

// Handle child folder items change (v-model from nested list)
function handleChildUpdate(folderId: string, newChildren: MenuItem[]) {
  const index = localItems.value.findIndex(item => item.id === folderId)
  if (index !== -1) {
    const item = localItems.value[index]
    localItems.value[index] = {
      ...item,
      children: newChildren,
    } as MenuItem
  }
}

// Check if folder is expanded
function isExpanded(itemId: string): boolean {
  return menuContext.state.value.expandedFolders.has(itemId)
}
</script>

<template>
  <draggable
    v-model="localItems"
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
    <template #item="{ element, index }">
      <div class="draggable-item">
        <!-- Menu Item -->
        <WorkspaceMenuItem
          :item="element"
          :is-admin="isAdmin"
        />

        <!-- Nested Children (if folder and expanded) -->
        <div
          v-if="element.type === 'folder' && isExpanded(element.id)"
          class="nested-children"
        >
          <WorkspaceMenuDraggableList
            :model-value="element.children || []"
            :level="level + 1"
            :parent-id="element.id"
            :is-admin="isAdmin"
            @update:model-value="(children) => handleChildUpdate(element.id, children)"
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
</style>
