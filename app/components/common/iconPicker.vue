<script setup lang="ts">
/**
 * Icon Picker Component
 * 
 * Notion-style icon picker for selecting Iconify icons
 */

interface Props {
  modelValue?: string // Selected icon name
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'select', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Icon collections with curated popular icons
const iconCollections = {
  all: {
    label: 'Popular',
    prefix: 'all',
    icons: [
      'material-symbols:home',
      'material-symbols:folder',
      'material-symbols:description',
      'material-symbols:settings',
      'material-symbols:person',
      'material-symbols:business',
      'material-symbols:dashboard',
      'material-symbols:view-kanban',
      'material-symbols:calendar-month',
      'material-symbols:table',
      'material-symbols:bar-chart',
      'material-symbols:pie-chart',
      'heroicons:rocket-launch',
      'heroicons:sparkles',
      'heroicons:star',
      'heroicons:heart',
      'heroicons:bell',
      'heroicons:fire',
      'heroicons:light-bulb',
      'heroicons:bookmark',
      'lucide:box',
      'lucide:briefcase',
      'lucide:package',
      'lucide:shopping-cart',
      'lucide:users',
      'lucide:user-circle',
      'lucide:mail',
      'lucide:phone',
    ],
  },
  'material-symbols': {
    label: 'Material',
    prefix: 'material-symbols',
    icons: [
      'home', 'folder', 'description', 'settings', 'person', 'business',
      'dashboard', 'view-kanban', 'calendar-month', 'table', 'bar-chart',
      'pie-chart', 'list', 'grid-view', 'attach-file', 'image', 'video-file',
      'audio-file', 'code', 'bug-report', 'lock', 'key', 'shield',
      'visibility', 'favorite', 'star', 'bookmark', 'flag', 'tag',
      'label', 'edit', 'delete', 'add', 'remove', 'check', 'close',
      'arrow-forward', 'arrow-back', 'arrow-upward', 'arrow-downward',
      'refresh', 'search', 'filter', 'sort', 'download', 'upload',
      'share', 'link', 'mail', 'phone', 'location-on', 'place',
      'notifications', 'alarm', 'schedule', 'event', 'history', 'today',
    ],
  },
  heroicons: {
    label: 'Heroicons',
    prefix: 'heroicons',
    icons: [
      'rocket-launch', 'sparkles', 'star', 'heart', 'bell', 'fire',
      'light-bulb', 'bookmark', 'folder', 'document', 'home', 'user',
      'users', 'building-office', 'chart-bar', 'chart-pie', 'calendar',
      'clock', 'cog', 'key', 'lock-closed', 'shield-check', 'eye',
      'pencil', 'trash', 'plus', 'minus', 'check', 'x-mark',
      'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
      'magnifying-glass', 'funnel', 'envelope', 'phone', 'map-pin',
      'globe-alt', 'link', 'photo', 'video-camera', 'musical-note',
      'code-bracket', 'command-line', 'cpu-chip', 'server',
    ],
  },
  lucide: {
    label: 'Lucide',
    prefix: 'lucide',
    icons: [
      'box', 'briefcase', 'package', 'shopping-cart', 'users', 'user-circle',
      'mail', 'phone', 'home', 'folder', 'file', 'settings', 'layout-dashboard',
      'layout-grid', 'layout-list', 'calendar', 'clock', 'bookmark', 'star',
      'heart', 'message-circle', 'bell', 'flag', 'tag', 'hash',
      'image', 'video', 'music', 'file-text', 'code', 'terminal',
      'database', 'server', 'cloud', 'download', 'upload', 'share',
      'link', 'external-link', 'edit', 'trash', 'plus', 'minus',
      'check', 'x', 'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
      'search', 'filter', 'more-horizontal', 'more-vertical',
    ],
  },
}

// State
const activeCategory = ref<keyof typeof iconCollections>('all')
const searchQuery = ref('')
const selectedIcon = ref(props.modelValue || '')

// Watch for external changes
watch(() => props.modelValue, (value) => {
  if (value) selectedIcon.value = value
})

// Get icons for current category and search
const filteredIcons = computed(() => {
  const collection = iconCollections[activeCategory.value]
  let icons = collection.icons
  
  // Add prefix if not 'all' category
  if (activeCategory.value !== 'all') {
    icons = icons.map(icon => `${collection.prefix}:${icon}`)
  }
  
  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    icons = icons.filter(icon => icon.toLowerCase().includes(query))
  }
  
  return icons
})

// Handle icon selection
function selectIcon(iconName: string) {
  selectedIcon.value = iconName
  emit('update:modelValue', iconName)
  emit('select', iconName)
}

// Clear selection
function clearIcon() {
  selectedIcon.value = ''
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="icon-picker">
    <!-- Category Tabs -->
    <div class="category-tabs">
      <button
        v-for="(collection, key) in iconCollections"
        :key="key"
        class="category-tab"
        :class="{ active: activeCategory === key }"
        @click="activeCategory = key as keyof typeof iconCollections"
      >
        {{ collection.label }}
      </button>
    </div>

    <!-- Search Box -->
    <div class="search-box">
      <Icon name="material-symbols:search" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search icons..."
        class="search-input"
      />
      <button
        v-if="searchQuery"
        class="clear-search"
        @click="searchQuery = ''"
      >
        <Icon name="material-symbols:close" />
      </button>
    </div>

    <!-- Icon Grid -->
    <div class="icon-grid-container">
      <div v-if="filteredIcons.length === 0" class="empty-state">
        <Icon name="material-symbols:search-off" size="48" />
        <p>No icons found</p>
      </div>
      <div v-else class="icon-grid">
        <button
          v-for="icon in filteredIcons"
          :key="icon"
          class="icon-item"
          :class="{ selected: selectedIcon === icon }"
          :title="icon"
          @click="selectIcon(icon)"
        >
          <Icon :name="icon" size="24" />
        </button>
      </div>
    </div>

    <!-- Selected Preview -->
    <div v-if="selectedIcon" class="selected-preview">
      <div class="preview-icon">
        <Icon :name="selectedIcon" size="20" />
      </div>
      <div class="preview-text">{{ selectedIcon }}</div>
      <button class="preview-clear" @click="clearIcon">
        <Icon name="material-symbols:close" size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.icon-picker {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  height: 480px;
  background: var(--el-bg-color);
  border-radius: var(--app-border-radius-m);
  overflow: hidden;
}

// Category Tabs
.category-tabs {
  display: flex;
  gap: var(--app-space-xs);
  padding: var(--app-space-s);
  border-bottom: 1px solid var(--app-border-color);
  overflow-x: auto;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
}

.category-tab {
  flex-shrink: 0;
  padding: var(--app-space-xs) var(--app-space-m);
  font-size: var(--app-font-size-s);
  font-weight: 500;
  color: var(--app-text-color-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--app-border-radius-s);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: var(--app-text-color-primary);
    background: var(--el-fill-color-light);
  }

  &.active {
    color: var(--app-primary-color);
    background: var(--el-color-primary-light-9);
    border-color: var(--app-primary-color);
  }
}

// Search Box
.search-box {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  padding: var(--app-space-s) var(--app-space-m);
  border-bottom: 1px solid var(--app-border-color);

  .iconify {
    color: var(--app-text-color-secondary);
    flex-shrink: 0;
  }
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-primary);

  &::placeholder {
    color: var(--app-text-color-placeholder);
  }
}

.clear-search {
  padding: 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--app-text-color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--app-border-radius-s);
  transition: all 0.2s ease;

  &:hover {
    background: var(--el-fill-color-light);
    color: var(--app-text-color-primary);
  }
}

// Icon Grid
.icon-grid-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--app-space-s);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--app-space-m);
  color: var(--app-text-color-secondary);

  p {
    margin: 0;
    font-size: var(--app-font-size-s);
  }
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: var(--app-space-xs);
}

.icon-item {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--app-border-radius-s);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--app-text-color-primary);

  &:hover {
    background: var(--el-fill-color-light);
    border-color: var(--app-border-color);
    transform: scale(1.1);
  }

  &.selected {
    background: var(--el-color-primary-light-9);
    border-color: var(--app-primary-color);
    color: var(--app-primary-color);
  }
}

// Selected Preview
.selected-preview {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  padding: var(--app-space-s) var(--app-space-m);
  border-top: 1px solid var(--app-border-color);
  background: var(--el-fill-color-lighter);
}

.preview-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--app-border-radius-s);
  background: var(--el-bg-color);
  border: 1px solid var(--app-border-color);
  color: var(--app-primary-color);
}

.preview-text {
  flex: 1;
  font-size: var(--app-font-size-xs);
  font-family: monospace;
  color: var(--app-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-clear {
  padding: var(--app-space-xs);
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--app-text-color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--app-border-radius-s);
  transition: all 0.2s ease;

  &:hover {
    background: var(--el-fill-color);
    color: var(--app-text-color-primary);
  }
}
</style>

