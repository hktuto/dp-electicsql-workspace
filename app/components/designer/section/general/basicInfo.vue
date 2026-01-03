<script setup lang="ts">
const { appNodeTree } = useAppsContext()

// Status options
const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
]
</script>

<template>
    <div class="form-group">
        <h4>Basic Information</h4>
        
        <ElFormItem label="App Name">
            <ElInput v-model="appNodeTree.title" placeholder="Enter app name" />
        </ElFormItem>
        
        <ElFormItem label="Description">
            <ElInput 
                v-model="appNodeTree.description" 
                type="textarea" 
                :rows="3"
                placeholder="Describe your app"
            />
        </ElFormItem>
        
        <ElFormItem label="Icon">
            <ElInput v-model="appNodeTree.icon" placeholder="e.g., lucide:home or emoji" />
        </ElFormItem>
        
        <ElFormItem label="Status">
            <ElSelect v-model="appNodeTree.status" style="width: 100%">
                <ElOption 
                    v-for="option in statusOptions" 
                    :key="option.value" 
                    :label="option.label" 
                    :value="option.value" 
                />
            </ElSelect>
        </ElFormItem>
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

