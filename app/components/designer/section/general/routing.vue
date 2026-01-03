<script setup lang="ts">
const { appNodeTree } = useAppsContext()

// Get all page IDs for home page dropdown
const pageOptions = computed(() => {
    if (!appNodeTree.value.pages) return []
    return appNodeTree.value.pages.map(page => ({
        label: `${page.title} (${page.id})`,
        value: page.id
    }))
})
</script>

<template>
    <div class="form-group">
        <h4>Routing</h4>
        
        <ElFormItem label="Base URL">
            <ElInput 
                v-model="appNodeTree.baseUrl" 
                placeholder="/workspaces/:slug or /auth"
                disabled
            />
        </ElFormItem>
        
        <ElFormItem label="Home Page">
            <ElSelect 
                v-model="appNodeTree.homePage" 
                placeholder="Select default page"
                clearable
                style="width: 100%"
            >
                <ElOption 
                    v-for="page in pageOptions" 
                    :key="page.value" 
                    :label="page.label" 
                    :value="page.value" 
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

