import { useCallback } from 'react'
import { useWidgetStore } from '../store/widgetStore'
import { MessageList } from './MessageList'
import { InputBar } from './InputBar'
import { ImagePreview } from './ImagePreview'
import { StatusIndicator } from './StatusIndicator'
import { generateId } from '../utils/config'
import { updateMessageStatus as idbUpdateMessageStatus } from '../utils/idb'
import type { ChatMessage } from '../types'

export function ChatWindow() {
  const config = useWidgetStore((s) => s.config)
  const connectionStatus = useWidgetStore((s) => s.connectionStatus)
  const previewImageSrc = useWidgetStore((s) => s.previewImageSrc)
  const previewImageMode = useWidgetStore((s) => s.previewImageMode)
  const isOpen = useWidgetStore((s) => s.isOpen)
  const wsSendMessage = useWidgetStore((s) => s.wsSendMessage)
  const setPreviewImage = useWidgetStore((s) => s.setPreviewImage)
  const updateMessageStatus = useWidgetStore((s) => s.updateMessageStatus)

  const isRight = config.position === 'right'

  const sendTextMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return
      const message: ChatMessage = {
        id: generateId(),
        type: 'text',
        content: text.trim(),
        sender: 'visitor',
        timestamp: Date.now(),
        read: true,
      } as ChatMessage
      wsSendMessage?.(message)
    },
    [wsSendMessage]
  )

  const sendImageMessage = useCallback(
    (dataUrl: string) => {
      const message: ChatMessage = {
        id: generateId(),
        type: 'image',
        content: dataUrl,
        sender: 'visitor',
        timestamp: Date.now(),
        read: true,
      } as ChatMessage
      wsSendMessage?.(message)
      setPreviewImage(null, null)
    },
    [wsSendMessage, setPreviewImage]
  )

  const handleRetry = useCallback(
    (message: ChatMessage) => {
      updateMessageStatus(message.id, 'sending')
      idbUpdateMessageStatus(message.id, 'sending')
      wsSendMessage?.(message)
    },
    [updateMessageStatus, wsSendMessage]
  )

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (!file.type.startsWith('image/')) return

      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        setPreviewImage(dataUrl, 'send')
      }
      reader.readAsDataURL(file)

      e.target.value = ''
    },
    [setPreviewImage]
  )

  if (!isOpen) return null

  const statusLabel: Record<string, string> = {
    connected: '已连接',
    reconnecting: '重连中...',
    disconnected: '已断开',
  }

  return (
    <div
      className="cw-chat-window"
      style={{
        position: 'fixed',
        bottom: 24,
        ...(isRight ? { right: 24 } : { left: 24 }),
        width: 380,
        height: 520,
        maxHeight: 'calc(100vh - 48px)',
        borderRadius: 'var(--cw-radius)',
        boxShadow: 'var(--cw-shadow)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        zIndex: 2147483646,
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          backgroundColor: config.themeColor,
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusIndicator status={connectionStatus} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>{config.agentName}</span>
          <span style={{ fontSize: 11, opacity: 0.75 }}>{statusLabel[connectionStatus]}</span>
        </div>
        <button
          onClick={() => useWidgetStore.getState().setOpen(false)}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: 'none',
            backgroundColor: 'rgba(255,255,255,0.15)',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <MessageList onImageClick={(src) => setPreviewImage(src, 'view')} onRetry={handleRetry} />

        {previewImageSrc && previewImageMode && (
          <ImagePreview
            mode={previewImageMode}
            onConfirm={() => sendImageMessage(previewImageSrc)}
            onCancel={() => setPreviewImage(null, null)}
          />
        )}
      </div>

      <InputBar onSendText={sendTextMessage} onImageSelect={handleImageSelect} />
    </div>
  )
}
