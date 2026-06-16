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

export type SessionStatus = 'pending' | 'in_progress' | 'resolved'

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

export interface SessionStatusPayload {
  visitorId: string
  sessionStatus: SessionStatus
}

export interface SessionHistoryPayload {
  messages: ChatMessage[]
  lastMessageId?: string
}

export interface SessionNotePayload {
  visitorId: string
  note: string
}

export interface SessionTagsPayload {
  visitorId: string
  tags: string[]
}

export interface SessionClaimPayload {
  visitorId: string
  agentId: string
  agentName: string
  action: 'claim' | 'release'
}

export interface WSMessage {
  action:
    | 'message'
    | 'agent_joined'
    | 'agent_left'
    | 'send_message'
    | 'message_ack'
    | 'typing_start'
    | 'typing_stop'
    | 'visitor_online'
    | 'visitor_offline'
    | 'session_history'
    | 'session_status_update'
    | 'session_status'
    | 'session_note_update'
    | 'session_note'
    | 'session_tags_update'
    | 'session_tags'
    | 'session_claim'
    | 'session_claim_update'
  payload:
    | ChatMessage
    | { messageId: string }
    | TypingPayload
    | { visitorId: string; visitorName: string; online: boolean; lastMessage?: ChatMessage }
    | SessionHistoryPayload
    | SessionStatusPayload
    | SessionNotePayload
    | SessionTagsPayload
    | SessionClaimPayload
    | { visitorId: string; claimedBy: string | null; claimedByName: string | null }
}
