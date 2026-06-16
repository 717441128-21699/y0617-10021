import { openDB, type IDBPDatabase } from 'idb'
import type { ChatMessage } from '../types'

const DB_NAME = 'chat_widget_db'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' })
          msgStore.createIndex('timestamp', 'timestamp')
          msgStore.createIndex('sender', 'sender')
        }
        if (!db.objectStoreNames.contains('widget_state')) {
          db.createObjectStore('widget_state', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

export async function getAllMessages(): Promise<ChatMessage[]> {
  const db = await getDB()
  const messages = await db.getAllFromIndex('messages', 'timestamp')
  return messages
}

export async function addMessage(message: ChatMessage): Promise<void> {
  const db = await getDB()
  await db.put('messages', message)
}

export async function markMessagesAsRead(sender: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('messages', 'readwrite')
  const index = tx.store.index('sender')
  let cursor = await index.openCursor(sender)
  while (cursor) {
    const msg = cursor.value
    if (!msg.read) {
      msg.read = true
      await cursor.update(msg)
    }
    cursor = await cursor.continue()
  }
  await tx.done
}

export async function getWidgetState(key: string): Promise<string | undefined> {
  const db = await getDB()
  const record = await db.get('widget_state', key)
  return record?.value
}

export async function setWidgetState(key: string, value: string): Promise<void> {
  const db = await getDB()
  await db.put('widget_state', { key, value })
}

export async function getUnreadCount(): Promise<number> {
  const db = await getDB()
  const tx = db.transaction('messages', 'readonly')
  const store = tx.store
  let count = 0
  let cursor = await store.openCursor()
  while (cursor) {
    if (cursor.value.sender === 'agent' && !cursor.value.read) {
      count++
    }
    cursor = await cursor.continue()
  }
  await tx.done
  return count
}
