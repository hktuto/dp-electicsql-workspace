# PopoverDialog - Advanced Features

## All Issues Fixed ✅

### 1. ✅ `append-to` Prop - Custom Popover Target

Control where the popover appends in the DOM.

```vue
<script setup>
const containerRef = ref()
</script>

<template>
  <div ref="containerRef" class="custom-container">
    <PopoverDialog 
      v-model="visible"
      :append-to="containerRef"
    >
      <!-- Popover will append to containerRef instead of body -->
    </PopoverDialog>
  </div>
</template>
```

**Why?**
- Fix z-index issues
- Contain popover in specific areas
- Better control over overflow/scrolling

**Options:**
```typescript
// Append to body (default)
append-to="body"

// Append to specific element (CSS selector)
append-to="#app"

// Append to element ref
:append-to="myElementRef"
```

---

### 2. ✅ Hidden Trigger Button - Programmatic Control

No need for trigger slot! Just use v-model.

```vue
<script setup>
const showPopover = ref(false)

// Open from anywhere
function openFromMenu() {
  showPopover.value = true  // Automatically triggers click!
}
</script>

<template>
  <!-- Multiple buttons control same dialog -->
  <el-button @click="showPopover = true">Button 1</el-button>
  <el-button @click="showPopover = true">Button 2</el-button>
  <el-button @click="openFromMenu()">Button 3</el-button>
  
  <!-- No trigger slot needed! -->
  <PopoverDialog v-model="showPopover">
    <template #default="{ close }">
      <p>Content</p>
      <el-button @click="close()">Close</el-button>
    </template>
  </PopoverDialog>
</template>
```

**How it works:**
1. When `modelValue` changes to `true`
2. Component automatically clicks hidden trigger button
3. Popover opens smoothly
4. Works with external buttons, shortcuts, etc.

---

### 3. ✅ Fixed isMobile Undefined Error

Now `isMobile` is **always defined** in slot props.

```vue
<template>
  <PopoverDialog v-model="visible">
    <!-- ✅ isMobile is guaranteed to be defined -->
    <template #default="{ isMobile, close }">
      <div :class="{ mobile: isMobile }">
        Content adapts to screen size
      </div>
    </template>
  </PopoverDialog>
</template>
```

**What was fixed:**
- Uses reactive `isMobile` from `useBreakpoint()`
- Passes actual computed value instead of hardcoded `true/false`
- Updates automatically when screen resizes

---

## Complete API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `boolean` | `false` | Controls visibility (v-model) |
| `title` | `string` | - | Dialog title (mobile mode) |
| `width` | `string \| number` | `'500px'` | Default width |
| `dialogWidth` | `string \| number` | - | Override for dialog |
| `popoverWidth` | `number` | `400` | Popover width (px) |
| `placement` | `PopoverPlacement` | `'bottom-end'` | Popover position |
| `appendTo` | `string \| HTMLElement` | `'body'` | **NEW** Where to append popover |
| `disabled` | `boolean` | `false` | Disable opening |
| `closeOnClickModal` | `boolean` | `false` | Close on backdrop click |
| `showClose` | `boolean` | `true` | Show close button |

### Slots

#### `trigger` (Optional)

Custom trigger button. If not provided, uses hidden button with v-model control.

**Slot Props:**
- `isMobile`: Current screen size mode
- `visible`: Current visibility state

```vue
<template #trigger="{ isMobile, visible }">
  <el-button>{{ visible ? 'Close' : 'Open' }}</el-button>
</template>
```

#### `default` (Required)

Content shown in popover/dialog.

**Slot Props:**
- `isMobile`: Current screen size mode (reactive, updates on resize)
- `close`: Function to close dialog

```vue
<template #default="{ isMobile, close }">
  <div :class="{ mobile: isMobile }">
    <el-button @click="close()">Close</el-button>
  </div>
</template>
```

### Events

| Event | Description |
|-------|-------------|
| `update:modelValue` | Emitted when visibility changes |
| `open` | Starting to open |
| `close` | Starting to close |
| `opened` | Fully opened |
| `closed` | Fully closed |

---

## Advanced Examples

### 1. Custom Append Target

```vue
<script setup>
const containerRef = ref()
const showDialog = ref(false)
</script>

<template>
  <div ref="containerRef" class="modal-container">
    <!-- Header with trigger -->
    <el-button @click="showDialog = true">Open</el-button>
    
    <!-- Popover appends to containerRef -->
    <PopoverDialog 
      v-model="showDialog"
      :append-to="containerRef"
      :popover-width="300"
    >
      <template #default="{ close }">
        <div class="quick-actions">
          <el-button @click="close()">Action 1</el-button>
          <el-button @click="close()">Action 2</el-button>
        </div>
      </template>
    </PopoverDialog>
  </div>
</template>

<style>
.modal-container {
  position: relative;
  z-index: 1000;
  overflow: hidden; /* Popover stays within container */
}
</style>
```

### 2. Multiple Triggers (No Trigger Slot)

```vue
<script setup>
const showCreate = ref(false)

// Open from keyboard shortcut
useEventListener(document, 'keydown', (e) => {
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault()
    showCreate.value = true
  }
})

// Open from route
watch(() => route.query.create, (val) => {
  if (val === 'true') showCreate.value = true
})
</script>

<template>
  <div class="toolbar">
    <!-- Toolbar button -->
    <el-button @click="showCreate = true">
      <Icon name="material-symbols:add" /> New
    </el-button>
    
    <!-- FAB (mobile) -->
    <el-button class="fab" circle @click="showCreate = true">
      <Icon name="material-symbols:add" />
    </el-button>
    
    <!-- Context menu -->
    <el-dropdown>
      <el-button>Actions</el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item @click="showCreate = true">
            Create New
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>

  <!-- Single dialog for all triggers -->
  <PopoverDialog v-model="showCreate" title="Create Item">
    <template #default="{ isMobile, close }">
      <el-form>
        <el-form-item label="Name">
          <el-input />
        </el-form-item>
      </el-form>
      <div class="actions">
        <el-button @click="close()">Cancel</el-button>
        <el-button type="primary">Create</el-button>
      </div>
    </template>
  </PopoverDialog>
  
  <!-- Hint: Press Ctrl+N to create -->
</template>
```

### 3. Nested Dialogs with Append-To

```vue
<script setup>
const showMain = ref(false)
const showNested = ref(false)
const mainDialogRef = ref()
</script>

<template>
  <!-- Main dialog -->
  <PopoverDialog v-model="showMain">
    <template #trigger>
      <el-button>Open Main</el-button>
    </template>
    
    <template #default>
      <div ref="mainDialogRef">
        <p>Main dialog content</p>
        <el-button @click="showNested = true">
          Open Nested Dialog
        </el-button>
      </div>
    </template>
  </PopoverDialog>

  <!-- Nested dialog appends to main dialog -->
  <PopoverDialog 
    v-model="showNested"
    :append-to="mainDialogRef"
  >
    <template #default="{ close }">
      <p>Nested dialog</p>
      <el-button @click="close()">Close</el-button>
    </template>
  </PopoverDialog>
</template>
```

### 4. Responsive Content with isMobile

```vue
<template>
  <PopoverDialog v-model="visible">
    <template #trigger>
      <el-button>Settings</el-button>
    </template>
    
    <template #default="{ isMobile, close }">
      <div class="settings" :class="{ mobile: isMobile }">
        <!-- Desktop: Tabs -->
        <el-tabs v-if="!isMobile" type="border-card">
          <el-tab-pane label="General">
            <GeneralSettings />
          </el-tab-pane>
          <el-tab-pane label="Advanced">
            <AdvancedSettings />
          </el-tab-pane>
        </el-tabs>
        
        <!-- Mobile: Accordion -->
        <el-collapse v-else>
          <el-collapse-item title="General">
            <GeneralSettings />
          </el-collapse-item>
          <el-collapse-item title="Advanced">
            <AdvancedSettings />
          </el-collapse-item>
        </el-collapse>
        
        <div class="footer">
          <el-button @click="close()">Cancel</el-button>
          <el-button 
            type="primary" 
            :size="isMobile ? 'large' : 'default'"
          >
            Save
          </el-button>
        </div>
      </div>
    </template>
  </PopoverDialog>
</template>

<style>
.settings {
  padding: 1rem;
  
  &.mobile {
    padding: 0;
  }
}
</style>
```

### 5. Auto-Open on Component Mount

```vue
<script setup>
const showWelcome = ref(false)

onMounted(() => {
  // Check if first visit
  const isFirstVisit = !localStorage.getItem('visited')
  if (isFirstVisit) {
    showWelcome.value = true  // Auto-opens!
    localStorage.setItem('visited', 'true')
  }
})
</script>

<template>
  <PopoverDialog v-model="showWelcome" title="Welcome!">
    <template #default="{ close }">
      <p>Welcome to our app!</p>
      <el-button type="primary" @click="close()">
        Get Started
      </el-button>
    </template>
  </PopoverDialog>
</template>
```

---

## Best Practices

### 1. Use v-model for Multiple Triggers

```vue
<!-- ✅ GOOD: v-model control -->
<el-button @click="show = true">Open</el-button>
<el-button @click="show = true">Also Open</el-button>
<PopoverDialog v-model="show">...</PopoverDialog>

<!-- ❌ BAD: Single trigger slot -->
<PopoverDialog>
  <template #trigger>
    <el-button>Only this can open</el-button>
  </template>
</PopoverDialog>
```

### 2. Use append-to for Z-Index Issues

```vue
<!-- ✅ GOOD: Append to specific container -->
<div ref="container" style="z-index: 1000">
  <PopoverDialog :append-to="container">...</PopoverDialog>
</div>

<!-- ❌ BAD: Fighting with parent z-index -->
<div style="z-index: 9999">
  <PopoverDialog>...</PopoverDialog>
</div>
```

### 3. Always Provide close Function

```vue
<!-- ✅ GOOD: User can close -->
<PopoverDialog v-model="show">
  <template #default="{ close }">
    <el-button @click="close()">Cancel</el-button>
  </template>
</PopoverDialog>

<!-- ❌ BAD: No way to close from inside -->
<PopoverDialog v-model="show">
  <template #default>
    <p>Stuck forever!</p>
  </template>
</PopoverDialog>
```

### 4. Adapt UI Based on isMobile

```vue
<!-- ✅ GOOD: Responsive -->
<template #default="{ isMobile, close }">
  <el-input :size="isMobile ? 'large' : 'small'" />
  <el-button :size="isMobile ? 'large' : 'default'">Submit</el-button>
</template>

<!-- ❌ BAD: Fixed size -->
<template #default>
  <el-input size="small" /> <!-- Too small on mobile -->
</template>
```

---

## Migration from Old API

### Before

```vue
<script setup>
const isMobile = ref(false)
const show = ref(false)

onMounted(() => {
  const check = () => isMobile.value = window.innerWidth < 768
  check()
  window.addEventListener('resize', check)
})

// Only one button can trigger
</script>

<template>
  <el-popover v-if="!isMobile" v-model:visible="show">
    <template #reference>
      <el-button>Open</el-button>
    </template>
    <div>Content</div>
  </el-popover>
  
  <template v-else>
    <el-button @click="show = true">Open</el-button>
    <el-dialog v-model="show">
      <div>Content</div>
    </el-dialog>
  </template>
</template>
```

### After

```vue
<script setup>
const show = ref(false)
// That's it! No manual mobile detection needed
</script>

<template>
  <!-- Multiple buttons can trigger -->
  <el-button @click="show = true">Button 1</el-button>
  <el-button @click="show = true">Button 2</el-button>
  
  <!-- Single component handles both modes -->
  <PopoverDialog v-model="show">
    <template #default="{ isMobile, close }">
      <div>Content adapts automatically</div>
      <el-button @click="close()">Close</el-button>
    </template>
  </PopoverDialog>
</template>
```

---

## Troubleshooting

### Popover appears in wrong position
```vue
<!-- Use append-to to control placement -->
<PopoverDialog :append-to="containerRef">
```

### Z-index conflicts
```vue
<!-- Append to element with higher z-index -->
<div ref="highZIndex" style="z-index: 2000">
  <PopoverDialog :append-to="highZIndex">
```

### isMobile not updating
- It should update automatically via `useBreakpoint()`
- Check browser console for errors
- Verify VueUse is installed

### Multiple buttons not working
- Ensure you're using `v-model`, not trigger slot
- Check that `modelValue` is being set to `true`

---

## Summary

✅ **append-to prop** - Control popover placement  
✅ **Hidden trigger** - v-model control without trigger slot  
✅ **Fixed isMobile** - Always defined, reactive to resize  
✅ **Multiple triggers** - Any button can open dialog  
✅ **Global breakpoints** - Shared state via useBreakpoint  

The PopoverDialog component is now production-ready! 🎉

