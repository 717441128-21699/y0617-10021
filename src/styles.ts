export function getWidgetCSS(themeColor: string): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :host {
      font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
      --cw-primary: ${themeColor};
      --cw-primary-light: ${themeColor}1a;
      --cw-primary-dark: ${themeColor}dd;
      --cw-bg: #ffffff;
      --cw-surface: #f9fafb;
      --cw-text: #1f2937;
      --cw-text-secondary: #6b7280;
      --cw-border: #e5e7eb;
      --cw-shadow: 0 4px 24px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.08);
      --cw-radius: 16px;
    }

    @keyframes cw-bubble-pulse {
      0%, 100% { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15), 0 0 0 0 var(--cw-primary); }
      50% { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15), 0 0 0 8px transparent; }
    }

    @keyframes cw-fade-in {
      from { opacity: 0; transform: translateY(8px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes cw-slide-up {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes cw-badge-pop {
      0% { transform: scale(0.5); }
      60% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    @keyframes cw-dot-pulse {
      0%, 80%, 100% { transform: scale(0); opacity: 0; }
      40% { transform: scale(1); opacity: 1; }
    }

    .cw-bubble {
      animation: cw-bubble-pulse 2.5s ease-in-out infinite;
    }
    .cw-bubble:hover {
      animation: none;
    }

    .cw-chat-window {
      animation: cw-fade-in 0.25s ease-out forwards;
    }

    .cw-message-enter {
      animation: cw-slide-up 0.25s ease-out forwards;
    }

    .cw-badge-pop {
      animation: cw-badge-pop 0.3s ease-out forwards;
    }

    .cw-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .cw-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .cw-scrollbar::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 4px;
    }
    .cw-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #9ca3af;
    }

    .cw-dot-typing span {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--cw-text-secondary);
      margin: 0 2px;
    }
    .cw-dot-typing span:nth-child(1) { animation: cw-dot-pulse 1.4s ease-in-out infinite 0s; }
    .cw-dot-typing span:nth-child(2) { animation: cw-dot-pulse 1.4s ease-in-out infinite 0.2s; }
    .cw-dot-typing span:nth-child(3) { animation: cw-dot-pulse 1.4s ease-in-out infinite 0.4s; }

    @media (max-width: 480px) {
      .cw-chat-window {
        width: 100vw !important;
        height: 100vh !important;
        max-height: 100vh !important;
        bottom: 0 !important;
        right: 0 !important;
        left: 0 !important;
        border-radius: 0 !important;
      }
    }

    img {
      max-width: 100%;
      height: auto;
    }
  `
}
