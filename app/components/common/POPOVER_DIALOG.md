# PopoverDialog Component

A responsive component that automatically switches between popover (desktop) and dialog (mobile) based on screen size.

## Component: `<PopoverDialog />`

**Location**: `/app/components/common/popoverDialog.vue`

---

## Features

✅ **Automatic mode switching** - Desktop (popover) ↔️ Mobile (dialog)  
✅ **Single content slot** - Write once, works in both modes  
✅ **v-model support** - Control visibility externally  
✅ **Customizable breakpoint** - Default 768px  
✅ **All Element Plus props** - Full API support  
✅ **Event forwarding** - open, close, opened, closed  
✅ **Slot props** - Access `isMobile` and `close()` in content  

---

## Usage

### Basic Example

```vue
<script setup>
const visible = ref(false)
</script>

<template>
  <PopoverDialog v-model="visible" title="My Form">
    <!-- Trigger button -->
    <template #trigger>
      <el-button type="primary">Open</el-button>
    </template>
    
    <!-- Content (same for both modes) -->
    <template #default="{ isMobile, close }">
      <div>
        <p>This content appears in popover on desktop</p>
        <p>and in dialog on mobile</p>
        <el-button @click="close()">Close</el-button>
      </div>
    </template>
  </PopoverDialog>
</template>
```

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `boolean` | `false` | Controls visibility (v-model) |
| `title` | `string` | - | Dialog title (mobile mode) |
| `width` | `string \| number` | `'500px'` | Default width for dialog |
| `dialogWidth` | `string \| number` | - | Override width for dialog mode specifically |
| `popoverWidth` | `number` | `400` | Width for popover mode (in pixels) |
| `placement` | `PopoverPlacement` | `'bottom-end'` | Popover placement |
| `disabled` | `boolean` | `false` | Disable trigger |
| `closeOnClickModal` | `boolean` | `false` | Close on modal click (dialog) |
| `showClose` | `boolean` | `true` | Show close button (dialog) |
| `mobileBreakpoint` | `number` | `768` | Breakpoint for mobile mode (px) |

### Placement Options

- `top`, `top-start`, `top-end`
- `bottom`, `bottom-start`, `bottom-end`
- `left`, `left-start`, `left-end`
- `right`, `right-start`, `right-end`

---

## Slots

### `trigger` Slot

The button/element that triggers the popover/dialog.

**Slot Props:**
- `isMobile`: `boolean` - Is mobile mode active
- `visible`: `boolean` - Current visibility state

```vue
<template #trigger="{ isMobile, visible }">
  <el-button :type="visible ? 'primary' : 'default'">
    {{ isMobile ? 'Open Dialog' : 'Open Popover' }}
  </el-button>
</template>
```

### `default` Slot

The content shown in popover/dialog.

**Slot Props:**
- `isMobile`: `boolean` - Is mobile mode active
- `close`: `() => void` - Function to close the popover/dialog

```vue
<template #default="{ isMobile, close }">
  <div>
    <p>Mode: {{ isMobile ? 'Mobile' : 'Desktop' }}</p>
    <el-button @click="close()">Close</el-button>
  </div>
</template>
```

---

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `boolean` | Emitted when visibility changes |
| `open` | - | Emitted when starting to open |
| `close` | - | Emitted when starting to close |
| `opened` | - | Emitted after opened (animation complete) |
| `closed` | - | Emitted after closed (animation complete) |

---

## Examples

### 1. Create Form

```vue
<script setup>
const showForm = ref(false)
const formData = ref({ name: '', email: '' })

async function handleSubmit() {
  await submitForm(formData.value)
  showForm.value = false // Close after submit
}
</script>

<template>
  <PopoverDialog 
    v-model="showForm"
    title="Create User"
    :popover-width="400"
  >
    <template #trigger>
      <el-button type="primary">
        <Icon name="material-symbols:add" />
        New User
      </el-button>
    </template>
    
    <template #default="{ close }">
      <el-form :model="formData" label-position="top">
        <el-form-item label="Name">
          <el-input v-model="formData.name" />
        </el-form-item>
        
        <el-form-item label="Email">
          <el-input v-model="formData.email" type="email" />
        </el-form-item>
      </el-form>
      
      <div class="actions">
        <el-button @click="close()">Cancel</el-button>
        <el-button type="primary" @click="handleSubmit">
          Create
        </el-button>
      </div>
    </template>
  </PopoverDialog>
</template>
```

### 2. Confirmation

```vue
<script setup>
const showConfirm = ref(false)

function handleDelete() {
  deleteItem()
  showConfirm.value = false
}
</script>

<template>
  <PopoverDialog 
    v-model="showConfirm"
    title="Confirm Delete"
    :popover-width="300"
    placement="top"
  >
    <template #trigger>
      <el-button type="danger">Delete</el-button>
    </template>
    
    <template #default="{ close }">
      <p>Are you sure you want to delete this item?</p>
      <div class="actions">
        <el-button @click="close()">Cancel</el-button>
        <el-button type="danger" @click="handleDelete">
          Delete
        </el-button>
      </div>
    </template>
  </PopoverDialog>
</template>
```

### 3. Adaptive Content

```vue
<template>
  <PopoverDialog v-model="visible">
    <template #trigger>
      <el-button>Settings</el-button>
    </template>
    
    <template #default="{ isMobile, close }">
      <div :class="{ 'mobile-layout': isMobile }">
        <!-- Show different layouts based on mode -->
        <el-tabs v-if="!isMobile" type="border-card">
          <el-tab-pane label="General">...</el-tab-pane>
          <el-tab-pane label="Advanced">...</el-tab-pane>
        </el-tabs>
        
        <el-collapse v-else>
          <el-collapse-item title="General">...</el-collapse-item>
          <el-collapse-item title="Advanced">...</el-collapse-item>
        </el-collapse>
      </div>
    </template>
  </PopoverDialog>
</template>
```

### 4. Custom Breakpoint

```vue
<!-- Switch to dialog at 1024px instead of 768px -->
<PopoverDialog 
  v-model="visible"
  :mobile-breakpoint="1024"
>
  <!-- content -->
</PopoverDialog>
```

---

## Styling

The component automatically handles most styling, but you can customize:

```vue
<template>
  <PopoverDialog v-model="visible">
    <template #default="{ isMobile }">
      <div class="my-content" :class="{ mobile: isMobile }">
        <!-- content -->
      </div>
    </template>
  </PopoverDialog>
</template>

<style scoped>
.my-content {
  padding: var(--app-space-m);
  
  &.mobile {
    padding: var(--app-space-s);
  }
}
</style>
```

---

## Behavior

### Desktop Mode (≥768px)

```
User clicks trigger
   ↓
Popover appears near trigger
   ↓
Content rendered in popover
   ↓
Click outside or close button → Popover closes
```

- Positioned relative to trigger
- Closes on outside click
- Compact design
- Better for quick actions

### Mobile Mode (<768px)

```
User taps trigger
   ↓
Dialog overlay appears
   ↓
Content rendered in dialog
   ↓
Tap close or action button → Dialog closes
```

- Full-screen overlay
- Explicit close action
- Touch-optimized
- Better for complex forms

---

## Real-World Usage

### Workspace Creation (from workspaceList.vue)

```vue
<PopoverDialog
  v-model="showCreateDialog"
  title="Create Workspace"
  :disabled="!currentCompany"
  :popover-width="420"
  placement="bottom-end"
>
  <template #trigger>
    <el-button type="primary" :disabled="!currentCompany">
      <Icon name="material-symbols:add" />
      New Workspace
    </el-button>
  </template>
  
  <template #default="{ isMobile, close }">
    <div class="create-form-content" :class="{ mobile: isMobile }">
      <h3 v-if="!isMobile" class="form-title">Create Workspace</h3>
      
      <el-form :model="createForm" label-position="top">
        <el-form-item label="Name" required>
          <el-input v-model="createForm.name" />
        </el-form-item>
        
        <el-form-item label="Icon">
          <IconPickerInput 
            v-model="createForm.icon"
            :size="isMobile ? 'default' : 'small'"
          />
        </el-form-item>
      </el-form>
      
      <div class="form-actions">
        <el-button @click="close()">Cancel</el-button>
        <el-button type="primary" @click="handleCreate">
          Create
        </el-button>
      </div>
    </div>
  </template>
</PopoverDialog>
```

---

## Tips

### 1. Title Handling

Dialog shows title in header, popover doesn't. Handle this in content:

```vue
<template #default="{ isMobile }">
  <div>
    <!-- Show title in popover mode only -->
    <h3 v-if="!isMobile">My Title</h3>
    <!-- content -->
  </div>
</template>
```

### 2. Button Sizes

Adjust input/button sizes for mobile:

```vue
<el-input :size="isMobile ? 'default' : 'small'" />
```

### 3. Form Actions

Use consistent action buttons:

```vue
<div class="form-actions">
  <el-button @click="close()">Cancel</el-button>
  <el-button type="primary" @click="submit()">Submit</el-button>
</div>

<style>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--app-space-s);
  margin-top: var(--app-space-m);
  padding-top: var(--app-space-m);
  border-top: 1px solid var(--app-border-color);
}
</style>
```

### 4. Responsive Layouts

Use `isMobile` prop for conditional rendering:

```vue
<template #default="{ isMobile }">
  <!-- Compact layout for popover -->
  <el-form v-if="!isMobile" :inline="true">
    <el-form-item label="Name">
      <el-input v-model="form.name" size="small" />
    </el-form-item>
  </el-form>
  
  <!-- Full layout for dialog -->
  <el-form v-else label-position="top">
    <el-form-item label="Name">
      <el-input v-model="form.name" />
    </el-form-item>
  </el-form>
</template>
```

---

## Benefits

✅ **Write once, run everywhere** - Same content for both modes  
✅ **Automatic adaptation** - No manual breakpoint handling  
✅ **Better UX** - Right interface for each device  
✅ **Consistent API** - Familiar Element Plus props  
✅ **Type-safe** - Full TypeScript support  
✅ **Event handling** - All lifecycle events forwarded  
✅ **Flexible** - Customizable breakpoint and widths  

---

## Migration Guide

### Before (Manual handling)

```vue
<script setup>
const isMobile = ref(false)

onMounted(() => {
  const check = () => isMobile.value = window.innerWidth < 768
  check()
  window.addEventListener('resize', check)
  onUnmounted(() => window.removeEventListener('resize', check))
})
</script>

<template>
  <el-popover v-if="!isMobile" v-model:visible="visible">
    <template #reference>
      <el-button>Open</el-button>
    </template>
    <div>Content</div>
  </el-popover>
  
  <template v-else>
    <el-button @click="visible = true">Open</el-button>
    <el-dialog v-model="visible">
      <div>Content</div>
    </el-dialog>
  </template>
</template>
```

### After (Using PopoverDialog)

```vue
<template>
  <PopoverDialog v-model="visible">
    <template #trigger>
      <el-button>Open</el-button>
    </template>
    <template #default>
      <div>Content</div>
    </template>
  </PopoverDialog>
</template>
```

Much cleaner! 🎉

