import type { WidgetConfig } from '../types'

export const DEFAULT_CONFIG: Required<WidgetConfig> = {
  wsUrl: '',
  themeColor: '#4F46E5',
  position: 'right',
  welcomeMessage: '你好！有什么可以帮助你的吗？',
  agentName: '在线客服',
  visitorId: '',
  visitorName: '访客',
}

export function mergeConfig(config: WidgetConfig): Required<WidgetConfig> {
  const visitorId = config.visitorId || generateVisitorId()
  return { ...DEFAULT_CONFIG, ...config, visitorId }
}

function generateVisitorId(): string {
  const existing = localStorage.getItem('cw_visitor_id')
  if (existing) return existing
  const newId = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
  localStorage.setItem('cw_visitor_id', newId)
  return newId
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

export function lightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const r = Math.min(255, rgb.r + (255 - rgb.r) * amount)
  const g = Math.min(255, rgb.g + (255 - rgb.g) * amount)
  const b = Math.min(255, rgb.b + (255 - rgb.b) * amount)
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}

export function darkenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const r = Math.max(0, rgb.r * (1 - amount))
  const g = Math.max(0, rgb.g * (1 - amount))
  const b = Math.max(0, rgb.b * (1 - amount))
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
