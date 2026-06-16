export interface WidgetConfig {
  wsUrl: string
  themeColor?: string
  position?: 'left' | 'right'
  welcomeMessage?: string
  agentName?: string
  visitorId?: string
  visitorName?: string
}

export type MessageStatus = 'sending' | 'sent' | 'failed'

export interface ChatMessage {
  id: string
  type: 'text' | 'image'
  content: string
  sender: 'visitor' | 'agent'
  timestamp: number
  read: boolean
  status: MessageStatus
  visitorId?: string
  visitorName?: string
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting'

export interface WSMessage {
  action: 'message' | 'agent_joined' | 'agent_left' | 'send_message' | 'message_ack'
  payload: ChatMessage | { messageId: string }
}
