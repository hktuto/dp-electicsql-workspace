import type { AppTheme } from "~/utils/type/apps";

export default {
    // vueuse safe area
    "--vueuse-safe-area-top": "env(safe-area-inset-top, 0px)",
    "--vueuse-safe-area-right": "env(safe-area-inset-right, 0px)",
    "--vueuse-safe-area-bottom": "env(safe-area-inset-bottom, 0px)",
    "--vueuse-safe-area-left": "env(safe-area-inset-left, 0px)",
    
    
    "--app-primary-h": "173",
    "--app-primary-s": "82%",
    "--app-primary-l": "42%",

    "--app-accent-color": "#0077ff",
  /* Success Color (Blue) - #0077ff */
  // 119, 93%, 42%
    "--app-success-h": "119",
    "--app-success-s": "93%",
    "--app-success-l": "42%",

  /* Warning Color (Orange) - #e6a23c */
    "--app-warning-h": "36",
    "--app-warning-s": "77%",
    "--app-warning-l": "57%",

  /* Danger/Error Color (Red) - #f56c6c */
    "--app-danger-h": "0",
    "--app-danger-s": "87%",
    "--app-danger-l": "69%",

    "--app-error-h": "0",
    "--app-error-s": "87%",
    "--app-error-l": "69%",

    "--app-info-h": "220",
    "--app-info-s": "4%",
    "--app-info-l": "58%",

    "--app-grey-hue": "200",
    "--app-grey-saturation": "25%",

    "--app-custom-font": "Roboto",

    "--transparent-factor": "2",

    "--app-font-size-xxs": "0.5rem",
    "--app-font-size-xs": "0.6rem",
    "--app-font-size-s": "0.75rem",
    "--app-font-size-m": "1rem",
    "--app-font-size-l": "1.2rem",
    "--app-font-size-xl": "1.5rem",
    "--app-font-size-xxl": "2rem",
    "--app-line-height": "1.2",
    "--app-font-weight": "400",
    "--app-font-weight-title": "900",

    "--app-border-radius-s": "0.4rem",
    "--app-border-radius-m": "0.6rem",
    "--app-border-radius-l": "1.2rem",
    "--app-border-radius-xl": "2rem",
    "--app-border-radius-xxl": "4rem",

    "--app-content-max-width": "800px",
    "--app-space-xxs": "0.2rem",
    "--app-space-xs": "0.4rem",
    "--app-space-s": "0.8rem",
    "--app-space-m": "1.2rem",
    "--app-space-l": "2.4rem",
    "--app-space-xl": "3.6rem",
    "--app-space-xxl": "4.8rem",

    "--app-shadow-s": "0 1px 2px 0 rgba(0, 0, 0, 0.02), 0 2px 4px rgba(0, 0, 0, 0.01)",
    "--app-shadow-m": "0 1px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)",
    "--app-shadow-l": "0 1px 15px -3px rgba(0, 0, 0, 0.2), 0 2px 6px -2px rgba(0, 0, 0, 0.1)",
    "--app-shadow-xl": "0 2px 25px -5px rgba(0, 0, 0, 0.4), 0 3px 10px -5px rgba(0, 0, 0, 0.1), 0 2px 6px -2px rgba(0, 0, 0, 0.05)",
} as AppTheme