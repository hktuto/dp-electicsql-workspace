<script setup lang="ts">
import { useDynamicRenderContext } from '#layers/dynamicPage/app/composables/useDynamicRender';

import type { ComponentNode } from '~~/shared/dynamicComponent/dynamic-page';
const props = defineProps<{
    component: ComponentNode
}>()
const {displayMode, componentState} = useDynamicRenderContext()

const componentToRender = computed(() => {
    if(displayMode.value === 'edit'){
        return props.component.renderComponent || props.component.editComponent
    }
    return props.component.renderComponent
})

</script>

<template>
    <NuxtErrorBoundary>

    <component :is="componentToRender" v-bind="componentState.props" v-on="componentState.eventHandlers">
        <template v-for="(children, key) in componentState.slots" :key="key" v-slot:[key]>
            {{ children }}
            <dynamicPageComponentRenderer v-for="component in children" :key="component.id" :component="component" root="true"/>

        </template>
    </component>
    <template #error="{ error }">
        <div>   
            {{  error  }}
        </div>
    </template>
    </NuxtErrorBoundary>
</template>