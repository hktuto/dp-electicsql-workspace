
import { useRefHistory, type UseRefHistoryRecord } from '@vueuse/core';
import type { AppNode, Page } from '~~/app/utils/type/apps';
import defaultTheme from '~/assets/theme/default';
interface AppsContext {
    bucketRoot: Ref<string>,
    appNodeTree: Ref<AppNode>,
    setLayout: (layout: string) => void
    layout: Ref<string>
    currentPage: Ref<Page | null>
    appLoading: Ref<boolean>
    displayMode: Ref<'view' | 'edit'>
    // history state
    canRedo: Ref<boolean>,
    canUndo: Ref<boolean>,
    redo: () => void,
    undo: () => void,
    commit: () => void,
    clear: () => void,
    history: Ref<UseRefHistoryRecord<AppNode>[]>,
    // save state
    hasUnsavedChanges: ComputedRef<boolean>,
    saveAppNodeTree: () => Promise<void>,
    isSaving: Ref<boolean>,
}
export const AppsProvider :InjectionKey<AppsContext> = Symbol('AppsProvider')



// Global state 
const useAppDisplayMode = () => useState<'view' | 'edit' >('appDisplayMode', () => 'view')
export const useAppNodeTree = () => useState<AppNode>('appNodeTree', () => ({} as AppNode))
export const useBucketRoot = () => useState<string>('bucket', () => 'docpal')
export const useLayout = () => useState<string>('layout', () => 'default')


export const useAppsProvider = () => {
    // basic state
    const displayMode = useAppDisplayMode()
    const appNodeTree = useAppNodeTree()
    const bucketRoot = useBucketRoot()
    const layout = useLayout();
    const route = useRoute()
    const router = useRouter();
    const appLoading = ref(false)
    const {canRedo, canUndo, redo, undo, commit, clear, history} = useRefHistory(appNodeTree,{
        deep:true
    })
    // apply theme to the app
    // get app data

    const { $api } = useNuxtApp()
    async function getAppData(){
        appLoading.value = true
        try {
            
            const {app} = await $api<{app: AppNode}>(`/api/apps/match?url=${route.path}`)
            if (!app) {
                throw createError({
                    statusCode: 404,
                    statusMessage: 'App not found',
                })
            }
            appNodeTree.value = app
            // check theme of the app
            nextTick(() => {
                clear()
            })
            await setupPage()
            
        } catch (error) {
            console.error(error)
            throw createError({
                statusCode: 404,
                statusMessage: 'App not found',
            })
        } finally {
            appLoading.value = false
        }
    }
    


    // function to setup which user current on
    const currentPage = ref<Page | null>(null)
    async function setupPage(){
        // step 1: get the baseurl from the appNodeTree
        const baseUrl = appNodeTree.value.baseUrl
        const routePath = route.path
        
        // step 2: check if route path starts with baseUrl
        if (!routePath.startsWith(baseUrl)) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Page not found',
            })
        }
        
        // step 3: extract relative path by removing baseUrl
        let relativePath = routePath.slice(baseUrl.length)
        // Ensure relativePath starts with / or is empty
        if (!relativePath || relativePath === '') {
            relativePath = '/'
        }
        
        // step 4: if at baseUrl root, check for homePage
        if (relativePath === '/' && appNodeTree.value.homePage) {
            router.replace(appNodeTree.value.baseUrl + '/' + appNodeTree.value.homePage);
            return
        }
        
        // step 5: find matching page by slug
        const matchingPage = appNodeTree.value.pages.find(
            page => page.slug === relativePath
        )
        
        // step 6: set currentPage or throw 404
        if (matchingPage) {
            currentPage.value = matchingPage
        } else {
            throw createError({
                statusCode: 404,
                statusMessage: 'Page not found',
            })
        }
        if (currentPage.value.layout){
            console.log("set layout", currentPage.value.layout)
            setLayout(currentPage.value.layout)
        }
    }

    async function applyPageMeta(){
        const title = currentPage.value?.title
        useHead({
            title: title,
        })
        // update page theme
        let appTheme;
        const themeName = appNodeTree.value.theme || 'default'
        try{
            const theme = await import(`~/assets/theme/${themeName}.ts`)
            appTheme =  Object.assign({},defaultTheme, theme.default)
        }catch(e){
            appTheme = defaultTheme
        }finally {
            // convert appTheme to css style and apply to :root (documentElement) to override SCSS variables
            const cssStyle = Object.entries(appTheme).map(([key, value]) => `${key}: ${value};`).join('\n')
            document.documentElement.style.cssText = cssStyle
            
        }
    }

    watch(appNodeTree, (newAppNodeTree) => {
        applyPageMeta()
    },{
        deep: true,
    })
    // call setupPage on route change
    watch(route, async(newRoute) => {
        // TODO: check if the route need to refresh
        // check new router start with baseUrl
        if (!appNodeTree.value?.baseUrl ||!newRoute.path.startsWith(appNodeTree.value.baseUrl)) {
            await getAppData();
        }
        // update appNodeTree if app changed
        await setupPage();
        applyPageMeta()
    },{
        immediate: true,
    })

    
    ///region layout functions
    function setLayout(newLayout: string){
        setPageLayout(newLayout)
        layout.value = newLayout
    }
    ///endregion layout functions


    function toggleEditMode(){
        displayMode.value = displayMode.value === 'view' ? 'edit' : 'view'
    }
    
    // Save state management
    const isSaving = ref(false)
    
    // Store the last saved state as a JSON string for comparison
    const lastSavedState = ref<string>('')
    
    // Compute if there are unsaved changes by comparing current state with last saved
    const hasUnsavedChanges = computed(() => {
        if (!lastSavedState.value) return false // No saved state yet (initial load)
        const currentState = JSON.stringify(appNodeTree.value)
        return currentState !== lastSavedState.value
    })
    
    async function saveAppNodeTree(){
        if (isSaving.value) return // Prevent concurrent saves
        
        isSaving.value = true
        try{
            await $api<{app: AppNode}>(`/api/apps/${appNodeTree.value.id}`, {
                method: 'PUT',
                body: appNodeTree.value,
            })
            
            // Update the saved state snapshot
            lastSavedState.value = JSON.stringify(appNodeTree.value)
            
            // Show success message
            ElMessage.success('App saved successfully')
        }catch(error){
            console.error('Failed to save app:', error)
            ElMessage.error('Failed to save app')
        } finally {
            isSaving.value = false
        }
    }

   
    // Initialize the saved state when app is loaded
    watch(() => appNodeTree.value.id, (newId) => {
        if (newId) {
            lastSavedState.value = JSON.stringify(appNodeTree.value)
        }
    }, { immediate: true })

    provide(AppsProvider, {
        bucketRoot,
        appNodeTree,
        setLayout,
        layout,
        appLoading,
        currentPage,
        displayMode,
        canRedo,
        canUndo,
        redo,
        undo,
        commit,
        clear,
        history: history as Ref<UseRefHistoryRecord<AppNode>[]>,
        hasUnsavedChanges,
        saveAppNodeTree,
        isSaving,
    })

}

export const useAppsContext = () => {
    const context = inject(AppsProvider)
    if (!context) {
        throw new Error('useApps must be used within AppsProvider')
    }
    return context
}