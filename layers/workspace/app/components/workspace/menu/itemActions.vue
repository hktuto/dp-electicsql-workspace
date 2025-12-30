<script setup lang="ts">
import type { MenuItem } from '#shared/types/db'
import { useWorkspaceMenuContext } from '#layers/workspace/app/composables/useWorkspaceMenuContext'

interface Props {
  item: MenuItem
  isAdmin: boolean
}

const props = defineProps<Props>()

const menuContext = useWorkspaceMenuContext()
const popoverRef = ref()

function open(target: HTMLElement) {
  popoverRef.value?.open(target)
}

function close() {
  popoverRef.value?.close()
}

async function handleEdit() {
  menuContext.startEdit(props.item.id)
  close()
}

async function handleDelete() {
  // Customize message based on item type
  let message = `Are you sure you want to delete "${props.item.label}"?`
  let confirmText = 'Delete'
  
  if (props.item.type === 'table') {
    message = `Are you sure you want to delete the table "${props.item.label}"?\n\nThis will permanently delete:\n• The physical database table\n• All columns\n• All data records\n\nThis action cannot be undone.`
    confirmText = 'Delete Table'
  } else if (props.item.type === 'folder' && props.item.children && props.item.children.length > 0) {
    message = `Are you sure you want to delete the folder "${props.item.label}" and all its contents?`
  }
  
  ElMessageBox.confirm(message, 'Delete Item', {
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
    type: 'warning',
    dangerouslyUseHTMLString: true,
  }).then(async () => {
    await menuContext.deleteItem(props.item.id)
    close()
  }).catch(() => {
    // User cancelled
  })
}

async function handleAddItem(type: MenuItem['type']) {
  await menuContext.addItem(props.item.id, type)
  close()
}

defineExpose({ open, close })
</script>

<template>
  <CommonPopoverDialog
    ref="popoverRef"
    placement="bottom-start"
    :width="180"
  >
    <div class="item-actions-menu">
      <!-- Edit -->
      <div v-if="isAdmin" class="action-item" @click="handleEdit">
        <Icon name="material-symbols:edit-outline" />
        <span>Rename</span>
      </div>

      <!-- Add submenu (only for folders) -->
      <template v-if="isAdmin && item.type === 'folder'">
        <div class="action-divider" />
        <div class="action-item" @click="handleAddItem('folder')">
          <Icon name="material-symbols:folder-outline" />
          <span>Add Folder</span>
        </div>
        <div class="action-item" @click="handleAddItem('table')">
          <Icon name="material-symbols:table-outline" />
          <span>Add Table</span>
        </div>
        <div class="action-item" @click="handleAddItem('view')">
          <Icon name="material-symbols:view-list-outline" />
          <span>Add View</span>
        </div>
        <div class="action-item" @click="handleAddItem('dashboard')">
          <Icon name="material-symbols:dashboard-outline" />
          <span>Add Dashboard</span>
        </div>
      </template>

      <!-- Delete -->
      <template v-if="isAdmin">
        <div class="action-divider" />
        <div class="action-item danger" @click="handleDelete">
          <Icon name="material-symbols:delete-outline" />
          <span>Delete</span>
        </div>
      </template>
    </div>
  </CommonPopoverDialog>
</template>

<style scoped lang="scss">
.item-actions-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  padding: var(--app-space-xs) ;
  border-radius: var(--app-border-radius-s);
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: var(--app-font-size-s);

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.danger {
    color: var(--el-color-danger);

    &:hover {
      background: var(--el-color-danger-light-9);
    }
  }
}

.action-divider {
  height: 1px;
  margin: 4px 0;
  background: var(--app-border-color);
}
</style>

