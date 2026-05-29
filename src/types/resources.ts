import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type ResourceRecord = Record<string, unknown>

export type StaticOption = {
  label: string
  value: string | number
}

export type ResourceFieldConfig = {
  name: string
  label: string
  type: 'text' | 'email' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'time'
  required?: boolean
  placeholder?: string
  description?: string
  nullable?: boolean
  min?: number
  max?: number
  step?: string
  options?: StaticOption[]
  optionsEndpoint?: string
  getOptionLabel?: (item: ResourceRecord) => string
  optionValueKey?: string
  valueType?: 'string' | 'number' | 'boolean'
  fullWidth?: boolean
}

export type ResourceColumnConfig = {
  key: string
  header: string
  render?: (item: ResourceRecord) => ReactNode
}

export type ResourceConfig = {
  key: string
  route: string
  title: string
  eyebrow: string
  description: string
  endpoint: string
  searchPlaceholder: string
  icon: LucideIcon
  accent: string
  columns: ResourceColumnConfig[]
  fields: ResourceFieldConfig[]
  initialValues: Record<string, string | boolean>
}

export type NavigationItem = {
  allowedRoleCodes?: string[]
  label: string
  path: string
  icon: LucideIcon
  children?: NavigationItem[]
}

export type NavigationSection = {
  label: string
  items: NavigationItem[]
}

export type ModuleCard = {
  title: string
  subtitle: string
  path: string
  accent: string
  icon: LucideIcon
  chips: string[]
  allowedRoleCodes?: string[]
}
