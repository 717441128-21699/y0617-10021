import { create } from 'zustand'
import type { ChatMessage, ConnectionStatus, MessageStatus, WidgetConfig } from '../types'
import { mergeConfig } from '../utils/config'

export type ImagePreviewMode = 'send' | 'view' | null

interface WidgetState {
  config: Required<WidgetConfig>
  messages: ChatMessage[]
  isOpen: boolean
  unreadCount: number
  connectionStatus: ConnectionStatus
  previewImageSrc: string | null
  previewImageMode: ImagePreviewMode
  wsSendMessage: ((message: ChatMessage) => void) | null

  setConfig: (config: WidgetConfig) => void
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  updateMessageStatus: (id: string, status: MessageStatus) => void
  setOpen: (open: boolean) => void
  setUnreadCount: (count: number) => void
  incrementUnread: () => void
  clearUnread: () => void
  setConnectionStatus: (status: ConnectionStatus) => void
  setPreviewImage: (src: string | null, mode: ImagePreviewMode) => void
  markAllAsRead: () => void
  setWsSendMessage: (fn: ((message: ChatMessage) => void) | null) => void
}

export const useWidgetStore = create<WidgetState>((set) => ({
  config: mergeConfig({ wsUrl: '' }),
  messages: [],
  isOpen: false,
  unreadCount: 0,
  connectionStatus: 'disconnected',
  previewImageSrc: null,
  previewImageMode: null,
  wsSendMessage: null,

  setConfig: (config) =>
    set({ config: mergeConfig(config) }),

  setMessages: (messages) =>
    set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessageStatus: (id, status) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, status } : m
      ),
    })),

  setOpen: (open) =>
    set({ isOpen: open }),

  setUnreadCount: (count) =>
    set({ unreadCount: count }),

  incrementUnread: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),

  clearUnread: () =>
    set({ unreadCount: 0 }),

  setConnectionStatus: (status) =>
    set({ connectionStatus: status }),

  setPreviewImage: (src, mode) =>
    set({ previewImageSrc: src, previewImageMode: src ? mode : null }),

  markAllAsRead: () =>
    set((state) => ({
      messages: state.messages.map((m) => ({ ...m, read: true })),
    })),

  setWsSendMessage: (fn) =>
    set({ wsSendMessage: fn }),
}))
