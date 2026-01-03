
// this should act like the router to all dynamic page and component
interface AppRouterContext {
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

export const AppRouterProvider :InjectionKey<AppRouterContext> = Symbol('AppRouterProvider')
export const useAppRouter = () => {
    const router = useRouter()
    function replace(path: string) {
    }
    function back() {
    }
    function navigate(path: string) {
        console.log("navigate", path)
        router.push(path)
    }
    const params = ref<Record<string, string>>({})
    const query = ref<Record<string, string>>({})
    const path = ref<string>('')
    const fullPath = ref<string>('')
    const host = ref<string>('')
    const protocol = ref<string>('')

    provide(AppRouterProvider, {
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

export const useAppRouterContext = () => {
    const context = inject(AppRouterProvider)
    if (!context) {
        throw new Error('useAppRouterContext must be used within AppRouterProvider')
    }
    return context
}