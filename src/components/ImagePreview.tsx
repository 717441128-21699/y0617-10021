import { useWidgetStore } from '../store/widgetStore'
import type { ImagePreviewMode } from '../store/widgetStore'

interface ImagePreviewProps {
  mode: ImagePreviewMode
  onConfirm: () => void
  onCancel: () => void
}

export function ImagePreview({ mode, onConfirm, onCancel }: ImagePreviewProps) {
  const previewImageSrc = useWidgetStore((s) => s.previewImageSrc)
  const config = useWidgetStore((s) => s.config)

  if (!previewImageSrc || !mode) return null

  const isSendMode = mode === 'send'

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        padding: 24,
        animation: 'cw-fade-in 0.2s ease-out',
      }}
      onClick={isSendMode ? undefined : onCancel}
    >
      <div
        style={{
          maxWidth: '100%',
          maxHeight: '70%',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <img
          src={previewImageSrc}
          alt="预览"
          style={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: 300,
            objectFit: 'contain',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        {isSendMode ? (
          <>
            <button
              onClick={onCancel}
              style={{
                padding: '8px 24px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.3)',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
              }}
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '8px 24px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: config.themeColor,
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
            >
              发送
            </button>
          </>
        ) : (
          <button
            onClick={onCancel}
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.3)',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              fontSize: 14,
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'
            }}
          >
            关闭
          </button>
        )}
      </div>
    </div>
  )
}
