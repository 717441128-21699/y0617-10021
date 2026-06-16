import { useEffect, useRef, useCallback } from 'react'
import type { ChatMessage, WSMessage, SessionHistoryPayload } from '../types'
import { useWidgetStore } from '../store/widgetStore'
import {
  getPendingMessages,
  addMessage as idbAddMessage,
  addMessageIfMissing as idbAddMessageIfMissing,
  updateMessageStatus as idbUpdateMessageStatus,
  markMessagesAsRead,
  getUnreadCount,
} from '../utils/idb'

const ACK_TIMEOUT_MS = 10000

interface PendingAck {
  timeoutId: ReturnType<typeof setTimeout>
  retried: boolean
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const mountedRef = useRef(true)
  const isOpenRef = useRef(false)
  const pendingAcksRef = useRef<Map<string, PendingAck>>(new Map())
  const isFlushingRef = useRef(false)
  const sentMessageIdsRef = useRef<Set<string>>(new Set())
  const ackedMessageIdsRef = useRef<Set<string>>(new Set())
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const localMessageIdsRef = useRef<Set<string>>(new Set())

  const wsUrl = useWidgetStore((s) => s.config.wsUrl)
  const config = useWidgetStore((s) => s.config)
  const isOpen = useWidgetStore((s) => s.isOpen)
  const setConnectionStatus = useWidgetStore((s) => s.setConnectionStatus)
  const addMessage = useWidgetStore((s) => s.addMessage)
  const updateMessageStatus = useWidgetStore((s) => s.updateMessageStatus)
  const incrementUnread = useWidgetStore((s) => s.incrementUnread)
  const setAgentTyping = useWidgetStore((s) => s.setAgentTyping)
  const setUnreadCount = useWidgetStore((s) => s.setUnreadCount)

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
    ackedMessageIdsRef.current.add(messageId)
    sentMessageIdsRef.current.add(messageId)
    updateMessageStatus(messageId, 'delivered')
    idbUpdateMessageStatus(messageId, 'delivered')
  }, [updateMessageStatus])

  const markMessageFailed = useCallback((messageId: string) => {
    if (ackedMessageIdsRef.current.has(messageId)) return
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

        if (ackedMessageIdsRef.current.has(msg.id)) {
          updateMessageStatus(msg.id, 'delivered')
          idbUpdateMessageStatus(msg.id, 'delivered')
          continue
        }

        if (sentMessageIdsRef.current.has(msg.id)) {
          const timeoutId = setTimeout(() => {
            markMessageFailed(msg.id)
          }, ACK_TIMEOUT_MS)
          pendingAcksRef.current.set(msg.id, { timeoutId, retried: false })
          continue
        }

        if (msg.status === 'pending' || msg.status === 'failed') {
          const success = sendViaWebSocket(msg)
          if (success) {
            updateMessageStatus(msg.id, 'sending')
            idbUpdateMessageStatus(msg.id, 'sending')

            sentMessageIdsRef.current.add(msg.id)
            const timeoutId = setTimeout(() => {
              markMessageFailed(msg.id)
            }, ACK_TIMEOUT_MS)
            pendingAcksRef.current.set(msg.id, { timeoutId, retried: false })
          } else {
            updateMessageStatus(msg.id, 'failed')
            idbUpdateMessageStatus(msg.id, 'failed')
          }
        } else if (msg.status === 'sending') {
          const timeoutId = setTimeout(() => {
            markMessageFailed(msg.id)
          }, ACK_TIMEOUT_MS)
          pendingAcksRef.current.set(msg.id, { timeoutId, retried: false })
        }
      }
    } finally {
      isFlushingRef.current = false
    }
  }, [sendViaWebSocket, updateMessageStatus, markMessageFailed])

  const syncUnreadFromHistory = useCallback(async (newAgentMsgCount: number) => {
    if (isOpenRef.current) {
      await markMessagesAsRead('agent')
      setUnreadCount(0)
    } else {
      const count = await getUnreadCount()
      setUnreadCount(count)
    }
  }, [setUnreadCount])

  const sendMessage = useCallback(
    (message: ChatMessage) => {
      const enriched: ChatMessage = {
        ...message,
        visitorId: config.visitorId,
        visitorName: config.visitorName,
      }

      const ws = wsRef.current
      const isOnline = ws && ws.readyState === WebSocket.OPEN

      if (isOnline) {
        enriched.status = 'sending'
      } else {
        enriched.status = 'pending'
      }

      localMessageIdsRef.current.add(enriched.id)
      addMessage(enriched)
      idbAddMessage(enriched)

      if (isOnline) {
        const success = sendViaWebSocket(enriched)
        if (success) {
          updateMessageStatus(enriched.id, 'sending')
          idbUpdateMessageStatus(enriched.id, 'sending')
          sentMessageIdsRef.current.add(enriched.id)

          const timeoutId = setTimeout(() => {
            markMessageFailed(enriched.id)
          }, ACK_TIMEOUT_MS)
          pendingAcksRef.current.set(enriched.id, { timeoutId, retried: false })
        } else {
          updateMessageStatus(enriched.id, 'pending')
          idbUpdateMessageStatus(enriched.id, 'pending')
        }
      }
    },
    [config.visitorId, config.visitorName, addMessage, sendViaWebSocket, updateMessageStatus, markMessageFailed]
  )

  const retryMessage = useCallback(
    (message: ChatMessage) => {
      if (ackedMessageIdsRef.current.has(message.id)) {
        updateMessageStatus(message.id, 'delivered')
        idbUpdateMessageStatus(message.id, 'delivered')
        return
      }

      if (sentMessageIdsRef.current.has(message.id)) {
        updateMessageStatus(message.id, 'sending')
        idbUpdateMessageStatus(message.id, 'sending')
        const timeoutId = setTimeout(() => {
          markMessageFailed(message.id)
        }, ACK_TIMEOUT_MS)
        pendingAcksRef.current.set(message.id, { timeoutId, retried: true })
        return
      }

      updateMessageStatus(message.id, 'sending')
      idbUpdateMessageStatus(message.id, 'sending')

      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        const success = sendViaWebSocket(message)
        if (success) {
          sentMessageIdsRef.current.add(message.id)
          const timeoutId = setTimeout(() => {
            markMessageFailed(message.id)
          }, ACK_TIMEOUT_MS)
          pendingAcksRef.current.set(message.id, { timeoutId, retried: true })
        } else {
          updateMessageStatus(message.id, 'failed')
          idbUpdateMessageStatus(message.id, 'failed')
        }
      } else {
        updateMessageStatus(message.id, 'pending')
        idbUpdateMessageStatus(message.id, 'pending')
      }
    },
    [sendViaWebSocket, updateMessageStatus, markMessageFailed]
  )

  const handleTypingEvent = useCallback((isTyping: boolean) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    setAgentTyping(isTyping)

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setAgentTyping(false)
      }, 5000)
    }
  }, [setAgentTyping])

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

          const initMsg: WSMessage = {
            action: 'visitor_online',
            payload: {
              visitorId: config.visitorId,
              visitorName: config.visitorName,
              online: true,
            },
          }
          try {
            ws.send(JSON.stringify(initMsg))
          } catch {}

          flushPendingMessages()
        }

        ws.onclose = () => {
          if (!mountedRef.current) return
          setConnectionStatus('disconnected')

          pendingAcksRef.current.forEach((p, id) => {
            clearTimeout(p.timeoutId)
            if (!ackedMessageIdsRef.current.has(id)) {
              updateMessageStatus(id, 'pending')
              idbUpdateMessageStatus(id, 'pending')
            }
          })
          pendingAcksRef.current.clear()
          sentMessageIdsRef.current.clear()

          setAgentTyping(false)
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
              handleMessageAck((data.payload as { messageId: string }).messageId)
              return
            }

            if (data.action === 'typing_start') {
              handleTypingEvent(true)
              return
            }

            if (data.action === 'typing_stop') {
              handleTypingEvent(false)
              return
            }

            if (data.action === 'message' && data.payload && 'type' in data.payload) {
              const payload = data.payload as ChatMessage
              if (localMessageIdsRef.current.has(payload.id)) return

              const msg: ChatMessage = {
                ...payload,
                read: isOpenRef.current,
                status: 'delivered',
              }
              localMessageIdsRef.current.add(msg.id)
              addMessage(msg)
              idbAddMessage(msg)

              setAgentTyping(false)

              if (!isOpenRef.current && msg.sender === 'agent') {
                incrementUnread()
              }
            }

            if (data.action === 'session_history' && data.payload && typeof data.payload === 'object') {
              const historyPayload = data.payload as SessionHistoryPayload
              const history = historyPayload.messages || (Array.isArray(data.payload) ? data.payload as ChatMessage[] : [])
              let newAgentMsgCount = 0

              for (const h of history) {
                if (localMessageIdsRef.current.has(h.id)) continue
                localMessageIdsRef.current.add(h.id)

                const msg: ChatMessage = {
                  ...h,
                  status: h.status || 'delivered',
                  read: isOpenRef.current,
                }

                addMessage(msg)
                idbAddMessageIfMissing(msg)

                if (msg.sender === 'agent' && !isOpenRef.current) {
                  newAgentMsgCount++
                }
              }

              if (newAgentMsgCount > 0) {
                syncUnreadFromHistory(newAgentMsgCount)
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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      pendingAcksRef.current.forEach((p) => clearTimeout(p.timeoutId))
      pendingAcksRef.current.clear()
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [wsUrl, setConnectionStatus, addMessage, updateMessageStatus, incrementUnread, handleMessageAck, handleTypingEvent, flushPendingMessages, syncUnreadFromHistory, config.visitorId, config.visitorName])

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

  return { sendMessage, retryMessage, disconnect }
}
