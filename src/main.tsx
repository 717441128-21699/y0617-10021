import React from 'react'
import { createRoot } from 'react-dom/client'
import { useWidgetStore } from './store/widgetStore'
import { WidgetApp } from './components/WidgetApp'
import { getWidgetCSS } from './styles'

const config = {
  wsUrl: 'ws://localhost:8080',
  themeColor: '#4F46E5',
  position: 'right' as const,
  welcomeMessage: '你好！有什么可以帮助你的吗？',
  agentName: '在线客服',
  visitorId: 'dev_visitor_' + Math.random().toString(36).slice(2, 8),
  visitorName: '开发测试用户',
}

const store = useWidgetStore.getState()
store.setConfig(config)

const hostElement = document.createElement('div')
hostElement.id = 'chat-widget-host'
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
