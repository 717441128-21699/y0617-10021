import { useEffect, useRef } from 'react'
import { useWidgetStore } from '../store/widgetStore'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import type { ChatMessage } from '../types'

interface MessageListProps {
  onImageClick: (src: string) => void
  onRetry: (message: ChatMessage) => void
}

export function MessageList({ onImageClick, onRetry }: MessageListProps) {
  const messages = useWidgetStore((s) => s.messages)
  const config = useWidgetStore((s) => s.config)
  const agentTyping = useWidgetStore((s) => s.agentTyping)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, agentTyping])

  const hasWelcome = messages.length === 0

  return (
    <div
      className="cw-scrollbar"
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 0',
        backgroundColor: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {hasWelcome && <WelcomeMessage text={config.welcomeMessage} agentName={config.agentName} />}

      {messages.map((msg: ChatMessage) => (
        <MessageBubble key={msg.id} message={msg} onImageClick={onImageClick} onRetry={onRetry} />
      ))}

      <TypingIndicator />
      <div ref={endRef} />
    </div>
  )
}

function WelcomeMessage({ text, agentName }: { text: string; agentName: string }) {
  return (
    <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            color: '#1f2937',
            padding: '10px 14px',
            borderRadius: '16px 16px 16px 4px',
            fontSize: 14,
            lineHeight: 1.6,
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{agentName}</div>
          {text}
        </div>
      </div>
    </div>
  )
}
