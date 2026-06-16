import React from 'react'
import { createRoot } from 'react-dom/client'
import { useWidgetStore } from './store/widgetStore'
import { WidgetApp } from './components/WidgetApp'
import { getWidgetCSS } from './styles'
import type { WidgetConfig } from './types'

function renderWidget(config: Required<WidgetConfig>) {
  const hostElement = document.createElement('div')
  hostElement.id = 'chat-widget-host'
  hostElement.style.cssText = 'all: initial; position: static; display: block;'
  document.body.appendChild(hostElement)

  const shadowRoot = hostElement.attachShadow({ mode: 'open' })

  const styleEl = document.createElement('style')
  styleEl.textContent = getWidgetCSS(config.themeColor)
  shadowRoot.appendChild(styleEl)

  const mountPoint = document.createElement('div')
  mountPoint.id = 'chat-widget-root'
  shadowRoot.appendChild(mountPoint)

  const root = createRoot(mountPoint)
  root.render(
    <React.StrictMode>
      <WidgetApp />
    </React.StrictMode>
  )

  return { hostElement, shadowRoot, root, styleEl }
}

let widgetInstance: {
  hostElement: HTMLDivElement
  shadowRoot: ShadowRoot
  root: ReturnType<typeof createRoot>
  styleEl: HTMLStyleElement
} | null = null

const ChatWidget = {
  init(config: WidgetConfig) {
    if (widgetInstance) {
      console.warn('ChatWidget already initialized')
      return
    }

    const store = useWidgetStore.getState()
    store.setConfig(config)

    const merged = store.config
    widgetInstance = renderWidget(merged)
  },

  destroy() {
    if (widgetInstance) {
      widgetInstance.root.unmount()
      widgetInstance.hostElement.remove()
      widgetInstance = null
    }
  },

  open() {
    useWidgetStore.getState().setOpen(true)
    useWidgetStore.getState().clearUnread()
    useWidgetStore.getState().markAllAsRead()
  },

  close() {
    useWidgetStore.getState().setOpen(false)
  },
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).ChatWidget = ChatWidget
}

export default ChatWidget
