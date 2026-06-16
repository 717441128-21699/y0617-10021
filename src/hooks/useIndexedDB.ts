import { useEffect, useCallback } from 'react'
import { useWidgetStore } from '../store/widgetStore'
import type { ChatMessage } from '../types'
import {
  getAllMessages,
  addMessage as idbAddMessage,
  markMessagesAsRead,
  getUnreadCount,
} from '../utils/idb'

export function useIndexedDB() {
  const setMessages = useWidgetStore((s) => s.setMessages)
  const setUnreadCount = useWidgetStore((s) => s.setUnreadCount)

  useEffect(() => {
    getAllMessages().then((msgs) => {
      setMessages(msgs)
    })
    getUnreadCount().then((count) => {
      setUnreadCount(count)
    })
  }, [setMessages, setUnreadCount])

  const persistMessage = useCallback(async (message: ChatMessage) => {
    await idbAddMessage(message)
  }, [])

  const markAgentMessagesRead = useCallback(async () => {
    await markMessagesAsRead('agent')
  }, [])

  const refreshUnreadCount = useCallback(async () => {
    const count = await getUnreadCount()
    setUnreadCount(count)
  }, [setUnreadCount])

  return { persistMessage, markAgentMessagesRead, refreshUnreadCount }
}
