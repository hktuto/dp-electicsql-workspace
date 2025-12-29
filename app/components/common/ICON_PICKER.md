# Icon Picker Component

## Components

### 1. `<IconPicker />` - Core Picker
The main icon picker component with category tabs, search, and grid.

### 2. `<IconPickerInput />` - Form Input Wrapper
An input field with popover/dialog that opens the icon picker. Uses `CommonPopoverDialog` for responsive display (popover on desktop, dialog on mobile).

---

## Usage

### Basic - Form Input (Recommended)

```vue
<script setup>
const icon = ref('material-symbols:home')
</script>

<template>
  <el-form-item label="Icon">
    <IconPickerInput v-model="icon" placeholder="Select an icon" />
  </el-form-item>
</template>
```

### Advanced - Direct Picker

```vue
<script setup>
const icon = ref('')

function handleSelect(iconName) {
  console.log('Selected:', iconName)
}
</script>

<template>
  <IconPicker v-model="icon" @select="handleSelect" />
</template>
```

---

## Icon Collections

The picker includes curated icons from popular sets:

### 1. **Popular** (Default)
Handpicked commonly-used icons from all collections

### 2. **Material Symbols**
Google's Material Design icons
- Prefix: `material-symbols:`
- Example: `material-symbols:home`
- Count: ~60 curated icons

### 3. **Heroicons**
Beautiful hand-crafted SVG icons
- Prefix: `heroicons:`
- Example: `heroicons:rocket-launch`
- Count: ~50 curated icons

### 4. **Lucide**
Open source icon set
- Prefix: `lucide:`
- Example: `lucide:box`
- Count: ~50 curated icons

---

## Component Props

### IconPicker

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | `''` | Selected icon name (v-model) |

### IconPickerInput

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | `''` | Selected icon name (v-model) |
| `placeholder` | `string` | `'Select an icon'` | Input placeholder text |
| `size` | `'large' \| 'default' \| 'small'` | `'default'` | Input size |

---

## Events

### IconPicker

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string` | Emitted when icon is selected |
| `select` | `string` | Emitted when icon is selected (alternative) |

### IconPickerInput

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string` | Emitted when icon is selected |

---

## Complete Example

### In Create Workspace Form

```vue
<script setup>
const form = ref({
  name: '',
  slug: '',
  icon: '',
  description: '',
})

async function handleSubmit() {
  const { $api } = useNuxtApp()
  await $api('/api/workspaces', {
    method: 'POST',
    body: form.value,
  })
}
</script>

<template>
  <el-form :model="form" label-position="top">
    <el-form-item label="Name" required>
      <el-input v-model="form.name" />
    </el-form-item>

    <el-form-item label="Icon">
      <IconPickerInput 
        v-model="form.icon" 
        placeholder="Choose an icon"
      />
    </el-form-item>

    <el-form-item label="Description">
      <el-input v-model="form.description" type="textarea" />
    </el-form-item>

    <el-button type="primary" @click="handleSubmit">
      Create
    </el-button>
  </el-form>
</template>
```

---

## Features

### ✅ Category Navigation
- Popular (All collections)
- Material Symbols
- Heroicons
- Lucide
- Horizontal scroll for many categories

### ✅ Search Functionality
- Real-time filtering
- Search across all icon names
- Clear button
- Case-insensitive

### ✅ Icon Grid
- 8 columns responsive grid
- Hover effects with scale
- Selected state indicator
- Scrollable container
- Touch-friendly

### ✅ Preview Bar
- Shows selected icon
- Displays full icon name
- Quick clear button

### ✅ Form Integration
- v-model support
- Element Plus input wrapper
- Icon preview in prepend
- Clear button in append
- Popover/Dialog interface (responsive)
  - Desktop: Smart-positioned popover near input
  - Mobile: Full-screen dialog

---

## Styling

### Size
- Width: 480px (max)
- Height: 480px
- Responsive to container

### Grid
- 8 columns
- Square icons (aspect-ratio: 1)
- 24px icon size
- Hover scale: 1.1

### Colors
Uses CSS variables:
- `--app-primary-color` - Selected state
- `--app-text-color-*` - Text colors
- `--el-fill-color-*` - Backgrounds
- `--app-border-color` - Borders

---

## Customization

### Add More Icons

Edit `/app/components/common/iconPicker.vue`:

```typescript
const iconCollections = {
  'my-collection': {
    label: 'My Icons',
    prefix: 'my-prefix',
    icons: [
      'icon-1',
      'icon-2',
      // ... more icons
    ],
  },
}
```

### Change Grid Columns

```scss
.icon-grid {
  grid-template-columns: repeat(10, 1fr); // 10 columns instead of 8
}
```

### Custom Dialog Size

```vue
<el-dialog width="800px">
  <IconPicker />
</el-dialog>
```

---

## Integration with Existing Forms

### Update Workspace Create Dialog

```vue
<!-- In workspaceList.vue -->
<el-form-item label="Icon">
  <IconPickerInput 
    v-model="createForm.icon" 
    placeholder="material-symbols:folder"
  />
</el-form-item>
```

### Update Workspace Settings

```vue
<!-- In workspaceSetting.vue -->
<el-form-item label="Icon (optional)">
  <IconPickerInput 
    v-model="form.icon" 
    placeholder="material-symbols:folder"
  />
</el-form-item>
```

---

## Performance Notes

### Current Implementation
- ✅ Curated icons (no API calls)
- ✅ Static arrays (~200 total icons)
- ✅ Client-side filtering
- ✅ Instant search
- ✅ No external dependencies

### Future Improvements (Optional)
- Virtual scrolling for 1000+ icons
- Lazy loading categories
- Iconify API integration for all icons
- Recent/favorite icons
- Color picker integration

---

## Accessibility

- ✅ Keyboard navigation
- ✅ Icon titles on hover
- ✅ Clear visual feedback
- ✅ Focus states
- ✅ Screen reader support (via Element Plus)

---

## Browser Support

Works on all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers

---

## Troubleshooting

### Icons not showing
- Check if `@nuxt/icon` is installed
- Verify icon names are correct
- Check internet connection (Iconify CDN)

### Search not working
- Check if `searchQuery` is reactive
- Verify `filteredIcons` computed property

### Dialog not opening
- Check `showPicker` reactive state
- Verify Element Plus is installed
- Check z-index conflicts

---

## Example: Complete Workspace Form

```vue
<el-form :model="form" label-position="top">
  <el-form-item label="Workspace Name" required>
    <el-input 
      v-model="form.name" 
      placeholder="Enter workspace name"
    />
  </el-form-item>

  <el-form-item label="Slug" required>
    <el-input 
      v-model="form.slug" 
      placeholder="workspace-slug"
    >
      <template #prepend>/workspaces/</template>
    </el-input>
  </el-form-item>

  <el-form-item label="Icon">
    <IconPickerInput 
      v-model="form.icon" 
      placeholder="Choose an icon"
    />
    <div class="form-hint">
      Or use any <a href="https://icones.js.org" target="_blank">Iconify</a> icon name
    </div>
  </el-form-item>

  <el-form-item label="Description">
    <el-input 
      v-model="form.description" 
      type="textarea"
      :rows="3"
      placeholder="Describe this workspace"
    />
  </el-form-item>
</el-form>
```

