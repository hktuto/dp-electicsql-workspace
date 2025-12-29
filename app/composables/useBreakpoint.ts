/**
 * Global Breakpoint Composable
 * 
 * Provides responsive breakpoint detection using VueUse
 * Shared state across the entire app
 */

import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'



export function useBreakpoint() {
  const breakpoints = useBreakpoints(breakpointsTailwind)

  // Common responsive helpers
  const isMobile = breakpoints.smaller('md')
  const isTablet = breakpoints.between('md', 'lg')
  const isDesktop = breakpoints.greater('lg')
  const isMobileOrTablet = breakpoints.smaller('lg')

  return {
    // Raw breakpoints
    breakpoints,
    
    // Convenience flags
    isMobile,
    isTablet,
    isDesktop,
    isMobileOrTablet,

  }
}

