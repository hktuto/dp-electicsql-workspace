<script setup lang="ts">
    import { useDynamicRenderProvider } from '#layers/dynamicPage/app/composables/useDynamicRender';
    import type { ComponentNode } from '#shared/dynamicComponent/dynamic-page';
   const props = defineProps<{
    component: ComponentNode
   }>()
     useDynamicRenderProvider(props.component)
     useDynamicRouter()
     const componentState = useComponentState()
    </script>
    
    <template>
        <DynamicPageComponentRenderer :component="componentState"/>
    </template>