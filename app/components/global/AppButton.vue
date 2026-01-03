<script setup lang="ts">

    const props = withDefaults(defineProps<{
        type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text'
        size?: 'small' | 'large' | 'default'
        icon?: string
        loading?: boolean,
        disabled?: boolean,
        click?: () => void
    }>(), {
        type: 'primary',
        size: 'default',
        loading: false,
        disabled: false,
    });
    const emit = defineEmits<{
        (e: 'click'): void
    }>();
   
</script>

<template>
    <el-button v-bind="props" @click="emit('click')">
        <slot />
    </el-button>
</template>