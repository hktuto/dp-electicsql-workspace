import type { UseFetchOptions } from 'nuxt/app'
import type { FetchError } from 'ofetch'

/**
 * Custom API error interface
 */
export interface APIError {
  message: string
  statusCode: number
  statusMessage?: string
  stack?: string[]
}

/**
 * Extended options for useAPI
 */
export interface UseAPIOptions<T> extends UseFetchOptions<T> {
  /**
   * Skip automatic redirect to login on 401 errors
   * Useful when checking auth status or handling errors manually
   */
  skipAuthRedirect?: boolean
  /**
   * Skip all global error handling (401 redirect, 403/500 hooks)
   * Useful when you want to handle all errors yourself
   */
  skipAllErrors?: boolean
}

// Custom headers (must match plugin)
const SKIP_AUTH_HEADER = 'x-skip-auth-redirect'
const SKIP_ALL_ERRORS_HEADER = 'x-skip-all-errors'

/**
 * Custom useAPI composable
 * 
 * Wraps useFetch with our custom $api instance that includes:
 * - Global error handling
 * - Automatic base URL (/api)
 * - Option to skip auth redirect
 * - TypeScript support
 * 
 * @example
 * // GET request
 * const { data, error, pending } = await useAPI<User>('/auth/me')
 * 
 * // POST request
 * const { data } = await useAPI('/auth/login', {
 *   method: 'POST',
 *   body: { email, password }
 * })
 * 
 * // Skip auth redirect on 401
 * const { data } = await useAPI('/auth/check', {
 *   skipAuthRedirect: true
 * })
 * 
 * @see https://nuxt.com/docs/4.x/guide/recipes/custom-usefetch
 */
export function useAPI<T>(
  url: string | (() => string),
  options?: UseAPIOptions<T>,
) {
  const { skipAuthRedirect, skipAllErrors, ...fetchOptions } = options || {}

  // Add skip headers if requested
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  }
  
  if (skipAllErrors) {
    headers[SKIP_ALL_ERRORS_HEADER] = 'true'
  } else if (skipAuthRedirect) {
    headers[SKIP_AUTH_HEADER] = 'true'
  }

  return useFetch(url, {
    ...fetchOptions,
    headers,
    $fetch: useNuxtApp().$api,
  } as Parameters<typeof useFetch>[1])
}

/**
 * Options for direct $api calls
 */
export interface APICallOptions extends Omit<Parameters<typeof $fetch>[1], 'headers'> {
  /**
   * Skip automatic redirect to login on 401 errors
   */
  skipAuthRedirect?: boolean
  /**
   * Skip all global error handling
   */
  skipAllErrors?: boolean
  headers?: Record<string, string>
}

/**
 * Direct API call without reactivity
 * 
 * Use this for non-reactive API calls (e.g., form submissions)
 * 
 * @example
 * // Normal call
 * const result = await $api<User>('/auth/me')
 * 
 * // Skip auth redirect
 * const result = await $api<User>('/auth/check', {
 *   skipAuthRedirect: true
 * })
 * 
 * // Skip all error handling
 * const result = await $api<Data>('/some/endpoint', {
 *   skipAllErrors: true
 * })
 */
export function $api<T>(
  url: string,
  options?: APICallOptions,
): Promise<T> {
  const { skipAuthRedirect, skipAllErrors, ...fetchOptions } = options || {}

  // Add skip headers if requested
  const headers: Record<string, string> = {
    ...fetchOptions.headers,
  }
  
  if (skipAllErrors) {
    headers[SKIP_ALL_ERRORS_HEADER] = 'true'
  } else if (skipAuthRedirect) {
    headers[SKIP_AUTH_HEADER] = 'true'
  }

  return useNuxtApp().$api<T>(url, { ...fetchOptions, headers })
}
