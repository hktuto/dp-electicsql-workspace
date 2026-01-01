<script setup lang="ts">
import { useDynamicRenderContext } from '#layers/dynamicPage/app/composables/useDynamicRender';

import type { ComponentNode } from '~~/shared/dynamicComponent/dynamic-page';
const props = defineProps<{
    component: ComponentNode
}>()
const {displayMode, componentState} = useDynamicRenderContext()

const componentToRender = computed(() => {
    if(displayMode.value === 'edit'){
        return props.component.editComponent || props.component.renderComponent
    }
    return props.component.renderComponent
})

</script>

<template>
    <NuxtErrorBoundary>
        <component :is="componentToRender" v-bind="component.props" v-on="component.eventHandlers">
            <template v-for="(children, key) in component.slots" :key="key" v-slot:[key]>

                <dynamicPageComponentRenderer v-for="childComponent in children" :key="childComponent.id" :component="childComponent" root="true"/>

            </template>
        </component>
        <template #error="{ error }">
            <div>   
                {{  error  }}
            </div>
        </template>
    </NuxtErrorBoundary>
</template>