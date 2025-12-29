# Custom PopoverDialog Component

## Overview

A completely custom popover/dialog implementation that:
- ✅ Exposes `open(target)` and `close()` methods
- ✅ Positions relative to any HTMLElement
- ✅ Measures content before showing (z-index: -1 trick)
- ✅ Smooth animations with transform origin
- ✅ Auto-fallback to dialog on mobile
- ✅ Repositions on scroll/resize
- ✅ Closes on click outside or Escape
- ✅ No el-popover dependency!

---

## Why Custom Implementation?

**el-popover limitations:**
- ❌ Requires reference slot - can't trigger from multiple buttons
- ❌ Hard to control programmatically
- ❌ Limited positioning flexibility

**Our solution:**
- ✅ Programmatic control via `open(target)` method
- ✅ Any button can trigger the same popover
- ✅ Custom positioning algorithm
- ✅ Measure-then-show for perfect positioning
- ✅ Mobile-responsive fallback to dialog

---

## API

### Methods (Exposed via ref)

```typescript
interface PopoverDialogRef {
  open(target?: HTMLElement): Promise<void>
  close(): Promise<void>
  visible: Readonly<Ref<boolean>>
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Dialog title (mobile mode) |
| `width` | `string \| number` | `'400px'` | Popover/dialog width |
| `placement` | `Placement` | `'bottom-start'` | Popover position |
| `offset` | `number` | `8` | Distance from target (px) |
| `closeOnClickModal` | `boolean` | `true` | Close on backdrop click |
| `showClose` | `boolean` | `true` | Show close button |

**Placement options:**
- `top`, `top-start`, `top-end`
- `bottom`, `bottom-start`, `bottom-end`
- `left`, `left-start`, `left-end`
- `right`, `right-start`, `right-end`

### Slots

#### `default` (Required)

No slot props - use global `useBreakpoint()` for `isMobile` and exposed `close()` method.

```vue
<script setup>
const popoverRef = ref()
const breakpoint = useBreakpoint()
</script>

<template #default>
  <div :class="{ mobile: breakpoint.isMobile }">
    <p>Content</p>
    <el-button @click="popoverRef?.close()">Close</el-button>
  </div>
</template>
```

### Events

| Event | Description |
|-------|-------------|
| `@open` | Starting to open |
| `@close` | Starting to close |
| `@opened` | Fully opened (after animation) |
| `@closed` | Fully closed (after animation) |

---

## Usage

### Basic Example

```vue
<script setup>
const popoverRef = ref()
const buttonRef = ref()

function handleClick() {
  popoverRef.value?.open(buttonRef.value)
}
</script>

<template>
  <el-button ref="buttonRef" @click="handleClick">
    Open Popover
  </el-button>

  <PopoverDialog ref="popoverRef" title="My Popover">
    <p>Popover content</p>
    <el-button @click="popoverRef?.close()">Close</el-button>
  </PopoverDialog>
</template>
```

### Multiple Triggers

```vue
<script setup>
const popoverRef = ref()
const button1Ref = ref()
const button2Ref = ref()

function openFromButton1() {
  popoverRef.value?.open(button1Ref.value)
}

function openFromButton2() {
  popoverRef.value?.open(button2Ref.value)
}
</script>

<template>
  <!-- Multiple buttons -->
  <el-button ref="button1Ref" @click="openFromButton1">
    Open from here
  </el-button>
  
  <el-button ref="button2Ref" @click="openFromButton2">
    Or from here
  </el-button>
  
  <!-- Single popover (positions relative to clicked button) -->
  <PopoverDialog ref="popoverRef">
    <p>Content</p>
    <el-button @click="popoverRef?.close()">Close</el-button>
  </PopoverDialog>
</template>
```

### Workspace Creation Example

```vue
<script setup>
const popoverRef = ref()
const createButtonRef = ref()
const breakpoint = useBreakpoint()
const form = ref({ name: '', icon: '', description: '' })

function handleOpen() {
  // Get the button element (handle both element and component refs)
  const target = createButtonRef.value
  const el = target?.$el || target
  popoverRef.value?.open(el)
}

async function handleCreate() {
  await createWorkspace(form.value)
  popoverRef.value?.close()
  form.value = { name: '', icon: '', description: '' }
}
</script>

<template>
  <div class="toolbar">
    <el-button 
      ref="createButtonRef"
      type="primary"
      @click="handleOpen"
    >
      <Icon name="material-symbols:add" />
      New Workspace
    </el-button>
  </div>

  <PopoverDialog
    ref="popoverRef"
    title="Create Workspace"
    :width="420"
    placement="bottom-end"
  >
    <div class="form-content" :class="{ mobile: breakpoint.isMobile }">
      <h3 v-if="!breakpoint.isMobile">Create Workspace</h3>
      
      <el-form :model="form" label-position="top">
        <el-form-item label="Name" required>
          <el-input v-model="form.name" />
        </el-form-item>
        
        <el-form-item label="Icon">
          <IconPickerInput 
            v-model="form.icon"
            :size="breakpoint.isMobile ? 'default' : 'small'"
          />
        </el-form-item>
        
        <el-form-item label="Description">
          <el-input 
            v-model="form.description"
            type="textarea"
            :rows="breakpoint.isMobile ? 3 : 2"
          />
        </el-form-item>
      </el-form>
      
      <div class="actions">
        <el-button @click="popoverRef?.close()">Cancel</el-button>
        <el-button type="primary" @click="handleCreate">
          Create
        </el-button>
      </div>
    </div>
  </PopoverDialog>
</template>
```

---

## How It Works

### 1. **Open Method**

```typescript
async function open(target?: HTMLElement) {
  targetElement.value = target || null
  
  // Mobile or no target → use dialog
  if (isMobile.value || !target) {
    visible.value = true
    return
  }

  // Phase 1: Measure (render at z-index: -1)
  measuring.value = true
  visible.value = true
  
  await nextTick()
  
  // Calculate position
  popoverStyle.value = calculatePosition(target, contentRef.value)
  
  // Phase 2: Show with animation
  measuring.value = false
}
```

### 2. **Position Calculation**

```typescript
function calculatePosition(target: HTMLElement, content: HTMLElement) {
  const targetRect = target.getBoundingClientRect()
  const contentRect = content.getBoundingClientRect()
  
  // Calculate based on placement (top/bottom/left/right)
  // Apply offset
  // Keep within viewport bounds
  
  return {
    top: `${top}px`,
    left: `${left}px`,
    transformOrigin: 'top left', // For animation
  }
}
```

### 3. **Measuring Phase**

```scss
.custom-popover {
  position: fixed;
  z-index: 9999;
  
  &.measuring {
    z-index: -1;        // Hidden below everything
    opacity: 0;         // Invisible
    pointer-events: none; // No interaction
  }
}
```

**Why measure?**
- We need content dimensions to calculate position
- Rendering at z-index: -1 lets us measure without flash
- Then we show it at correct position with animation

### 4. **Animation**

```scss
.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.popover-fade-enter-from {
  opacity: 0;
  transform: scale(0.95); // Subtle scale
}
```

The `transform-origin` is calculated based on placement:
- `bottom-start` → `top left` (grows from top-left)
- `top-start` → `bottom left` (grows from bottom-left)
- etc.

---

## Features

### Auto-Reposition on Scroll/Resize

```typescript
useEventListener(window, 'resize', () => {
  if (visible && targetElement.value && contentRef.value) {
    popoverStyle.value = calculatePosition(
      targetElement.value,
      contentRef.value
    )
  }
})

useEventListener(window, 'scroll', () => {
  // Same as above
}, { passive: true })
```

### Click Outside to Close

```typescript
onClickOutside(popoverRef, () => {
  if (visible.value && !isMobile.value && targetElement.value) {
    close()
  }
})
```

### Escape Key to Close

```typescript
useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' && visible.value) {
    close()
  }
})
```

### Mobile Fallback

```typescript
if (isMobile.value || !target) {
  // Use el-dialog instead of positioned popover
  visible.value = true
  return
}
```

---

## Advanced Usage

### Context Menu

```vue
<script setup>
const popoverRef = ref()

function handleContextMenu(event: MouseEvent, item: any) {
  event.preventDefault()
  
  // Create temporary target element at mouse position
  const target = document.createElement('div')
  target.style.position = 'fixed'
  target.style.left = `${event.clientX}px`
  target.style.top = `${event.clientY}px`
  target.style.width = '0'
  target.style.height = '0'
  document.body.appendChild(target)
  
  popoverRef.value?.open(target)
  
  // Clean up when closed
  watch(() => popoverRef.value?.visible.value, (visible) => {
    if (!visible) {
      target.remove()
    }
  })
}
</script>

<template>
  <div @contextmenu="handleContextMenu($event, item)">
    Right-click me
  </div>

  <PopoverDialog ref="popoverRef">
    <div class="context-menu">
      <el-button text @click="popoverRef?.close()">Edit</el-button>
      <el-button text @click="popoverRef?.close()">Delete</el-button>
    </div>
  </PopoverDialog>
</template>
```

### Tooltip-like Popover

```vue
<script setup>
const popoverRef = ref()
const targetRef = ref()

function handleMouseEnter() {
  popoverRef.value?.open(targetRef.value)
}

function handleMouseLeave() {
  // Delay to allow moving to popover
  setTimeout(() => {
    if (!isHoveringPopover.value) {
      popoverRef.value?.close()
    }
  }, 100)
}
</script>

<template>
  <div 
    ref="targetRef"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    Hover me
  </div>

  <PopoverDialog ref="popoverRef" placement="top">
    <p>Tooltip content</p>
  </PopoverDialog>
</template>
```

---

## Positioning Algorithm

### Placement Examples

```
bottom-start:     top-start:        right-start:
┌────────┐        │ Content │       ┌────────┐  │ Content │
│ Button │        └─────────┘       │ Button │  └─────────┘
└────────┘        ┌────────┐        └────────┘
│ Content │       │ Button │
└─────────┘       └────────┘

bottom-end:       left-end:
    ┌────────┐    │ Content │  ┌────────┐
    │ Button │    └─────────┘  │ Button │
    └────────┘                 └────────┘
    │ Content │
    └─────────┘
```

### Viewport Collision Detection

```typescript
// Keep within viewport
if (left < 0) left = offset
if (left + width > viewport.width) {
  left = viewport.width - width - offset
}
if (top < 0) top = offset
if (top + height > viewport.height) {
  top = viewport.height - height - offset
}
```

---

## Comparison: el-popover vs Custom

| Feature | el-popover | Custom PopoverDialog |
|---------|-----------|---------------------|
| Multiple triggers | ❌ Needs slot | ✅ Any button |
| Programmatic control | ⚠️ Limited | ✅ Full control |
| Mobile fallback | ❌ Manual | ✅ Automatic |
| Position algorithm | ✅ Popper.js | ✅ Custom (simpler) |
| Animation | ✅ Built-in | ✅ Custom (smoother) |
| Click outside | ✅ Built-in | ✅ Custom |
| Escape key | ✅ Built-in | ✅ Custom |
| Scroll/resize | ✅ Built-in | ✅ Custom |
| File size | Larger | Smaller |
| Flexibility | Lower | Higher |

---

## Best Practices

### 1. Handle Component vs Element Refs

```typescript
// el-button returns component instance, not element
const target = buttonRef.value
const el = target?.$el || target  // Get actual element
popoverRef.value?.open(el)
```

### 2. Clean Up on Close

```typescript
async function handleSubmit() {
  await submitData()
  popoverRef.value?.close()  // Always close on success
  form.value = {}  // Reset form
}
```

### 3. Responsive Content

```vue
<script setup>
const breakpoint = useBreakpoint()
</script>

<template>
  <div :class="{ mobile: breakpoint.isMobile }">
    <el-input :size="breakpoint.isMobile ? 'large' : 'default'" />
  </div>
</template>
```

### 4. Handle Mobile/Desktop Differences

```vue
<script setup>
const breakpoint = useBreakpoint()
</script>

<template>
  <h3 v-if="!breakpoint.isMobile">Title</h3>
  <!-- Title shown in dialog header on mobile -->
</template>
```

---

## Summary

✅ **Custom implementation** - No el-popover dependency  
✅ **Flexible triggering** - Any button can open popover  
✅ **Smart positioning** - Measure-then-show algorithm  
✅ **Smooth animations** - Transform origin based on placement  
✅ **Mobile-responsive** - Auto-fallback to dialog  
✅ **Full control** - Exposed open/close methods  
✅ **Auto-repositioning** - Handles scroll/resize  
✅ **Accessibility** - Click outside, Escape key  
✅ **Clean API** - No slot props, use global breakpoint and exposed methods  

### Simplified API Design

**No slot props needed:**
- `isMobile` → Use global `useBreakpoint().isMobile`
- `close()` → Use exposed `popoverRef.value?.close()`

This keeps the component cleaner and promotes a consistent global state pattern across the application.

The custom PopoverDialog is production-ready! 🎉

