import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = 8080

interface Visitor {
  ws: WebSocket
  visitorId: string
  visitorName: string
  pendingMessages: any[]
}

interface Agent {
  ws: WebSocket
}

const visitors = new Map<string, Visitor>()
let agents: Agent[] = []
const messageHistory = new Map<string, any[]>()

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
  console.log('代理客服已连接')
  agents.push({ ws })

  ws.send(JSON.stringify({
    action: 'init',
    payload: {
      visitors: Array.from(visitors.values()).map(v => ({
        visitorId: v.visitorId,
        visitorName: v.visitorName,
        messages: messageHistory.get(v.visitorId) || [],
      })),
    },
  }))

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      if (msg.action === 'send_message' && msg.payload) {
        const { visitorId, content, type } = msg.payload
        const visitor = visitors.get(visitorId)
        if (visitor && visitor.ws.readyState === WebSocket.OPEN) {
          const chatMsg = {
            id: generateId(),
            type: type || 'text',
            content,
            sender: 'agent' as const,
            timestamp: Date.now(),
            read: false,
            status: 'sent' as const,
          }
          visitor.ws.send(JSON.stringify({
            action: 'message',
            payload: chatMsg,
          }))
          addToHistory(visitorId, chatMsg)
          broadcastToAgents({
            action: 'message',
            payload: { ...chatMsg, visitorId, visitorName: visitor.visitorName },
          })
        }
      } else if (msg.action === 'auto_reply_on' || msg.action === 'auto_reply_off') {
        broadcastToAgents(msg)
      }
    } catch (e) {
      console.error('Agent message error:', e)
    }
  })

  ws.on('close', () => {
    agents = agents.filter(a => a.ws !== ws)
    console.log('代理客服已断开')
  })
}

function handleVisitorConnection(ws: WebSocket) {
  let visitorId = ''
  let visitorName = '访客'

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      if (msg.action === 'send_message' && msg.payload) {
        const payload = msg.payload
        if (!visitorId && payload.visitorId) {
          visitorId = payload.visitorId
          visitorName = payload.visitorName || '访客'
          visitors.set(visitorId, {
            ws,
            visitorId,
            visitorName,
            pendingMessages: [],
          })
        }

        const chatMsg = {
          ...payload,
          status: 'sent' as const,
          read: true,
        }

        ws.send(JSON.stringify({
          action: 'message_ack',
          payload: { messageId: payload.id },
        }))

        console.log(`收到访客[${visitorName}(${visitorId})]消息:`, payload.type, payload.content.substring(0, 50))

        addToHistory(visitorId, chatMsg)

        broadcastToAgents({
          action: 'message',
          payload: { ...chatMsg, visitorId, visitorName },
        })

        if (autoReplyEnabled && chatMsg.type === 'text') {
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
                status: 'sent' as const,
              }
              ws.send(JSON.stringify({
                action: 'message',
                payload: agentMsg,
              }))
              addToHistory(visitorId, agentMsg)
              broadcastToAgents({
                action: 'message',
                payload: { ...agentMsg, visitorId, visitorName },
              })
              console.log(`自动回复访客[${visitorName}]:`, reply.substring(0, 50))
            }
          }, 800 + Math.random() * 1500)
        }
      }
    } catch (e) {
      console.error('Visitor message error:', e)
    }
  })

  ws.on('close', () => {
    if (visitorId) {
      console.log(`访客[${visitorName}]已断开`)
    }
  })
}

function broadcastToAgents(msg: any) {
  agents.forEach(a => {
    if (a.ws.readyState === WebSocket.OPEN) {
      a.ws.send(JSON.stringify(msg))
    }
  })
}

function addToHistory(visitorId: string, msg: any) {
  if (!messageHistory.has(visitorId)) {
    messageHistory.set(visitorId, [])
  }
  messageHistory.get(visitorId)!.push({ ...msg, visitorId })
}

function generateId(): string {
  return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

let autoReplyEnabled = true

setInterval(() => {
  console.log(`=== 服务器状态 ===`)
  console.log(`访客连接数: ${visitors.size}`)
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
})
