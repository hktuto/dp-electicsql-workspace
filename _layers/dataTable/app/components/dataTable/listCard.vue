<template>
  <div class="table-card" @click="$emit('click')">
    <div class="card-icon">
      <Icon :name="table.icon || 'mdi:table'" :size="32" />
    </div>
    
    <div class="card-content">
      <h3 class="table-name">{{ table.name }}</h3>
      <p v-if="table.description" class="table-description">
        {{ table.description }}
      </p>
      <div class="table-meta">
        <span class="meta-item">
          <Icon name="mdi:table-column" :size="14" />
          {{ columnCount }} columns
        </span>
        <span class="meta-item">
          <Icon name="mdi:clock-outline" :size="14" />
          {{ formatDate(table.updatedAt) }}
        </span>
      </div>
    </div>

    <div class="card-actions" @click.stop>
      <ElDropdown trigger="click">
        <ElButton :icon="MoreFilled" circle text />
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem @click="$emit('edit')">
              <Icon name="mdi:pencil" /> Edit
            </ElDropdownItem>
            <ElDropdownItem @click="$emit('settings')">
              <Icon name="mdi:cog" /> Settings
            </ElDropdownItem>
            <ElDropdownItem divided @click="$emit('delete')">
              <Icon name="mdi:delete" /> Delete
            </ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MoreFilled } from '@element-plus/icons-vue'
import type { DataTable } from '#shared/types/db'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const props = defineProps<{
  table: DataTable
  columnCount?: number
}>()

defineEmits<{
  click: []
  edit: []
  settings: []
  delete: []
}>()

function formatDate(date: Date | string): string {
  return dayjs(date).fromNow()
}
</script>

<style scoped lang="scss">
.table-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  padding: var(--app-space-m);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);

    .card-actions {
      opacity: 1;
    }
  }
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-radius: var(--el-border-radius-base);
  margin-bottom: var(--app-space-m);
}

.card-content {
  .table-name {
    margin: 0 0 var(--app-space-xs) 0;
    font-size: 16px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .table-description {
    margin: 0 0 var(--app-space-s) 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
  }

  .table-meta {
    display: flex;
    gap: var(--app-space-m);
    font-size: 12px;
    color: var(--el-text-color-placeholder);

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

.card-actions {
  position: absolute;
  top: var(--app-space-s);
  right: var(--app-space-s);
  opacity: 0;
  transition: opacity 0.2s;
}
</style>


