import { useState, useRef } from 'react'
import { useWidgetStore } from '../store/widgetStore'

interface InputBarProps {
  onSendText: (text: string) => void
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function InputBar({ onSendText, onImageSelect }: InputBarProps) {
  const [text, setText] = useState('')
  const config = useWidgetStore((s) => s.config)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (!text.trim()) return
    onSendText(text)
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onImageSelect}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: 'none',
          backgroundColor: '#f3f4f6',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#e5e7eb'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#f3f4f6'
        }}
        title="发送图片"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </button>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-end',
          backgroundColor: '#f9fafb',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          rows={1}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            padding: '8px 12px',
            fontSize: 14,
            lineHeight: 1.5,
            resize: 'none',
            fontFamily: 'inherit',
            color: '#1f2937',
            maxHeight: 100,
          }}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 100) + 'px'
          }}
        />
      </div>

      <button
        onClick={handleSend}
        disabled={!text.trim()}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: 'none',
          backgroundColor: text.trim() ? config.themeColor : '#e5e7eb',
          cursor: text.trim() ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'opacity 0.15s, background-color 0.15s',
        }}
        onMouseEnter={(e) => {
          if (text.trim()) e.currentTarget.style.opacity = '0.9'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1'
        }}
        title="发送"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={text.trim() ? '#ffffff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  )
}
