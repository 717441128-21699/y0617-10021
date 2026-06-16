import { useEffect, useRef, useCallback } from 'react'
import type { ChatMessage, WSMessage } from '../types'
import { useWidgetStore } from '../store/widgetStore'
import {
  getPendingMessages,
  addMessage as idbAddMessage,
  updateMessageStatus as idbUpdateMessageStatus,
} from '../utils/idb'

const ACK_TIMEOUT_MS = 8000

interface PendingAck {
  timeoutId: ReturnType<typeof setTimeout>
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const mountedRef = useRef(true)
  const isOpenRef = useRef(false)
  const pendingAcksRef = useRef<Map<string, PendingAck>>(new Map())
  const isFlushingRef = useRef(false)

  const wsUrl = useWidgetStore((s) => s.config.wsUrl)
  const config = useWidgetStore((s) => s.config)
  const isOpen = useWidgetStore((s) => s.isOpen)
  const setConnectionStatus = useWidgetStore((s) => s.setConnectionStatus)
  const addMessage = useWidgetStore((s) => s.addMessage)
  const updateMessageStatus = useWidgetStore((s) => s.updateMessageStatus)
  const incrementUnread = useWidgetStore((s) => s.incrementUnread)

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  const sendViaWebSocket = useCallback((message: ChatMessage) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false

    const enriched: ChatMessage = {
      ...message,
      visitorId: config.visitorId,
      visitorName: config.visitorName,
    }

    const wsMsg: WSMessage = {
      action: 'send_message',
      payload: enriched,
    }

    try {
      ws.send(JSON.stringify(wsMsg))
      return true
    } catch {
      return false
    }
  }, [config.visitorId, config.visitorName])

  const handleMessageAck = useCallback((messageId: string) => {
    const pending = pendingAcksRef.current.get(messageId)
    if (pending) {
      clearTimeout(pending.timeoutId)
      pendingAcksRef.current.delete(messageId)
    }
    updateMessageStatus(messageId, 'sent')
    idbUpdateMessageStatus(messageId, 'sent')
  }, [updateMessageStatus])

  const markMessageFailed = useCallback((messageId: string) => {
    pendingAcksRef.current.delete(messageId)
    updateMessageStatus(messageId, 'failed')
    idbUpdateMessageStatus(messageId, 'failed')
  }, [updateMessageStatus])

  const flushPendingMessages = useCallback(async () => {
    if (isFlushingRef.current) return
    isFlushingRef.current = true

    try {
      const pending = await getPendingMessages()
      for (const msg of pending) {
        if (!mountedRef.current) break
        if (wsRef.current?.readyState !== WebSocket.OPEN) break

        const success = sendViaWebSocket(msg)
        if (success) {
          updateMessageStatus(msg.id, 'sending')
          idbUpdateMessageStatus(msg.id, 'sending')

          const timeoutId = setTimeout(() => {
            markMessageFailed(msg.id)
          }, ACK_TIMEOUT_MS)
          pendingAcksRef.current.set(msg.id, { timeoutId })
        } else {
          updateMessageStatus(msg.id, 'failed')
          idbUpdateMessageStatus(msg.id, 'failed')
        }
      }
    } finally {
      isFlushingRef.current = false
    }
  }, [sendViaWebSocket, updateMessageStatus, markMessageFailed])

  const sendMessage = useCallback(
    (message: ChatMessage) => {
      const enriched: ChatMessage = {
        ...message,
        visitorId: config.visitorId,
        visitorName: config.visitorName,
      }

      addMessage(enriched)
      idbAddMessage(enriched)

      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        const success = sendViaWebSocket(enriched)
        if (success) {
          updateMessageStatus(enriched.id, 'sending')
          idbUpdateMessageStatus(enriched.id, 'sending')

          const timeoutId = setTimeout(() => {
            markMessageFailed(enriched.id)
          }, ACK_TIMEOUT_MS)
          pendingAcksRef.current.set(enriched.id, { timeoutId })
        } else {
          updateMessageStatus(enriched.id, 'failed')
          idbUpdateMessageStatus(enriched.id, 'failed')
        }
      } else {
        updateMessageStatus(enriched.id, 'failed')
        idbUpdateMessageStatus(enriched.id, 'failed')
      }
    },
    [config.visitorId, config.visitorName, addMessage, sendViaWebSocket, updateMessageStatus, markMessageFailed]
  )

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

      pendingAcksRef.current.forEach((p) => clearTimeout(p.timeoutId))
      pendingAcksRef.current.clear()

      try {
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          if (!mountedRef.current) return
          reconnectAttemptsRef.current = 0
          setConnectionStatus('connected')
          flushPendingMessages()
        }

        ws.onclose = () => {
          if (!mountedRef.current) return
          setConnectionStatus('disconnected')

          pendingAcksRef.current.forEach((p, id) => {
            clearTimeout(p.timeoutId)
            updateMessageStatus(id, 'failed')
            idbUpdateMessageStatus(id, 'failed')
          })
          pendingAcksRef.current.clear()

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

            if (data.action === 'message_ack' && 'messageId' in data.payload) {
              handleMessageAck(data.payload.messageId)
              return
            }

            if (data.action === 'message' && data.payload && 'type' in data.payload) {
              const payload = data.payload as ChatMessage
              const msg: ChatMessage = {
                ...payload,
                read: isOpenRef.current,
                status: 'sent',
              }
              addMessage(msg)
              idbAddMessage(msg)
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
      pendingAcksRef.current.forEach((p) => clearTimeout(p.timeoutId))
      pendingAcksRef.current.clear()
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [wsUrl, setConnectionStatus, addMessage, updateMessageStatus, incrementUnread, handleMessageAck, flushPendingMessages])

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    pendingAcksRef.current.forEach((p) => clearTimeout(p.timeoutId))
    pendingAcksRef.current.clear()
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
    setConnectionStatus('disconnected')
  }, [setConnectionStatus])

  return { sendMessage, disconnect }
}
