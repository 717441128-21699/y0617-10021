import { useEffect, useRef, useCallback } from 'react'
import type { ChatMessage, WSMessage } from '../types'
import { useWidgetStore } from '../store/widgetStore'

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const mountedRef = useRef(true)
  const isOpenRef = useRef(false)

  const wsUrl = useWidgetStore((s) => s.config.wsUrl)
  const isOpen = useWidgetStore((s) => s.isOpen)
  const setConnectionStatus = useWidgetStore((s) => s.setConnectionStatus)
  const addMessage = useWidgetStore((s) => s.addMessage)
  const incrementUnread = useWidgetStore((s) => s.incrementUnread)

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  const connectRef = useRef<() => void>(() => {})

  useEffect(() => {
    const scheduleReconnect = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      const maxDelay = 30000
      const baseDelay = 1000
      const attempts = reconnectAttemptsRef.current
      const delay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay)
      reconnectAttemptsRef.current = attempts + 1

      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setConnectionStatus('reconnecting')
          connectRef.current()
        }
      }, delay)
    }

    const connect = () => {
      const url = wsUrl
      if (!url) return
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return

      try {
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          if (!mountedRef.current) return
          reconnectAttemptsRef.current = 0
          setConnectionStatus('connected')
        }

        ws.onclose = () => {
          if (!mountedRef.current) return
          setConnectionStatus('disconnected')
          scheduleReconnect()
        }

        ws.onerror = () => {
          if (!mountedRef.current) return
          setConnectionStatus('disconnected')
        }

        ws.onmessage = (event) => {
          if (!mountedRef.current) return
          try {
            const data: WSMessage = JSON.parse(event.data)
            if (data.action === 'message' && data.payload) {
              const msg: ChatMessage = {
                ...data.payload,
                read: isOpenRef.current,
              }
              addMessage(msg)
              if (!isOpenRef.current && msg.sender === 'agent') {
                incrementUnread()
              }
            }
          } catch {
            // ignore malformed messages
          }
        }
      } catch {
        setConnectionStatus('disconnected')
        scheduleReconnect()
      }
    }

    connectRef.current = connect

    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [wsUrl, setConnectionStatus, addMessage, incrementUnread])

  const sendMessage = useCallback(
    (message: ChatMessage) => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        const wsMsg: WSMessage = {
          action: 'send_message',
          payload: message,
        }
        ws.send(JSON.stringify(wsMsg))
      }
    },
    []
  )

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
    setConnectionStatus('disconnected')
  }, [setConnectionStatus])

  return { sendMessage, disconnect }
}
