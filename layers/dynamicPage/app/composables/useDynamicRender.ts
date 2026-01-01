import type { ComponentNode } from '#shared/dynamicComponent/dynamic-page';
import { useRefHistory } from '@vueuse/core';


interface DynamicRenderContext {
    toggleEditMode: () => void
    save: () => void
    displayMode: Ref<'view' | 'edit'>
    componentState: Ref<ComponentNode>
    canUndo: Ref<boolean>
    canRedo: Ref<boolean>
    undo: () => void
    redo: () => void
    commit: () => void
}
export const DynamicRenderProvider :InjectionKey<DynamicRenderContext> = Symbol('DynamicRenderProvider')




const useDisplayMode = () => useState<'view' | 'edit' >('dynamicRenderMode', () => 'view')
export const useComponentState = () => useState<ComponentNode>('dynamicComponentState')

export const useDynamicRenderProvider = (initState: ComponentNode) => {
    const displayMode = useDisplayMode()
    const componentState = useComponentState()
    componentState.value = initState

    function toggleEditMode(){
        displayMode.value = displayMode.value === 'view' ? 'edit' : 'view'
    }
    function save(){
        // TODO
    }

    // TODO : try use useRefHistory to handle the undo and redo
    const { canUndo, canRedo, undo, redo, commit } = useRefHistory(componentState)

    provide(DynamicRenderProvider, {
        toggleEditMode,
        displayMode,
        componentState,
        canUndo,
        canRedo,
        undo,
        redo,
        save,
        commit,
    })

    return {
        toggleEditMode,
        displayMode,
        componentState,
        canUndo,
        canRedo,
        undo,
        redo,
        save,
        commit,
    }
}

export const useDynamicRenderContext = () => {
    const context = inject(DynamicRenderProvider)
    if (!context) {
        throw new Error('useDynamicRender must be used within DynamicRenderProvider')
    }
    return context
}