import { useWidgetStore } from '../store/widgetStore'

interface BubbleButtonProps {
  onClick: () => void
}

export function BubbleButton({ onClick }: BubbleButtonProps) {
  const unreadCount = useWidgetStore((s) => s.unreadCount)
  const config = useWidgetStore((s) => s.config)
  const isOpen = useWidgetStore((s) => s.isOpen)

  const isRight = config.position === 'right'

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        ...(isRight ? { right: 24 } : { left: 24 }),
        zIndex: 2147483647,
        display: isOpen ? 'none' : 'block',
      }}
    >
      <button
        className="cw-bubble"
        onClick={onClick}
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          backgroundColor: config.themeColor,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          position: 'relative',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)'
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>

        {unreadCount > 0 && (
          <span
            className="cw-badge-pop"
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#ef4444',
              color: 'white',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 5px',
              lineHeight: 1,
              boxShadow: '0 2px 4px rgba(239,68,68,0.4)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
