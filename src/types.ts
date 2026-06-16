export interface WidgetConfig {
  wsUrl: string
  themeColor?: string
  position?: 'left' | 'right'
  welcomeMessage?: string
  agentName?: string
}

export interface ChatMessage {
  id: string
  type: 'text' | 'image'
  content: string
  sender: 'visitor' | 'agent'
  timestamp: number
  read: boolean
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting'

export interface WSMessage {
  action: 'message' | 'agent_joined' | 'agent_left' | 'send_message'
  payload: ChatMessage
}
