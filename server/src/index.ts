// server/src/index.ts
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server as IOServer } from 'socket.io'
import { YSocketIO } from 'y-socket.io/dist/server'
import { RedisPersistence } from 'y-redis'
import * as Y from 'yjs'

const app = express()
app.use(cors())

const httpServer = createServer(app)
const io = new IOServer(httpServer, { cors: { origin: '*' } })

// Redis configuration
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const persistence = new RedisPersistence({ redisOpts: { url: redisUrl } })

// This is where the magic happens
const ysocketio = new YSocketIO(io)
ysocketio.initialize()

const documents = new Map<string, Y.Doc>()

function getDocument(docName: string): Y.Doc {
  let doc = documents.get(docName)

  if (doc) {
    return doc
  }

  const newDoc = new Y.Doc()
  documents.set(docName, newDoc)

  // For more information on how to use the persistence object,
  // see the y-redis documentation
  // https://github.com/yjs/y-redis

  return newDoc
}

const voiceChatUsers: { [key: string]: string[] } = {}

io.on('connection', socket => {
  socket.on('join-voice', (roomId: string) => {
    if (voiceChatUsers[roomId]) {
      voiceChatUsers[roomId].push(socket.id)
    } else {
      voiceChatUsers[roomId] = [socket.id]
    }
    const usersInThisRoom = voiceChatUsers[roomId].filter(id => id !== socket.id)
    socket.emit('all-users', usersInThisRoom)
  })
  
  socket.on('sending-signal', (payload: any) => {
    io.to(payload.userToSignal).emit('user-joined', { signal: payload.signal, callerID: payload.callerID })
  })
  
  socket.on('returning-signal', (payload: any) => {
    io.to(payload.callerID).emit('receiving-returned-signal', { signal: payload.signal, id: socket.id })
  })
  
  socket.on('disconnect', () => {
    for (const roomId in voiceChatUsers) {
      voiceChatUsers[roomId] = voiceChatUsers[roomId].filter(id => id !== socket.id)
    }
  })
})

app.get(
  '/',
  (req: Request, res: Response, next: NextFunction): void => {
    res.send('🖌️ Collaborative Canvas CRDT Server with Redis')
  }
)

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () =>
  console.log(`🚀 CRDT server with Redis listening on http://localhost:${PORT}`)
)