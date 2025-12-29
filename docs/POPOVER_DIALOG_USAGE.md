# PopoverDialog - Advanced Usage

## Issue Fixes

### ✅ Fixed Issues

1. **Multiple Triggers** - Can now control via v-model from any button
2. **Global Breakpoints** - Uses VueUse with shared state
3. **Slot Props Error** - Fixed undefined isMobile issue

---

## 1. External Trigger Control (Multiple Buttons)

You can now control the dialog from any button using v-model, no need for trigger slot!

### Example: Multiple Buttons Opening Same Dialog

```vue
<script setup>
const showDialog = ref(false)

function openFromButton1() {
  showDialog.value = true
}

function openFromButton2() {
  showDialog.value = true
}
</script>

<template>
  <div class="toolbar">
    <!-- Button 1 -->
    <el-button @click="openFromButton1">
      Create from here
    </el-button>
    
    <!-- Button 2 -->
    <el-button @click="openFromButton2" type="primary">
      Or create from here
    </el-button>
    
    <!-- Button 3 in dropdown -->
    <el-dropdown>
      <el-button>Actions</el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item @click="showDialog = true">
            Create New
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>

  <!-- Dialog controlled by v-model (no trigger slot needed!) -->
  <PopoverDialog v-model="showDialog" title="Create Item">
    <template #default="{ close }">
      <p>Create form here</p>
      <el-button @click="close()">Cancel</el-button>
    </template>
  </PopoverDialog>
</template>
```

### Example: Programmatic Control

```vue
<script setup>
const showDialog = ref(false)

// Open after data loads
async function loadData() {
  await fetchData()
  showDialog.value = true // Auto-open after load
}

// Open from route
watch(() => route.query.action, (action) => {
  if (action === 'create') {
    showDialog.value = true
  }
})

// Close programmatically
function handleSuccess() {
  ElMessage.success('Created!')
  showDialog.value = false
}
</script>

<template>
  <PopoverDialog v-model="showDialog">
    <!-- content -->
  </PopoverDialog>
</template>
```

### Example: With Optional Trigger

You can still use a trigger if you want:

```vue
<template>
  <!-- Has trigger slot -->
  <PopoverDialog v-model="showDialog">
    <template #trigger>
      <el-button>Open with trigger</el-button>
    </template>
    <template #default>
      <p>Content</p>
    </template>
  </PopoverDialog>
  
  <!-- OR without trigger (controlled externally) -->
  <el-button @click="showDialog = true">External button</el-button>
  <PopoverDialog v-model="showDialog">
    <template #default>
      <p>Content</p>
    </template>
  </PopoverDialog>
</template>
```

---

## 2. Global Breakpoints Composable

### New Composable: `useBreakpoint()`

**Location**: `/app/composables/useBreakpoint.ts`

Uses VueUse with shared state across the entire app.

### Breakpoints

```typescript
const breakpoints = {
  xs: 0,      // Mobile portrait
  sm: 640,    // Mobile landscape
  md: 768,    // Tablet
  lg: 1024,   // Desktop
  xl: 1280,   // Large desktop
  '2xl': 1536, // Extra large
}
```

### Basic Usage

```vue
<script setup>
const { isMobile, isTablet, isDesktop } = useBreakpoint()
</script>

<template>
  <div>
    <p v-if="isMobile">Mobile view</p>
    <p v-else-if="isTablet">Tablet view</p>
    <p v-else>Desktop view</p>
  </div>
</template>
```

### All Available Properties

```typescript
const {
  // Convenience flags
  isMobile,           // < 768px
  isTablet,           // 768px - 1024px
  isDesktop,          // > 1024px
  isMobileOrTablet,   // < 1024px
  
  // Individual breakpoints
  xs,    // < 640px
  sm,    // 640px - 768px
  md,    // 768px - 1024px
  lg,    // 1024px - 1280px
  xl,    // 1280px - 1536px
  '2xl', // > 1536px
  
  // Helper functions
  greaterThan,  // greaterThan('md')
  smallerThan,  // smallerThan('lg')
  
  // Raw breakpoints object
  breakpoints,
} = useBreakpoint()
```

### Examples

#### Conditional Rendering

```vue
<script setup>
const { isMobile } = useBreakpoint()
</script>

<template>
  <!-- Mobile: Stack vertically -->
  <div v-if="isMobile" class="stack">
    <el-card>Card 1</el-card>
    <el-card>Card 2</el-card>
  </div>
  
  <!-- Desktop: Side by side -->
  <div v-else class="grid">
    <el-card>Card 1</el-card>
    <el-card>Card 2</el-card>
  </div>
</template>
```

#### Dynamic Classes

```vue
<script setup>
const { isMobile, isTablet } = useBreakpoint()
</script>

<template>
  <div 
    class="container"
    :class="{
      mobile: isMobile,
      tablet: isTablet,
      desktop: !isMobile && !isTablet
    }"
  >
    Content adapts based on class
  </div>
</template>
```

#### Computed Values

```vue
<script setup>
const { isMobile } = useBreakpoint()

const columns = computed(() => isMobile.value ? 1 : 3)
const buttonSize = computed(() => isMobile.value ? 'large' : 'default')
</script>

<template>
  <el-row :gutter="20">
    <el-col v-for="i in items" :span="24 / columns">
      <el-card>{{ i }}</el-card>
    </el-col>
  </el-row>
  
  <el-button :size="buttonSize">Responsive Button</el-button>
</template>
```

#### Watchers

```vue
<script setup>
const { isMobile } = useBreakpoint()

watch(isMobile, (mobile) => {
  if (mobile) {
    // Switched to mobile
    closeSidebar()
  } else {
    // Switched to desktop
    openSidebar()
  }
})
</script>
```

### Benefits of Global State

✅ **Single source of truth** - Same breakpoint values everywhere  
✅ **Shared across components** - No duplicate listeners  
✅ **SSR-safe** - Handles server-side rendering  
✅ **Performance** - One resize listener for entire app  
✅ **Consistent** - All components use same breakpoints  

---

## 3. Fixed Slot Props Issue

### Problem

```vue
<!-- This caused: Cannot destructure property 'isMobile' of 'undefined' -->
<PopoverDialog v-model="visible">
  <template #default="{ isMobile, close }">
    <!-- isMobile was undefined -->
  </template>
</PopoverDialog>
```

### Solution

Fixed how slot props are passed. Now properly provides:
- `isMobile`: boolean
- `close`: function

```vue
<PopoverDialog v-model="visible">
  <template #default="{ isMobile, close }">
    <!-- ✅ Now works! -->
    <div :class="{ mobile: isMobile }">
      <el-button @click="close()">Close</el-button>
    </div>
  </template>
</PopoverDialog>
```

---

## Complete Examples

### 1. Workspace Creation (Multiple Triggers)

```vue
<script setup>
const showCreate = ref(false)
const form = ref({ name: '', icon: '' })

function openFromHeader() {
  showCreate.value = true
}

function openFromFab() {
  showCreate.value = true
}
</script>

<template>
  <!-- Header button -->
  <div class="header">
    <el-button @click="openFromHeader">
      <Icon name="material-symbols:add" />
      New Workspace
    </el-button>
  </div>
  
  <!-- Floating action button (mobile) -->
  <el-button 
    v-if="isMobile" 
    class="fab"
    circle
    type="primary"
    @click="openFromFab"
  >
    <Icon name="material-symbols:add" />
  </el-button>
  
  <!-- Keyboard shortcut -->
  <div @keydown.ctrl.n="showCreate = true">
  
  <!-- Single dialog for all triggers -->
  <PopoverDialog 
    v-model="showCreate"
    title="Create Workspace"
  >
    <template #default="{ isMobile, close }">
      <el-form :model="form">
        <el-form-item label="Name">
          <el-input v-model="form.name" />
        </el-form-item>
      </el-form>
      <el-button @click="close()">Cancel</el-button>
      <el-button type="primary" @click="handleCreate">Create</el-button>
    </template>
  </PopoverDialog>
</template>
```

### 2. Context Menu Integration

```vue
<script setup>
const showEdit = ref(false)
</script>

<template>
  <el-table :data="items">
    <el-table-column label="Actions">
      <template #default="{ row }">
        <el-dropdown>
          <el-button text>•••</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="showEdit = true">
                Edit
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>
    </el-table-column>
  </el-table>
  
  <PopoverDialog v-model="showEdit" title="Edit Item">
    <!-- edit form -->
  </PopoverDialog>
</template>
```

### 3. Responsive Layout with Breakpoints

```vue
<script setup>
const { isMobile, isTablet, isDesktop } = useBreakpoint()
const showSettings = ref(false)
</script>

<template>
  <div class="app-layout">
    <!-- Mobile: Bottom nav -->
    <nav v-if="isMobile" class="bottom-nav">
      <el-button @click="showSettings = true">Settings</el-button>
    </nav>
    
    <!-- Tablet: Sidebar -->
    <aside v-else-if="isTablet" class="sidebar">
      <el-button @click="showSettings = true">Settings</el-button>
    </aside>
    
    <!-- Desktop: Top nav -->
    <header v-else class="top-nav">
      <el-button @click="showSettings = true">Settings</el-button>
    </header>
    
    <!-- Responsive dialog -->
    <PopoverDialog 
      v-model="showSettings"
      :popover-width="isDesktop ? 500 : 400"
    >
      <template #default="{ isMobile }">
        <el-form :label-position="isMobile ? 'top' : 'right'">
          <!-- form fields -->
        </el-form>
      </template>
    </PopoverDialog>
  </div>
</template>
```

---

## Migration Guide

### Before (Manual)

```vue
<script setup>
const isMobile = ref(false)
const showDialog = ref(false)

onMounted(() => {
  const check = () => isMobile.value = window.innerWidth < 768
  check()
  window.addEventListener('resize', check)
  onUnmounted(() => window.removeEventListener('resize', check))
})
</script>
```

### After (With useBreakpoint)

```vue
<script setup>
const { isMobile } = useBreakpoint()
const showDialog = ref(false)
// That's it! No manual listeners
</script>
```

---

## Summary of Improvements

✅ **1. Multiple Triggers**
- Control via v-model from anywhere
- No need for trigger slot
- Multiple buttons can open same dialog

✅ **2. Global Breakpoints**
- VueUse integration
- Shared state across app
- Single source of truth
- Better performance

✅ **3. Fixed Slot Props**
- isMobile now properly defined
- close() function works
- No more undefined errors

The component is now more flexible and robust! 🎉

