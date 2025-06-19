// server/src/index.ts
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server as IOServer } from 'socket.io'
import { YSocketIO } from 'y-socket.io/dist/server'
import * as Y from 'yjs'

const app = express()
app.use(cors())

const httpServer = createServer(app)
const io = new IOServer(httpServer, { cors: { origin: '*' } })

// wire up Yjs CRDT on the Socket.IO server
const ysocketio = new YSocketIO(io, { gcEnabled: true })
ysocketio.initialize()

// ← Notice the added `next: NextFunction` and the block body
app.get(
  '/',
  (req: Request, res: Response, next: NextFunction): void => {
    res.send('🖌️ Collaborative Canvas CRDT Server')
  }
)

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () =>
  console.log(`🚀 CRDT server listening on http://localhost:${PORT}`)
)