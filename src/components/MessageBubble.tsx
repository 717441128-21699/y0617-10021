import type { ChatMessage } from '../types'
import { useWidgetStore } from '../store/widgetStore'

interface MessageBubbleProps {
  message: ChatMessage
  onImageClick: (src: string) => void
  onRetry?: (message: ChatMessage) => void
}

export function MessageBubble({ message, onImageClick, onRetry }: MessageBubbleProps) {
  const config = useWidgetStore((s) => s.config)
  const isVisitor = message.sender === 'visitor'

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusIcon = () => {
    if (!isVisitor) return null

    switch (message.status) {
      case 'sending':
        return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.7, animation: 'cw-rotate 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )
      case 'sent':
        return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )
      case 'failed':
        return (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation()
              onRetry?.(message)
            }}
          >
            <title>发送失败，点击重试</title>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )
      default:
        return null
    }
  }

  const bubbleOpacity = message.status === 'sending' ? 0.6 : message.status === 'failed' ? 0.8 : 1

  return (
    <div
      className="cw-message-enter"
      style={{
        display: 'flex',
        justifyContent: isVisitor ? 'flex-end' : 'flex-start',
        padding: '4px 16px',
      }}
    >
      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isVisitor ? 'flex-end' : 'flex-start', opacity: bubbleOpacity }}>
        {message.type === 'text' ? (
          <div
            style={{
              backgroundColor: isVisitor ? config.themeColor : '#ffffff',
              color: isVisitor ? '#ffffff' : '#1f2937',
              padding: '10px 14px',
              borderRadius: isVisitor ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              fontSize: 14,
              lineHeight: 1.6,
              wordBreak: 'break-word',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            {message.content}
          </div>
        ) : (
          <div
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              cursor: 'pointer',
              maxWidth: 200,
              transition: 'transform 0.15s ease',
            }}
            onClick={() => onImageClick(message.content)}
          >
            <img
              src={message.content}
              alt="图片消息"
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: 180,
                objectFit: 'cover',
              }}
            />
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 4,
            padding: '0 4px',
            color: message.status === 'failed' ? '#ef4444' : '#9ca3af',
          }}
        >
          <span style={{ fontSize: 11 }}>
            {formatTime(message.timestamp)}
          </span>
          {getStatusIcon()}
        </div>
      </div>
    </div>
  )
}
