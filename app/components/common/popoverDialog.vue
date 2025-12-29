<script setup lang="ts">
/**
 * Custom Popover Dialog Component
 * 
 * Exposes open(targetElement) and close() methods
 * - Desktop + valid target: Shows positioned popover
 * - Mobile OR no target: Shows dialog
 */
import { onClickOutside, useEventListener } from '@vueuse/core'

interface Props {
  title?: string
  width?: string | number
  placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end'
  offset?: number
  closeOnClickModal?: boolean
  showClose?: boolean
}

interface Emits {
  (e: 'open'): void
  (e: 'close'): void
  (e: 'opened'): void
  (e: 'closed'): void
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'bottom-start',
  offset: 8,
  width: '400px',
  closeOnClickModal: true,
  showClose: true,
})

const emit = defineEmits<Emits>()

// Use global breakpoint
const { isMobile } = useBreakpoint()

// State
const visible = ref(false)
const targetElement = ref<HTMLElement | null>(null)
const popoverRef = ref<HTMLElement>()
const contentRef = ref<HTMLElement>()

// Position state
const popoverStyle = ref({
  top: '0px',
  left: '0px',
  transformOrigin: 'top left',
})

// Measure phase (render at z-index: -1 to get dimensions)
const measuring = ref(false)

/**
 * Calculate popover position relative to target
 */
function calculatePosition(target: HTMLElement, content: HTMLElement) {
  const targetRect = target.getBoundingClientRect()
  const contentRect = content.getBoundingClientRect()
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  }

  let top = 0
  let left = 0
  let transformOrigin = 'top left'

  // Calculate based on placement
  const [side, align] = props.placement.split('-') as [string, string?]

  // Calculate main axis (top/bottom/left/right)
  switch (side) {
    case 'top':
      top = targetRect.top - contentRect.height - props.offset
      transformOrigin = 'bottom left'
      break
    case 'bottom':
      top = targetRect.bottom + props.offset
      transformOrigin = 'top left'
      break
    case 'left':
      left = targetRect.left - contentRect.width - props.offset
      transformOrigin = 'right top'
      break
    case 'right':
      left = targetRect.right + props.offset
      transformOrigin = 'left top'
      break
  }

  // Calculate cross axis alignment
  if (side === 'top' || side === 'bottom') {
    switch (align) {
      case 'start':
        left = targetRect.left
        break
      case 'end':
        left = targetRect.right - contentRect.width
        break
      default: // center
        left = targetRect.left + (targetRect.width - contentRect.width) / 2
    }
  } else if (side === 'left' || side === 'right') {
    switch (align) {
      case 'start':
        top = targetRect.top
        break
      case 'end':
        top = targetRect.bottom - contentRect.height
        break
      default: // center
        top = targetRect.top + (targetRect.height - contentRect.height) / 2
    }
  }

  // Keep within viewport bounds
  if (left < 0) left = props.offset
  if (left + contentRect.width > viewport.width) {
    left = viewport.width - contentRect.width - props.offset
  }
  if (top < 0) top = props.offset
  if (top + contentRect.height > viewport.height) {
    top = viewport.height - contentRect.height - props.offset
  }

  return {
    top: `${top}px`,
    left: `${left}px`,
    transformOrigin,
  }
}

/**
 * Open popover
 */
async function open(target?: HTMLElement) {
  targetElement.value = target || null
  // Mobile or no target → use dialog
  if (isMobile.value || !target) {
    visible.value = true
    emit('open')
    await nextTick()
    emit('opened')
    return
  }

  // Desktop with target → use positioned popover
  emit('open')
  
  // Phase 1: Measure (render hidden to get dimensions)
  measuring.value = true
  visible.value = true
  
  await nextTick()
  
  if (!contentRef.value) return
  
  // Calculate position
  popoverStyle.value = calculatePosition(target, contentRef.value)
  
  // Phase 2: Show with animation
  measuring.value = false
  
  await nextTick()
  emit('opened')
}

/**
 * Close popover
 */
async function close() {
  emit('close')
  visible.value = false
  targetElement.value = null
  
  await nextTick()
  emit('closed')
}

// Click outside to close
onClickOutside(popoverRef, () => {
  if (visible.value && !isMobile.value && targetElement.value) {
    close()
  }
})

// Close on escape
useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' && visible.value) {
    close()
  }
})

// Reposition on window resize/scroll
useEventListener(window, 'resize', () => {
  if (visible.value && !isMobile.value && targetElement.value && contentRef.value) {
    popoverStyle.value = calculatePosition(targetElement.value, contentRef.value)
  }
})

useEventListener(window, 'scroll', () => {
  if (visible.value && !isMobile.value && targetElement.value && contentRef.value) {
    popoverStyle.value = calculatePosition(targetElement.value, contentRef.value)
  }
}, { passive: true })

// Expose methods
defineExpose({
  open,
  close,
  visible: readonly(visible),
})
</script>

<template>
      
  <Teleport to="body">
    <!-- Desktop Popover -->
    <Transition name="popover-fade">
      <div
        v-if="visible && !isMobile && targetElement"
        ref="popoverRef"
        class="custom-popover"
        :class="{ measuring }"
        :style="{
          ...popoverStyle,
          width: typeof width === 'number' ? `${width}px` : width,
        }"
      >
        <div ref="contentRef" class="popover-content">
          <slot />
        </div>
      </div>
    </Transition>

    <!-- Mobile Dialog -->
  </Teleport>
    <el-dialog
      v-model="visible"
      v-if="isMobile || !targetElement"
      :title="title"
      :width="isMobile ? '90%' : width"
      :close-on-click-modal="closeOnClickModal"
      :show-close="showClose"
      @open="emit('open')"
      @close="emit('close')"
      @opened="emit('opened')"
      @closed="emit('closed')"
    >
      <slot />
    </el-dialog>
</template>

<style scoped lang="scss">
.custom-popover {
  position: fixed;
  z-index: 9999;
  background: var(--el-bg-color);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-border-radius-m);
  box-shadow: var(--app-shadow-l);
  
  &.measuring {
    z-index: -1;
    opacity: 0;
    pointer-events: none;
  }
}

.popover-content {
  padding: var(--app-space-m);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
}

// Animation
.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.popover-fade-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.popover-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
