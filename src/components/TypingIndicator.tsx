import { useWidgetStore } from '../store/widgetStore'

export function TypingIndicator() {
  const agentTyping = useWidgetStore((s) => s.agentTyping)
  const config = useWidgetStore((s) => s.config)

  if (!agentTyping) return null

  return (
    <div
      className="cw-message-enter"
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        padding: '4px 16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '10px 16px',
          borderRadius: '16px 16px 16px 4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 13, color: '#6b7280' }}>{config.agentName}正在输入</span>
        <span className="cw-dot-typing">
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  )
}
