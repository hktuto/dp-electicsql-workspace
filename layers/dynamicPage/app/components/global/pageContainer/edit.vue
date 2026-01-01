<script setup lang="ts">
    import { useDynamicRouterContext } from '#layers/dynamicPage/app/composables/useDynamicRouter';
    const props = defineProps<{
        logo: string
        menu: any[]
        footer: any[]
    }>()
    
    const router = useDynamicRouterContext()
</script>

<template>
    <div class="page-container">
        <aside>
            <img v-if="logo" :src="logo" alt="logo" />
            <div class="menu">
                edit
                <pre contentEditable>{{ menu }}</pre>
            </div>
            <div class="footer">
                edit
                <pre contentEditable>{{ footer }}</pre>
            </div>
        </aside>
        <main>
            editing page container
            <slot />
        </main>
    </div>
</template>