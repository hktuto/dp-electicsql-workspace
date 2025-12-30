/**
 * Column Types
 * Defines all supported column types for dynamic tables
 */
export type ColumnType = 
  | 'text'          // Short text (varchar)
  | 'long_text'     // Long text (text)
  | 'number'        // Numeric value
  | 'currency'      // Currency with formatting
  | 'date'          // Date/datetime
  | 'checkbox'      // Boolean checkbox
  | 'switch'        // Boolean switch
  | 'email'         // Email with validation
  | 'phone'         // Phone with formatting
  | 'url'           // URL with validation
  | 'select'        // Single select dropdown
  | 'multi_select'  // Multiple select
  | 'color'         // Color picker
  | 'geolocation'   // Lat/long coordinates
  | 'relation'      // Foreign key relation
  | 'lookup'        // Lookup value from relation
  | 'formula'       // Computed formula
  | 'attachment'    // File attachment

/**
 * Column Configuration
 * Type-specific configuration options
 */
export interface ColumnConfig {
  // Text
  maxLength?: number
  minLength?: number
  placeholder?: string
  pattern?: string
  allowMultiLine?: boolean
  
  // Number
  min?: number
  max?: number
  decimals?: number
  prefix?: string
  suffix?: string
  
  // Date
  displayFormat?: 'date' | 'datetime' | 'time' | 'duration'
  formatString?: string
  timezone?: string
  minDate?: string
  maxDate?: string
  
  // Checkbox/Switch
  trueIcon?: string
  falseIcon?: string
  trueLabel?: string
  falseLabel?: string
  
  // Select/Multi-select
  options?: Array<{ label: string; value?: string; color?: string }>
  allowCustom?: boolean
  maxSelections?: number
  
  // Currency
  currency?: string
  symbol?: string
  symbolPosition?: 'before' | 'after'
  precision?: number
  compactDisplay?: boolean
  compactThreshold?: number
  
  // Color
  colorFormat?: 'hex' | 'rgb' | 'hsl'
  allowAlpha?: boolean
  
  // Phone
  allowCountryCode?: boolean
  limitCountries?: string[]
  
  // URL
  openInNewTab?: boolean
  
  // Relation
  targetTableId?: string
  displayColumnId?: string
  allowMultiple?: boolean
  cascadeDelete?: 'restrict' | 'cascade' | 'set_null'
  
  // Lookup
  relationColumnId?: string
  targetColumnId?: string
  
  // Formula
  formula?: string
  returnType?: 'number' | 'text' | 'date' | 'boolean'
  
  // Attachment
  showThumbnail?: boolean
  allowedTypes?: string[]
  maxSize?: number // in MB
  maxFiles?: number
  
  // Generic
  description?: string
  helpText?: string
}

/**
 * Validation Rules
 * Custom validation logic for columns
 */
export interface ValidationRules {
  required?: boolean
  unique?: boolean
  regex?: string
  custom?: string // JavaScript function as string
  errorMessage?: string
}

