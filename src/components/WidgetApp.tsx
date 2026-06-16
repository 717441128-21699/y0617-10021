import { useEffect } from 'react'
import { useWidgetStore } from '../store/widgetStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useIndexedDB } from '../hooks/useIndexedDB'
import { BubbleButton } from './BubbleButton'
import { ChatWindow } from './ChatWindow'
import { markMessagesAsRead, getUnreadCount } from '../utils/idb'

export function WidgetApp() {
  const setOpen = useWidgetStore((s) => s.setOpen)
  const clearUnread = useWidgetStore((s) => s.clearUnread)
  const markAllAsRead = useWidgetStore((s) => s.markAllAsRead)
  const setWsSendMessage = useWidgetStore((s) => s.setWsSendMessage)

  const { sendMessage } = useWebSocket()
  useIndexedDB()

  useEffect(() => {
    setWsSendMessage(() => sendMessage)
  }, [sendMessage, setWsSendMessage])

  const handleBubbleClick = async () => {
    setOpen(true)
    clearUnread()
    markAllAsRead()
    await markMessagesAsRead('agent')
  }

  useEffect(() => {
    getUnreadCount().then((count) => {
      useWidgetStore.getState().setUnreadCount(count)
    })
  }, [])

  return (
    <>
      <BubbleButton onClick={handleBubbleClick} />
      <ChatWindow />
    </>
  )
}
