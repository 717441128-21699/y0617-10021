import { useEffect } from 'react'
import { useWidgetStore } from '../store/widgetStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useIndexedDB } from '../hooks/useIndexedDB'
import { BubbleButton } from './BubbleButton'
import { ChatWindow } from './ChatWindow'
import { markMessagesAsRead, getUnreadCount, setChatOpenState } from '../utils/idb'

export function WidgetApp() {
  const setOpen = useWidgetStore((s) => s.setOpen)
  const clearUnread = useWidgetStore((s) => s.clearUnread)
  const markAllAsRead = useWidgetStore((s) => s.markAllAsRead)
  const setWsSendMessage = useWidgetStore((s) => s.setWsSendMessage)
  const setWsRetryMessage = useWidgetStore((s) => s.setWsRetryMessage)

  const { sendMessage, retryMessage } = useWebSocket()
  useIndexedDB()

  useEffect(() => {
    setWsSendMessage(() => sendMessage)
    setWsRetryMessage(() => retryMessage)
  }, [sendMessage, retryMessage, setWsSendMessage, setWsRetryMessage])

  const handleBubbleClick = async () => {
    setOpen(true)
    clearUnread()
    markAllAsRead()
    await markMessagesAsRead('agent')
    await setChatOpenState(true)
  }

  useEffect(() => {
    getUnreadCount().then((count) => {
      useWidgetStore.getState().setUnreadCount(count)
    })
  }, [])

  useEffect(() => {
    return useWidgetStore.subscribe((state, prevState) => {
      if (state.isOpen !== prevState.isOpen) {
        setChatOpenState(state.isOpen)
        if (state.isOpen) {
          markMessagesAsRead('agent')
          useWidgetStore.getState().clearUnread()
          useWidgetStore.getState().markAllAsRead()
        }
      }
    })
  }, [])

  return (
    <>
      <BubbleButton onClick={handleBubbleClick} />
      <ChatWindow />
    </>
  )
}
