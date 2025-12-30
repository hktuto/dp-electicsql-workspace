<template>
  <ElDialog
    :model-value="modelValue"
    :title="isEdit ? 'Edit Column' : 'Add Column'"
    width="600px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
    @closed="handleClosed"
  >
    <ElForm
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
    >
      <ElFormItem label="Column Label" prop="label">
        <ElInput
          v-model="form.label"
          placeholder="e.g., Full Name, Email Address"
          @input="onLabelChange"
        />
      </ElFormItem>

      <ElFormItem label="Column Name (Database)" prop="name">
        <ElInput
          v-model="form.name"
          placeholder="auto-generated (e.g., full_name)"
          :disabled="isEdit"
        />
        <template #extra>
          <span class="form-extra">
            {{ isEdit ? 'Column name cannot be changed after creation' : 'Auto-generated from label' }}
          </span>
        </template>
      </ElFormItem>

      <ElFormItem label="Column Type" prop="type">
        <ElSelect
          v-model="form.type"
          placeholder="Select column type"
          :disabled="isEdit"
        >
          <ElOptionGroup label="Text">
            <ElOption label="Text" value="text">
              <Icon name="mdi:format-text" /> Text
            </ElOption>
            <ElOption label="Long Text" value="long_text">
              <Icon name="mdi:text" /> Long Text
            </ElOption>
            <ElOption label="Email" value="email">
              <Icon name="mdi:email" /> Email
            </ElOption>
            <ElOption label="Phone" value="phone">
              <Icon name="mdi:phone" /> Phone
            </ElOption>
            <ElOption label="URL" value="url">
              <Icon name="mdi:link" /> URL
            </ElOption>
          </ElOptionGroup>
          
          <ElOptionGroup label="Number">
            <ElOption label="Number" value="number">
              <Icon name="mdi:numeric" /> Number
            </ElOption>
            <ElOption label="Currency" value="currency">
              <Icon name="mdi:currency-usd" /> Currency
            </ElOption>
          </ElOptionGroup>

          <ElOptionGroup label="Date & Time">
            <ElOption label="Date" value="date">
              <Icon name="mdi:calendar" /> Date
            </ElOption>
          </ElOptionGroup>

          <ElOptionGroup label="Selection">
            <ElOption label="Checkbox" value="checkbox">
              <Icon name="mdi:checkbox-marked" /> Checkbox
            </ElOption>
            <ElOption label="Switch" value="switch">
              <Icon name="mdi:toggle-switch" /> Switch
            </ElOption>
            <ElOption label="Select" value="select">
              <Icon name="mdi:form-select" /> Select
            </ElOption>
            <ElOption label="Multi-select" value="multi_select">
              <Icon name="mdi:format-list-checks" /> Multi-select
            </ElOption>
          </ElOptionGroup>

          <ElOptionGroup label="Other">
            <ElOption label="Color" value="color">
              <Icon name="mdi:palette" /> Color
            </ElOption>
            <ElOption label="Geolocation" value="geolocation">
              <Icon name="mdi:map-marker" /> Geolocation
            </ElOption>
            <ElOption label="Attachment" value="attachment">
              <Icon name="mdi:paperclip" /> Attachment
            </ElOption>
          </ElOptionGroup>
        </ElSelect>
        <template v-if="isEdit" #extra>
          <span class="form-extra form-warning">
            ⚠️ Changing type may cause data loss
          </span>
        </template>
      </ElFormItem>

      <ElRow :gutter="16">
        <ElCol :span="12">
          <ElFormItem label="Required">
            <ElSwitch v-model="form.required" />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="Unique">
            <ElSwitch v-model="form.isUnique" />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="16">
        <ElCol :span="12">
          <ElFormItem label="Primary Display">
            <ElSwitch v-model="form.isPrimaryDisplay" />
            <template #extra>
              <span class="form-extra">Main field shown in references</span>
            </template>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="Hidden">
            <ElSwitch v-model="form.isHidden" />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElFormItem label="Default Value">
        <ElInput v-model="form.defaultValue" placeholder="Optional" />
      </ElFormItem>

      <ElFormItem label="Order">
        <ElInputNumber v-model="form.order" :min="0" />
      </ElFormItem>
    </ElForm>

    <template #footer>
      <ElButton @click="$emit('update:modelValue', false)">Cancel</ElButton>
      <ElButton
        type="primary"
        :loading="saving"
        @click="handleSave"
      >
        {{ isEdit ? 'Update' : 'Create' }} Column
      </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import type { DataTableColumn } from '#shared/types/db'

const props = defineProps<{
  modelValue: boolean
  tableId: string
  column?: DataTableColumn | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const api = useAPI()
const formRef = ref<FormInstance>()
const saving = ref(false)

const isEdit = computed(() => !!props.column)

// Form
const form = ref({
  label: '',
  name: '',
  type: 'text',
  required: false,
  order: 0,
  defaultValue: '',
  isUnique: false,
  isHidden: false,
  isPrimaryDisplay: false,
})

const rules: FormRules = {
  label: [
    { required: true, message: 'Please enter a label', trigger: 'blur' },
  ],
  name: [
    { required: true, message: 'Please enter a column name', trigger: 'blur' },
    { pattern: /^[a-z][a-z0-9_]*$/, message: 'Only lowercase letters, numbers, and underscores. Must start with a letter.', trigger: 'blur' },
  ],
  type: [
    { required: true, message: 'Please select a type', trigger: 'change' },
  ],
}

// Auto-generate name from label
function onLabelChange() {
  if (!isEdit.value && (!form.value.name || form.value.name === generateName(form.value.label))) {
    form.value.name = generateName(form.value.label)
  }
}

function generateName(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/[\s]+/g, '_')
    .replace(/^[0-9]+/, '') // Remove leading numbers
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// Save column
async function handleSave() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    saving.value = true
    try {
      const payload = {
        label: form.value.label,
        name: form.value.name,
        type: form.value.type,
        required: form.value.required,
        order: form.value.order,
        defaultValue: form.value.defaultValue || undefined,
        isUnique: form.value.isUnique,
        isHidden: form.value.isHidden,
        isPrimaryDisplay: form.value.isPrimaryDisplay,
      }

      if (isEdit.value && props.column) {
        await api.put(`/tables/${props.tableId}/columns/${props.column.id}`, payload)
        ElMessage.success('Column updated')
      } else {
        await api.post(`/tables/${props.tableId}/columns`, payload)
        ElMessage.success('Column created')
      }

      emit('update:modelValue', false)
      emit('saved')
    } catch (error: any) {
      ElMessage.error(error.data?.message || 'Failed to save column')
    } finally {
      saving.value = false
    }
  })
}

// Handle dialog closed
function handleClosed() {
  formRef.value?.resetFields()
  form.value = {
    label: '',
    name: '',
    type: 'text',
    required: false,
    order: 0,
    defaultValue: '',
    isUnique: false,
    isHidden: false,
    isPrimaryDisplay: false,
  }
}

// Watch for column prop changes
watch(() => props.column, (newColumn) => {
  if (newColumn) {
    form.value = {
      label: newColumn.label,
      name: newColumn.name,
      type: newColumn.type,
      required: newColumn.required,
      order: newColumn.order,
      defaultValue: newColumn.defaultValue || '',
      isUnique: newColumn.isUnique,
      isHidden: newColumn.isHidden,
      isPrimaryDisplay: newColumn.isPrimaryDisplay,
    }
  }
}, { immediate: true })
</script>

<style scoped lang="scss">
.form-extra {
  font-size: 12px;
  color: var(--el-text-color-secondary);

  &.form-warning {
    color: var(--el-color-warning);
  }
}

:deep(.el-select-dropdown__item) {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>

