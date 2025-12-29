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

const showPicker = ref(false)
const selectedIcon = ref(props.modelValue || '')

watch(() => props.modelValue, (value) => {
  selectedIcon.value = value || ''
})

function handleSelect(iconName: string) {
  selectedIcon.value = iconName
  emit('update:modelValue', iconName)
  showPicker.value = false
}

function clearIcon() {
  selectedIcon.value = ''
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="icon-picker-input">
    <el-input
      :model-value="selectedIcon"
      :placeholder="placeholder"
      :size="size"
      readonly
      @click="showPicker = true"
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
          @click.stop="showPicker = true"
        >
          <Icon name="material-symbols:search" />
        </el-button>
      </template>
    </el-input>

    <!-- Icon Picker Dialog -->
    <el-dialog
      v-model="showPicker"
      title="Select Icon"
      width="520px"
      :close-on-click-modal="false"
    >
      <IconPicker
        :model-value="selectedIcon"
        @select="handleSelect"
      />
    </el-dialog>
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

