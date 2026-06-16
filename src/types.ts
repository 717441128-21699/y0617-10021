export interface WidgetConfig {
  wsUrl: string
  themeColor?: string
  position?: 'left' | 'right'
  welcomeMessage?: string
  agentName?: string
  visitorId?: string
  visitorName?: string
}

export type MessageStatus = 'pending' | 'sending' | 'delivered' | 'failed'

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

export interface TypingPayload {
  sender: 'agent'
  visitorId?: string
}

export interface WSMessage {
  action: 'message' | 'agent_joined' | 'agent_left' | 'send_message' | 'message_ack' | 'typing_start' | 'typing_stop' | 'visitor_online' | 'visitor_offline' | 'session_history'
  payload: ChatMessage | { messageId: string } | TypingPayload | { visitorId: string; visitorName: string; online: boolean; lastMessage?: ChatMessage } | ChatMessage[]
}
