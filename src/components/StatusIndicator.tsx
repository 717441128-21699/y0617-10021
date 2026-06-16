import type { ConnectionStatus } from '../types'

interface StatusIndicatorProps {
  status: ConnectionStatus
}

const statusConfig: Record<ConnectionStatus, { color: string; label: string }> = {
  connected: { color: '#22c55e', label: '已连接' },
  reconnecting: { color: '#f59e0b', label: '重连中...' },
  disconnected: { color: '#ef4444', label: '已断开' },
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const { color, label } = statusConfig[status]
  return (
    <span
      title={label}
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 0 6px ${color}80`,
        flexShrink: 0,
      }}
    />
  )
}
