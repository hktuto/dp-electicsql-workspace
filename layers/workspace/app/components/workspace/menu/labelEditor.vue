<script setup lang="ts">
interface Props {
  modelValue: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'save', value: string): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const inputRef = ref<HTMLInputElement>()
const localValue = ref(props.modelValue)
const isCancelling = ref(false)

// Focus input on mount
onMounted(() => {
  inputRef.value?.focus()
  inputRef.value?.select()
})

function handleSave() {
  // Don't save if user is cancelling
  if (isCancelling.value) return
  
  if (localValue.value.trim()) {
    emit('save', localValue.value.trim())
  } else {
    emit('cancel')
  }
}

function handleCancel() {
  isCancelling.value = true
  emit('cancel')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    handleSave()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    handleCancel()
  }
}
</script>

<template>
  <div class="label-editor" @click.stop>
    <input
      ref="inputRef"
      v-model="localValue"
      type="text"
      class="label-input"
      @blur="handleSave"
      @keydown="handleKeydown"
    >
    <el-button
      text
      circle
      size="small"
      class="cancel-btn"
      @mousedown.prevent
      @click="handleCancel"
    >
      <Icon name="material-symbols:close" size="14" />
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.label-editor {
  display: flex;
  align-items: center;
  gap: var(--app-space-xs);
  flex: 1;
  min-width: 0;
}

.label-input {
  flex: 1;
  min-width: 0;
  padding: 2px 6px;
  font-size: var(--app-font-size-s);
  border: 1px solid var(--el-border-color);
  border-radius: var(--app-border-radius-s);
  background: var(--el-bg-color);
  outline: none;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: var(--el-color-primary);
  }
}

.cancel-btn {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  padding: 0;
}
</style>

