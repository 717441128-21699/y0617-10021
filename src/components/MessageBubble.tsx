import type { ChatMessage } from '../types'
import { useWidgetStore } from '../store/widgetStore'

interface MessageBubbleProps {
  message: ChatMessage
  onImageClick: (src: string) => void
}

export function MessageBubble({ message, onImageClick }: MessageBubbleProps) {
  const config = useWidgetStore((s) => s.config)
  const isVisitor = message.sender === 'visitor'

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      className="cw-message-enter"
      style={{
        display: 'flex',
        justifyContent: isVisitor ? 'flex-end' : 'flex-start',
        padding: '4px 16px',
      }}
    >
      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isVisitor ? 'flex-end' : 'flex-start' }}>
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
        <span
          style={{
            fontSize: 11,
            color: '#9ca3af',
            marginTop: 4,
            padding: '0 4px',
          }}
        >
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  )
}
