
// this should act like the router to all dynamic page and component
interface DynamicRouterContext {
    navigate: (path: string) => void
    replace: (path: string) => void
    back: () => void
    params: Ref<Record<string, string>>
    query: Ref<Record<string, string>>
    path: Ref<string>
    fullPath: Ref<string>
    host:Ref<string>
    protocol:Ref<string>
}
export const DynamicRouterProvider :InjectionKey<DynamicRouterContext> = Symbol('DynamicRouterProvider')
export const useDynamicRouter = () => {

    function replace(path: string) {
    }
    function back() {
    }
    function navigate(path: string) {
    }
    const params = ref<Record<string, string>>({})
    const query = ref<Record<string, string>>({})
    const path = ref<string>('')
    const fullPath = ref<string>('')
    const host = ref<string>('')
    const protocol = ref<string>('')

    provide(DynamicRouterProvider, {
        navigate,
        replace,
        back,
        params,
        query,
        path,
        fullPath,
        host,
        protocol,
    })

}

export const useDynamicRouterContext = () => {
    const context = inject(DynamicRouterProvider)
    if (!context) {
        throw new Error('useDynamicRouterContext must be used within DynamicRouterProvider')
    }
    return context
}