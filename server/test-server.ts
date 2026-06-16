import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = 8080

type SessionStatus = 'pending' | 'in_progress' | 'resolved'

interface VisitorSession {
  visitorId: string
  visitorName: string
  ws: WebSocket | null
  online: boolean
  lastSeen: number
  messages: any[]
  sessionStatus: SessionStatus
  messageIds: Set<string>
}

interface Agent {
  ws: WebSocket
}

const sessions = new Map<string, VisitorSession>()
let agents: Agent[] = []

const autoReplies = [
  '感谢您的咨询！请问有什么可以帮助您的？',
  '好的，我来帮您查询一下，请稍候...',
  '这个问题我们可以帮您解决，具体方案如下...',
  '请问您方便留下联系方式吗？我们的客服会尽快与您联系。',
  '您的问题已记录，我们会在 24 小时内回复。',
  '这个产品目前有优惠活动哦！您需要了解详细信息吗？',
  '很抱歉给您带来了不便，我们会立即处理这个问题。',
]

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    const agentPage = fs.readFileSync(path.join(__dirname, 'agent.html'), 'utf-8')
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(agentPage)
  } else {
    res.writeHead(404)
    res.end('Not Found')
  }
})

const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request)
  })
})

wss.on('connection', (ws, request) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`)
  const role = url.searchParams.get('role')

  if (role === 'agent') {
    handleAgentConnection(ws)
  } else {
    handleVisitorConnection(ws)
  }
})

function handleAgentConnection(ws: WebSocket) {
  console.log('客服已连接')
  agents.push({ ws })

  const visitorList = Array.from(sessions.values()).map((s) => ({
    visitorId: s.visitorId,
    visitorName: s.visitorName,
    online: s.online,
    lastSeen: s.lastSeen,
    messages: s.messages,
    lastMessage: s.messages.length > 0 ? s.messages[s.messages.length - 1] : null,
    sessionStatus: s.sessionStatus,
  }))

  ws.send(JSON.stringify({
    action: 'init',
    payload: { visitors: visitorList },
  }))

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())

      if (msg.action === 'send_message' && msg.payload) {
        const { visitorId, content, type } = msg.payload
        const session = sessions.get(visitorId)
        if (session) {
          const chatMsg = {
            id: generateId(),
            type: type || 'text',
            content,
            sender: 'agent' as const,
            timestamp: Date.now(),
            read: false,
            status: 'delivered' as const,
          }

          addMessageToSession(session, { ...chatMsg, visitorId })
          session.lastSeen = Date.now()

          if (session.ws && session.ws.readyState === WebSocket.OPEN) {
            session.ws.send(JSON.stringify({
              action: 'message',
              payload: chatMsg,
            }))
          }

          broadcastToAgents({
            action: 'message',
            payload: { ...chatMsg, visitorId, visitorName: session.visitorName },
          }, ws)
        }
      } else if (msg.action === 'session_status_update' && msg.payload) {
        const { visitorId, sessionStatus } = msg.payload
        const session = sessions.get(visitorId)
        if (session) {
          session.sessionStatus = sessionStatus
          broadcastToAgents({
            action: 'session_status',
            payload: { visitorId, sessionStatus },
          }, ws)
        }
      } else if (msg.action === 'typing_start' && msg.payload) {
        const { visitorId } = msg.payload
        const session = sessions.get(visitorId)
        if (session && session.ws && session.ws.readyState === WebSocket.OPEN) {
          session.ws.send(JSON.stringify({
            action: 'typing_start',
            payload: { sender: 'agent' },
          }))
        }
      } else if (msg.action === 'typing_stop' && msg.payload) {
        const { visitorId } = msg.payload
        const session = sessions.get(visitorId)
        if (session && session.ws && session.ws.readyState === WebSocket.OPEN) {
          session.ws.send(JSON.stringify({
            action: 'typing_stop',
            payload: { sender: 'agent' },
          }))
        }
      } else if (msg.action === 'auto_reply_on' || msg.action === 'auto_reply_off') {
        autoReplyEnabled = msg.action === 'auto_reply_on'
        broadcastToAgents(msg)
      }
    } catch (e) {
      console.error('Agent message error:', e)
    }
  })

  ws.on('close', () => {
    agents = agents.filter(a => a.ws !== ws)
    console.log('客服已断开')
  })
}

function addMessageToSession(session: VisitorSession, msg: any) {
  if (!session.messageIds.has(msg.id)) {
    session.messageIds.add(msg.id)
    session.messages.push(msg)
  }
}

function handleVisitorConnection(ws: WebSocket) {
  let visitorId = ''
  let visitorName = '访客'

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())

      if (msg.action === 'visitor_online' && msg.payload) {
        visitorId = msg.payload.visitorId || ''
        visitorName = msg.payload.visitorName || '访客'

        if (!visitorId) {
          visitorId = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
        }

        let session = sessions.get(visitorId)
        if (session) {
          session.ws = ws
          session.online = true
          session.lastSeen = Date.now()

          if (session.messages.length > 0) {
            ws.send(JSON.stringify({
              action: 'session_history',
              payload: {
                messages: session.messages,
                lastMessageId: session.messages[session.messages.length - 1]?.id,
              },
            }))
          }
        } else {
          session = {
            visitorId,
            visitorName,
            ws,
            online: true,
            lastSeen: Date.now(),
            messages: [],
            sessionStatus: 'pending',
            messageIds: new Set(),
          }
          sessions.set(visitorId, session)
        }

        broadcastToAgents({
          action: 'visitor_online',
          payload: {
            visitorId,
            visitorName,
            online: true,
            lastMessage: session.messages.length > 0 ? session.messages[session.messages.length - 1] : null,
            sessionStatus: session.sessionStatus,
          },
        })

        console.log(`访客[${visitorName}(${visitorId})]已上线`)
        return
      }

      if (msg.action === 'send_message' && msg.payload) {
        const payload = msg.payload

        if (!visitorId && payload.visitorId) {
          visitorId = payload.visitorId
          visitorName = payload.visitorName || '访客'

          let session = sessions.get(visitorId)
          if (session) {
            session.ws = ws
            session.online = true
          } else {
            sessions.set(visitorId, {
              visitorId,
              visitorName,
              ws,
              online: true,
              lastSeen: Date.now(),
              messages: [],
              sessionStatus: 'pending',
              messageIds: new Set(),
            })
          }
        }

        ws.send(JSON.stringify({
          action: 'message_ack',
          payload: { messageId: payload.id },
        }))

        console.log(`收到访客[${visitorName}(${visitorId})]消息:`, payload.type, (payload.content || '').substring(0, 50))

        const chatMsg = {
          ...payload,
          status: 'delivered' as const,
          read: true,
        }

        const session = sessions.get(visitorId)
        if (session) {
          addMessageToSession(session, { ...chatMsg, visitorId })
          session.lastSeen = Date.now()
        }

        broadcastToAgents({
          action: 'message',
          payload: { ...chatMsg, visitorId, visitorName },
        })

        if (autoReplyEnabled && chatMsg.type === 'text') {
          broadcastToAgents({
            action: 'typing_start',
            payload: { visitorId },
          })

          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              const reply = autoReplies[Math.floor(Math.random() * autoReplies.length)]
              const agentMsg = {
                id: generateId(),
                type: 'text' as const,
                content: reply,
                sender: 'agent' as const,
                timestamp: Date.now(),
                read: false,
                status: 'delivered' as const,
              }

              broadcastToAgents({
                action: 'typing_stop',
                payload: { visitorId },
              })

              ws.send(JSON.stringify({
                action: 'message',
                payload: agentMsg,
              }))

              if (session) {
                addMessageToSession(session, { ...agentMsg, visitorId })
                session.lastSeen = Date.now()
              }

              broadcastToAgents({
                action: 'message',
                payload: { ...agentMsg, visitorId, visitorName },
              })

              console.log(`自动回复访客[${visitorName}]:`, reply.substring(0, 50))
            }
          }, 1200 + Math.random() * 2000)
        }
      }
    } catch (e) {
      console.error('Visitor message error:', e)
    }
  })

  ws.on('close', () => {
    if (visitorId) {
      const session = sessions.get(visitorId)
      if (session) {
        session.ws = null
        session.online = false
        session.lastSeen = Date.now()
      }
      broadcastToAgents({
        action: 'visitor_offline',
        payload: { visitorId, visitorName },
      })
      console.log(`访客[${visitorName}]已离线`)
    }
  })
}

function broadcastToAgents(msg: any, excludeWs?: WebSocket) {
  agents.forEach(a => {
    if (a.ws !== excludeWs && a.ws.readyState === WebSocket.OPEN) {
      a.ws.send(JSON.stringify(msg))
    }
  })
}

function generateId(): string {
  return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

let autoReplyEnabled = true

setInterval(() => {
  console.log(`=== 服务器状态 ===`)
  console.log(`会话总数: ${sessions.size}`)
  console.log(`在线访客: ${Array.from(sessions.values()).filter(s => s.online).length}`)
  console.log(`客服连接数: ${agents.length}`)
  console.log(`自动回复: ${autoReplyEnabled ? '开启' : '关闭'}`)
  console.log(`==================`)
}, 10000)

server.listen(PORT, () => {
  console.log(`🚀 客服测试服务器已启动`)
  console.log(`WebSocket 端口: ${PORT}`)
  console.log(`访客连接: ws://localhost:${PORT}`)
  console.log(`客服控制台: http://localhost:${PORT}`)
  console.log(`自动回复默认开启，可在客服控制台关闭`)
  console.log('')
  console.log(`提示:`)
  console.log(`1. 先打开 http://localhost:${PORT} 作为客服端`)
  console.log(`2. 再打开 demo.html 或 dev 页面作为访客端`)
  console.log(`3. 在访客端发消息，客服端可以看到并回复`)
  console.log(`4. 断开服务器模拟断网，再重连查看自动补发`)
  console.log(`5. 客服输入时会发送 typing 事件，访客端显示输入提示`)
  console.log(`6. 可搜索/筛选访客，切换会话处理状态`)
})
