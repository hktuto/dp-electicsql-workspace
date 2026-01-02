<script setup lang="ts">
    import { useDynamicRouterContext } from '#layers/dynamicPage/app/composables/useDynamicRouter';
    const props = defineProps<{
        logo: string
        menu: any[]
        footer: any[]
    }>()
    
    const router = useDynamicRouterContext()
    const emit = defineEmits<{
        (e: 'click', event: MouseEvent): void
    }>()
    function clickHandler(e: MouseEvent) {
        emit('click', e)
    }

    function getEventFormChildTest(e:any) {
        console.log('getEventFormChildTest', e)
    }

    defineExpose({
        getEventFormChildTest
    })
</script>

<template>
    <div class="page-container">
        <aside>
            <img v-if="logo" :src="logo" alt="logo" />
            <div class="menu">
                {{ menu }}
                
            </div>
            <div class="footer">
                {{ footer }}
            </div>
        </aside>
        <main>
            <slot />
        </main>
    </div>
</template>