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

// Arrow position state
const arrowStyle = ref({
  top: '0px',
  left: '0px',
  side: 'bottom' as 'top' | 'bottom' | 'left' | 'right',
})

/**
 * Calculate available space in all directions
 */
function calculateAvailableSpace(targetRect: DOMRect) {
  return {
    top: targetRect.top,
    bottom: window.innerHeight - targetRect.bottom,
    left: targetRect.left,
    right: window.innerWidth - targetRect.right,
  }
}

/**
 * Find best placement direction based on available space
 */
function findBestPlacement(
  targetRect: DOMRect,
  contentRect: DOMRect,
  preferredPlacement: string
): { side: string; align: string } {
  const space = calculateAvailableSpace(targetRect)
  const minSpace = props.offset + 20 // Minimum required space

  // Parse preferred placement
  const parts = preferredPlacement.split('-')
  const preferredSide = parts[0] || 'bottom'
  const preferredAlign = parts[1] || 'center'

  // Check if preferred placement has enough space
  const needsHeight = contentRect.height + props.offset
  const needsWidth = contentRect.width + props.offset

  const hasSpace = {
    top: space.top >= needsHeight,
    bottom: space.bottom >= needsHeight,
    left: space.left >= needsWidth,
    right: space.right >= needsWidth,
  }

  // Try preferred side first
  if (hasSpace[preferredSide as keyof typeof hasSpace]) {
    return { side: preferredSide, align: preferredAlign }
  }

  // Find best alternative based on available space
  const sortedSpaces = [
    { side: 'bottom', space: space.bottom, hasSpace: hasSpace.bottom },
    { side: 'top', space: space.top, hasSpace: hasSpace.top },
    { side: 'right', space: space.right, hasSpace: hasSpace.right },
    { side: 'left', space: space.left, hasSpace: hasSpace.left },
  ].sort((a, b) => b.space - a.space)

  // Return first side with enough space, or fallback to largest space
  const bestSide = sortedSpaces.find(s => s.hasSpace)?.side || sortedSpaces[0]!.side

  return { side: bestSide, align: preferredAlign || 'center' }
}

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

  // Find best placement
  const { side, align } = findBestPlacement(targetRect, contentRect, props.placement)

  let top = 0
  let left = 0
  let transformOrigin = 'top left'

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

  // Keep within viewport bounds (but don't overlap target)
  const padding = props.offset
  
  if (side === 'top' || side === 'bottom') {
    // Horizontal adjustment
    if (left < padding) {
      left = padding
    }
    if (left + contentRect.width > viewport.width - padding) {
      left = viewport.width - contentRect.width - padding
    }
  } else {
    // Vertical adjustment
    if (top < padding) {
      top = padding
    }
    if (top + contentRect.height > viewport.height - padding) {
      top = viewport.height - contentRect.height - padding
    }
  }

  // Calculate arrow position
  const arrowSize = 8 // Arrow size in pixels
  let arrowTop = '0px'
  let arrowLeft = '0px'

  if (side === 'top' || side === 'bottom') {
    // Arrow positioned horizontally (center of target)
    const targetCenter = targetRect.left + targetRect.width / 2
    const popoverLeft = left
    arrowLeft = `${Math.max(arrowSize, Math.min(contentRect.width - arrowSize * 2, targetCenter - popoverLeft - arrowSize))}px`
    
    if (side === 'bottom') {
      arrowTop = `-${arrowSize}px` // Arrow at top of popover, pointing up
    } else {
      arrowTop = `${contentRect.height}px` // Arrow at bottom of popover, pointing down
    }
  } else {
    // Arrow positioned vertically (center of target)
    const targetCenter = targetRect.top + targetRect.height / 2
    const popoverTop = top
    arrowTop = `${Math.max(arrowSize, Math.min(contentRect.height - arrowSize * 2, targetCenter - popoverTop - arrowSize))}px`
    
    if (side === 'right') {
      arrowLeft = `-${arrowSize}px` // Arrow at left of popover, pointing left
    } else {
      arrowLeft = `${contentRect.width}px` // Arrow at right of popover, pointing right
    }
  }

  return {
    top: `${top}px`,
    left: `${left}px`,
    transformOrigin,
    arrowTop,
    arrowLeft,
    arrowSide: side as 'top' | 'bottom' | 'left' | 'right',
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
  // set target to add outline
  target.classList.add('focus-outline')
  // Desktop with target → use positioned popover
  emit('open')
  visible.value = true
  
  await nextTick()
  
  if (!contentRef.value) return
  
  // Calculate position
  const position = calculatePosition(target, contentRef.value)
  popoverStyle.value = {
    top: position.top,
    left: position.left,
    transformOrigin: position.transformOrigin,
  }
  arrowStyle.value = {
    top: position.arrowTop,
    left: position.arrowLeft,
    side: position.arrowSide,
  }
  
  emit('opened')
}

/**
 * Close popover
 */
async function close() {
  if (!visible.value) return
  
  emit('close')
  visible.value = false
  targetElement.value?.classList.remove('focus-outline')
  targetElement.value = null
  
  await nextTick()
  emit('closed')
}

// Click outside to close (but not if clicking inside a nested popover)
onClickOutside(popoverRef, (event) => {
  if (visible.value && !isMobile.value && targetElement.value) {
    // Check if click is inside another popover (nested popover case)
    // All popovers are teleported to body, so nested ones are siblings in the DOM
    const clickedElement = event.target as HTMLElement
    const isInsideAnyPopover = clickedElement.closest('.custom-popover')
    
    // Only close if NOT clicking inside any popover
    // (if clicking in nested popover, don't close parent)
    if (!isInsideAnyPopover) {
      close()
    }
  }
})

// Close on escape (but not if user is typing in an input)
useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' && visible.value) {
    const activeElement = document.activeElement as HTMLElement
    const isEditable = 
      activeElement?.tagName === 'INPUT' ||
      activeElement?.tagName === 'TEXTAREA' ||
      activeElement?.isContentEditable ||
      activeElement?.getAttribute('contenteditable') === 'true'
    
    // Only close if not editing
    if (!isEditable) {
      close()
    }
  }
})

// Reposition on window resize/scroll
useEventListener(window, 'resize', () => {
  if (visible.value && !isMobile.value && targetElement.value && contentRef.value) {
    const position = calculatePosition(targetElement.value, contentRef.value)
    popoverStyle.value = {
      top: position.top,
      left: position.left,
      transformOrigin: position.transformOrigin,
    }
    arrowStyle.value = {
      top: position.arrowTop,
      left: position.arrowLeft,
      side: position.arrowSide,
    }
  }
})

useEventListener(window, 'scroll', () => {
  if (visible.value && !isMobile.value && targetElement.value && contentRef.value) {
    const position = calculatePosition(targetElement.value, contentRef.value)
    popoverStyle.value = {
      top: position.top,
      left: position.left,
      transformOrigin: position.transformOrigin,
    }
    arrowStyle.value = {
      top: position.arrowTop,
      left: position.arrowLeft,
      side: position.arrowSide,
    }
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
    <div
      v-if="visible && !isMobile && targetElement"
      ref="popoverRef"
      class="custom-popover"
      :style="{
        ...popoverStyle,
        width: typeof width === 'number' ? `${width}px` : width,
      }"
    >
      <!-- Arrow pointing to target -->
      <div 
        class="popover-arrow"
        :class="`arrow-${arrowStyle.side}`"
        :style="{
          top: arrowStyle.top,
          left: arrowStyle.left,
        }"
      />
      
      <div ref="contentRef" class="popover-content">
        <slot />
      </div>
    </div>

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
}

.popover-content {
  padding: var(--app-space-xs);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
}

// Arrow
.popover-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border: 8px solid transparent;
  
  // Arrow pointing up (popover below target)
  &.arrow-bottom {
    border-bottom-color: var(--el-bg-color);
    border-top-width: 0;
    
    &::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border: 9px solid transparent;
      border-bottom-color: var(--app-border-color);
      border-top-width: 0;
      top: -9px;
      left: -9px;
    }
  }
  
  // Arrow pointing down (popover above target)
  &.arrow-top {
    border-top-color: var(--el-bg-color);
    border-bottom-width: 0;
    
    &::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border: 9px solid transparent;
      border-top-color: var(--app-border-color);
      border-bottom-width: 0;
      bottom: -9px;
      left: -9px;
    }
  }
  
  // Arrow pointing right (popover to the left of target)
  &.arrow-left {
    border-left-color: var(--el-bg-color);
    border-right-width: 0;
    
    &::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border: 9px solid transparent;
      border-left-color: var(--app-border-color);
      border-right-width: 0;
      right: -9px;
      top: -9px;
    }
  }
  
  // Arrow pointing left (popover to the right of target)
  &.arrow-right {
    border-right-color: var(--el-bg-color);
    border-left-width: 0;
    
    &::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border: 9px solid transparent;
      border-right-color: var(--app-border-color);
      border-left-width: 0;
      left: -9px;
      top: -9px;
    }
  }
}
</style>
