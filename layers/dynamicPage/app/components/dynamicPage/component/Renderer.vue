<script setup lang="ts">
import { useDynamicRenderContext } from '#layers/dynamicPage/app/composables/useDynamicRender';

import type { ComponentNode } from '~~/layers/dynamicPage/app/utils/dynamicAppType';
const props = defineProps<{
    component: ComponentNode
}>()
const {displayMode} = useDynamicRenderContext()
const componentRef = useTemplateRef<any>('componentRef')

const cProps = ref<Record<string, any>>({})

const evs = ref<Record<string, Function>>({})

const router = useDynamicRouterContext()

async function setupComponent() {
    // this function is to phase the component event handlers and props

    if(props.component.eventHandlers){
       for(const [key, value] of Object.entries(props.component.eventHandlers)){
            try{
                const fn = eval(value)
                evs.value[key] = (...args: any[]) => {
                    try{
                        console.log("args", args)
                        fn(...args)
                    }catch(e){
                        console.error(e)
                    }
                }
                
            }catch(e){
                console.error(e)
            }
        }
    }
    if(props.component.props){
        cProps.value = props.component.props
    }
}


const componentToRender = computed(() => {
    if(displayMode.value === 'edit'){
        return props.component.editComponent || props.component.renderComponent
    }
    return props.component.renderComponent
})

onMounted(async() => {
   await setupComponent()
})


</script>

<template>
    <Suspense>
        <NuxtErrorBoundary>
            <component ref="componentRef" :is="componentToRender" v-bind="cProps" v-on="evs">
                <template v-for="(children, key) in component.slots" :key="key" v-slot:[key]>

                    <DynamicPageComponentRenderer v-for="childComponent in children" :key="childComponent.instanceId" :component="childComponent" />

                </template>
            </component>
            <template #error="{ error }">
                <div>   
                    {{  error  }} catch in error boundary
                </div>
            </template>
        </NuxtErrorBoundary>
        <template #fallback>
            <nuxt-loading-indicator />
        </template>
    </Suspense>
</template>