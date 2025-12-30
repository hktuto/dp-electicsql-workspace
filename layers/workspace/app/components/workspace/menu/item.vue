<script setup lang="ts">
import type { MenuItem } from '#shared/types/db'
import { useWorkspaceMenuContext } from '#layers/workspace/app/composables/useWorkspaceMenuContext'

interface Props {
  item: MenuItem
  isAdmin: boolean
}

const props = defineProps<Props>()

const menuContext = useWorkspaceMenuContext()
const actionsPopover = ref()
const isHovered = ref(false)

// Check if this item is being edited
const isEditing = computed(() => menuContext.state.value.editingItemId === props.item.id)

// Check if this folder is expanded
const isExpanded = computed(() => {
  if (props.item.type !== 'folder') return false
  return menuContext.state.value.expandedFolders.has(props.item.id)
})

// Get icon based on type
const itemIcon = computed(() => {
  switch (props.item.type) {
    case 'folder':
      return isExpanded.value 
        ? 'material-symbols:folder-open-outline' 
        : 'material-symbols:folder-outline'
    case 'table':
      return 'material-symbols:table-outline'
    case 'view':
      return 'material-symbols:view-list-outline'
    case 'dashboard':
      return 'material-symbols:dashboard-outline'
    default:
      return 'material-symbols:description-outline'
  }
})

// Toggle folder expand/collapse
function handleToggle() {
  if (props.item.type === 'folder') {
    menuContext.toggleFolder(props.item.id)
  }
}

// Handle double click on label to edit (admin only)
function handleLabelDoubleClick() {
  if (props.isAdmin && !isEditing.value) {
    menuContext.startEdit(props.item.id)
  }
}

// Handle item click - navigate to the item
function handleItemClick() {
  menuContext.navigateToItem(props.item)
}

// Handle actions menu
function handleActionsClick(event: MouseEvent) {
  event.stopPropagation()
  actionsPopover.value?.open(event.currentTarget)
}

// Handle save from label editor
async function handleSaveEdit(newLabel: string) {
  await menuContext.saveEdit(props.item.id, newLabel)
}

// Handle cancel from label editor
function handleCancelEdit() {
  menuContext.cancelEdit()
}
</script>

<template>
  <div
    class="menu-item"
    :class="{ 'is-folder': item.type === 'folder', 'is-expanded': isExpanded }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="item-content" @click="handleItemClick">
      <!-- Drag Handle (admin only, shown on hover) -->
      <div
        v-if="isAdmin"
        class="drag-handle"
        :class="{ visible: isHovered }"
        @mousedown.stop
        @click.stop
      >
        <Icon name="material-symbols:drag-indicator" size="16" />
      </div>



      <!-- Item Icon -->
      <div class="item-icon">
        <Icon :name="itemIcon" size="18" />
      </div>

      <!-- Label or Label Editor -->
      <div class="item-label" @dblclick.stop="handleLabelDoubleClick">
        <WorkspaceMenuLabelEditor
          v-if="isEditing"
          :model-value="item.label"
          @save="handleSaveEdit"
          @cancel="handleCancelEdit"
        />
        <span v-else class="label-text">{{ item.label }}</span>
      </div>

      <!-- Actions Menu (shown on hover) -->
      <div v-if="isAdmin" class="item-actions" :class="{ visible: isHovered }">
        <el-button
          text
          circle
          size="small"
          @click="handleActionsClick"
        >
          <Icon name="material-symbols:more-horiz" size="16" />
        </el-button>
      </div>
            <!-- Expand/Collapse Icon (folders only) -->
            <div
        v-if="item.type === 'folder'"
        class="expand-icon"
        @click.stop="handleToggle"
      >
        <Icon
          :name="isExpanded ? 'material-symbols:expand-more' : 'material-symbols:chevron-right'"
          size="18"
        />
      </div>
    </div>

    <!-- Actions Popover -->
    <WorkspaceMenuItemActions
      ref="actionsPopover"
      :item="item"
      :is-admin="isAdmin"
    />
  </div>
</template>

<style scoped lang="scss">
.menu-item {
  position: relative;
  user-select: none;
}

.item-content {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--app-border-radius-s);
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: var(--el-fill-color-light);
  }
}

.drag-handle {
  position: absolute;
  left:-4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--app-text-color-secondary);
  cursor: grab;
  opacity: 0;
  transition: opacity 0.2s ease;

  &.visible {
    opacity: 1;
  }

  &:active {
    cursor: grabbing;
  }
}

.expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--app-text-color-secondary);
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    color: var(--app-text-color-primary);
  }
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--app-text-color-secondary);
  flex-shrink: 0;
}

.item-label {
  flex: 1;
  min-width: 0;
  font-size: var(--app-font-size-s);
}

.label-text {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-actions {
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;

  &.visible {
    opacity: 1;
  }
}

// Folder-specific styles
.menu-item.is-folder {
  .item-icon {
    color: var(--el-color-warning);
  }
}
</style>

