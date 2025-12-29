<script setup lang="ts">
/**
 * Icon Picker Input Component
 * 
 * Form input wrapper for icon picker with dialog
 */

interface Props {
  modelValue?: string
  placeholder?: string
  size?: 'large' | 'default' | 'small'
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select an icon',
  size: 'default',
})

const emit = defineEmits<Emits>()

const selectedIcon = ref(props.modelValue || '')
const inputRef = ref<HTMLElement>()
const popoverRef = ref()

watch(() => props.modelValue, (value) => {
  selectedIcon.value = value || ''
})

function openPicker() {
  const target = inputRef.value
  if (target) {
    const el = (target as any).$el || target
    popoverRef.value?.open(el)
  }
}

function handleSelect(iconName: string) {
  selectedIcon.value = iconName
  emit('update:modelValue', iconName)
  popoverRef.value?.close()
}

function clearIcon() {
  selectedIcon.value = ''
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="icon-picker-input">
    <el-input
      ref="inputRef"
      :model-value="selectedIcon"
      :placeholder="placeholder"
      :size="size"
      readonly
      @click="openPicker"
    >
      <template #prepend>
        <div class="icon-preview">
          <Icon v-if="selectedIcon" :name="selectedIcon" size="18" />
          <Icon v-else name="material-symbols:image" size="18" />
        </div>
      </template>
      <template #append>
        <el-button
          v-if="selectedIcon"
          text
          @click.stop="clearIcon"
        >
          <Icon name="material-symbols:close" />
        </el-button>
        <el-button
          v-else
          text
          @click.stop="openPicker"
        >
          <Icon name="material-symbols:search" />
        </el-button>
      </template>
    </el-input>

    <!-- Icon Picker Popover -->
    <CommonPopoverDialog
      ref="popoverRef"
      title="Select Icon"
      :width="520"
      placement="bottom-start"
      :close-on-click-modal="false"
    >
      <CommonIconPicker
        :model-value="selectedIcon"
        @select="handleSelect"
      />
    </CommonPopoverDialog>
  </div>
</template>

<style scoped lang="scss">
.icon-picker-input {
  :deep(.el-input) {
    cursor: pointer;
  }

  :deep(.el-input__inner) {
    cursor: pointer;
  }
}

.icon-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  color: var(--app-text-color-secondary);
}
</style>

