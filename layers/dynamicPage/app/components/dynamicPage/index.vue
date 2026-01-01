<script setup lang="ts">
import { useDynamicRenderProvider } from '#layers/dynamicPage/app/composables/useDynamicRender';
import type { ComponentNode } from '#shared/dynamicComponent/dynamic-page';

const props = defineProps<{
  component: ComponentNode
}>()

const { toggleEditMode, displayMode } = useDynamicRenderProvider(props.component)
useDynamicRouter()

const componentState = useComponentState()

// Icon based on current mode
const modeIcon = computed(() => {
  return displayMode.value === 'edit' ? '👁️' : '✏️'
})

const modeLabel = computed(() => {
  return displayMode.value === 'edit' ? 'View Mode' : 'Edit Mode'
})

const modeColor = computed(() => {
  return displayMode.value === 'edit' ? '#67c23a' : '#409eff'
})
</script>

<template>
  <div class="dynamic-page-wrapper">
    <!-- Main content -->
    <DynamicPageComponentRenderer :component="componentState"/>
    
    <!-- Floating mode toggle button -->
    <button 
      class="mode-toggle-button" 
      :class="{ 'edit-mode': displayMode === 'edit' }"
      :style="{ '--mode-color': modeColor }"
      @click="toggleEditMode"
      :title="`Switch to ${modeLabel}`"
    >
      <span class="mode-icon">{{ modeIcon }}</span>
      <span class="mode-label">{{ displayMode.toUpperCase() }}</span>
    </button>
  </div>
</template>

<style scoped>
.dynamic-page-wrapper {
  position: relative;
  min-height: 100vh;
}

.mode-toggle-button {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 9999;
  
  display: flex;
  align-items: center;
  gap: 8px;
  
  padding: 12px 20px;
  border: none;
  border-radius: 28px;
  
  background: var(--mode-color);
  color: white;
  
  font-size: 14px;
  font-weight: 600;
  
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  user-select: none;
}

.mode-toggle-button:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.mode-toggle-button:active {
  transform: translateY(0) scale(0.98);
}

.mode-icon {
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mode-label {
  letter-spacing: 0.5px;
  line-height: 1;
}

/* Edit mode styling */
.mode-toggle-button.edit-mode {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .mode-toggle-button {
    bottom: 20px;
    right: 20px;
    padding: 10px 16px;
    font-size: 12px;
  }
  
  .mode-icon {
    font-size: 16px;
  }
  
  .mode-label {
    display: none; /* Hide label on mobile, show only icon */
  }
}

/* Add a subtle indicator ring when in edit mode */
.mode-toggle-button.edit-mode::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 32px;
  border: 2px solid var(--mode-color);
  opacity: 0.3;
  animation: ring-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes ring-pulse {
  0% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.1);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0.3;
  }
}
</style>