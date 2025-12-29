<script setup lang="ts">
import type { Workspace } from '~/composables/useWorkspaceSync'

interface Props {
  workspace: Workspace
  dimmed?: boolean
}

interface Emits {
  (e: 'click'): void
  (e: 'settings'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

function handleCardClick() {
  emit('click')
}

function handleSettings() {
  emit('settings')
}
</script>

<template>
  <el-card 
    class="workspace-card"
    :class="{ 'workspace-card--dimmed': dimmed }"
    shadow="hover"
  >
    <div class="workspace-header">
      <div class="workspace-icon">
        <Icon v-if="workspace.icon" :name="workspace.icon" size="32" />
        <el-avatar v-else :size="48" shape="square">
          {{ workspace.name.charAt(0).toUpperCase() }}
        </el-avatar>
      </div>
      <el-dropdown trigger="click" @command="(cmd: string) => cmd === 'settings' ? handleSettings() : null">
        <el-button text circle>
          <Icon name="material-symbols:more-vert" />
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="settings">
              <Icon name="material-symbols:settings-outline" />
              Settings
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    
    <div class="workspace-info" @click="handleCardClick">
      <h3>{{ workspace.name }}</h3>
      <p v-if="workspace.description">{{ workspace.description }}</p>
      <div class="workspace-meta">
        <el-tag size="small">{{ workspace.menu?.length || 0 }} items</el-tag>
      </div>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
.workspace-card {
  transition: transform 0.2s ease, opacity 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }

  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    gap: var(--app-space-m);
  }
  
  &--dimmed {
    opacity: 0.4;
    pointer-events: none;
    
    :deep(.el-card) {
      background: var(--app-bg-secondary);
    }
  }
}

.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.workspace-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.workspace-info {
  flex: 1;
  cursor: pointer;

  h3 {
    margin: 0 0 var(--app-space-xs);
    font-size: var(--app-font-size-l);
    font-weight: 600;
  }

  p {
    margin: 0 0 var(--app-space-s);
    font-size: var(--app-font-size-s);
    color: var(--app-text-color-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.workspace-meta {
  display: flex;
  gap: var(--app-space-xs);
  align-items: center;
}
</style>

