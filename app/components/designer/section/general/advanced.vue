<script setup lang="ts">
const { appNodeTree } = useAppsContext()

// Advanced settings toggle
const showAdvanced = ref(false)

// Computed property for meta JSON editing
const metaJson = computed({
    get: () => {
        return appNodeTree.value.meta ? JSON.stringify(appNodeTree.value.meta, null, 2) : ''
    },
    set: (value: string) => {
        try {
            appNodeTree.value.meta = value ? JSON.parse(value) : undefined
        } catch (e) {
            // Invalid JSON, don't update
            console.error('Invalid JSON in meta field')
        }
    }
})
</script>

<template>
    <div class="form-group">
        <ElButton 
            text 
            @click="showAdvanced = !showAdvanced"
            style="padding: 0; margin-bottom: var(--app-space-s)"
        >
            <Icon :name="showAdvanced ? 'lucide:chevron-down' : 'lucide:chevron-right'" />
            Advanced Settings
        </ElButton>
        
        <template v-if="showAdvanced">
            <ElFormItem label="Workspace ID">
                <ElInput 
                    v-model="appNodeTree.workspaceId" 
                    placeholder="null for system apps"
                />
            </ElFormItem>
            
            <ElFormItem label="Version">
                <ElInputNumber 
                    v-model="appNodeTree.version" 
                    :min="1"
                    style="width: 100%"
                />
            </ElFormItem>
            
            <ElFormItem label="Bucket Prefix">
                <ElInput 
                    v-model="appNodeTree.bucketPrefix" 
                    placeholder="e.g., system/auth/ or workspaces/:id/"
                />
            </ElFormItem>
            
            <ElFormItem label="Metadata (JSON)">
                <ElInput 
                    v-model="metaJson" 
                    type="textarea" 
                    :rows="5"
                    placeholder='{"favicon": "...", "themeColor": "#4F46E5"}'
                />
            </ElFormItem>
        </template>
    </div>
</template>

<style scoped lang="scss">
.form-group {
    margin-bottom: var(--app-space-s);
    padding: var(--app-space-m);
    background: var(--app-grey-950);
    border-radius: var(--app-border-radius-m);
    
    h4 {
        margin: 0 0 var(--app-space-m) 0;
        font-size: var(--app-font-size-m);
        font-weight: 600;
        color: var(--app-grey-600);
    }
}
</style>

