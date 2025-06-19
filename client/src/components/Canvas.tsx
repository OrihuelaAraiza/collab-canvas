// client/src/components/Canvas.tsx
import React, { useRef, useEffect, useState } from 'react'
import * as Y from 'yjs'
import { SocketIOProvider } from 'y-socket.io'
import styles from './Canvas.module.css'

interface CanvasProps {
  roomId: string
}

const Canvas: React.FC<CanvasProps> = ({ roomId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null)
  const [cursors, setCursors] = useState<
    { clientId: number; color: string; x: number; y: number }[]
  >([])
  const [copySuccess, setCopySuccess] = useState(false)

  // Initialize CRDT with room ID
  const ydoc = useRef(new Y.Doc())
  const provider = useRef(new SocketIOProvider(
    'http://localhost:4000',
    roomId, // Use the provided room ID
    ydoc.current,
    { autoConnect: true }
  ))
  const strokes = useRef(ydoc.current.getArray<{ x1: number; y1: number; x2: number; y2: number }>('strokes'))

  // Assign a random color and register in awareness
  useEffect(() => {
    const aw = provider.current.awareness
    const color = '#' + Math.floor(Math.random() * 0xffffff).toString(16)
    aw.setLocalStateField('user', { color })
  }, [])

  // 1. Setup canvas context
  useEffect(() => {
    const canvas = canvasRef.current!
    canvas.width = canvas.clientWidth * window.devicePixelRatio
    canvas.height = canvas.clientHeight * window.devicePixelRatio
    const ctx = canvas.getContext('2d')!
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.lineCap = 'round'
    ctx.lineWidth = 2
    ctx.strokeStyle = '#333'

    // Cleanup provider on unmount
    return () => {
      provider.current.destroy()
    }
  }, [])

  // 2. Listen for remote strokes and render them
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    const renderRemote = (event: Y.YArrayEvent<any>) => {
      event.changes.delta.forEach(delta => {
        if (delta.insert && Array.isArray(delta.insert)) {
          delta.insert.forEach((seg: any) => {
            ctx.beginPath()
            ctx.moveTo(seg.x1, seg.y1)
            ctx.lineTo(seg.x2, seg.y2)
            ctx.stroke()
            ctx.closePath()
          })
        }
      })
    }

    strokes.current.observe(renderRemote)
    return () => { strokes.current.unobserve(renderRemote) }
  }, [])

  // 3. Listen for remote cursors and render them
  useEffect(() => {
    const aw = provider.current.awareness
    const onChange = () => {
      const states = Array.from(aw.getStates().entries())
        .filter(([clientId, state]) => clientId !== aw.clientID && state.cursor)
        .map(([clientId, state]: any) => ({
          clientId,
          color: state.user.color,
          x: state.cursor.x,
          y: state.cursor.y,
        }))
      setCursors(states)
    }

    aw.on('change', onChange)
    return () => {
      aw.off('change', onChange)
    }
  }, [])

  // 4. When you draw, push each segment into the shared array
  const drawSegment = (x1: number, y1: number, x2: number, y2: number) => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    ctx.closePath()

    // Send to everyone else via Yjs
    strokes.current.push([{ x1, y1, x2, y2 }])
  }

  // Handle copying room code
  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy room code:', err)
    }
  }

  // === Pointer handlers ===
  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    setLastPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setIsDrawing(true)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    // Update local cursor in awareness
    const rect = canvasRef.current!.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    provider.current.awareness.setLocalStateField('cursor', { x: cx, y: cy })

    if (!isDrawing || !lastPos) return
    drawSegment(lastPos.x, lastPos.y, cx, cy)
    setLastPos({ x: cx, y: cy })
  }

  const handlePointerUp = () => {
    setIsDrawing(false)
    setLastPos(null)
    // Remove cursor when not hovering
    provider.current.awareness.setLocalStateField('cursor', null)
  }

  return (
    <div className={styles.wrapper}>
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'white',
        padding: '0.5rem',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 10
      }}>
        <span>Room: {roomId}</span>
        <button
          onClick={copyRoomCode}
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: copySuccess ? '#4CAF50' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          {copySuccess ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {/* Overlay remote cursors */}
      {cursors.map(c => (
        <div
          key={c.clientId}
          className="remote-cursor"
          style={{ 
            left: c.x, 
            top: c.y, 
            background: c.color,
            zIndex: 5
          }}
        />
      ))}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  )
}

export default Canvas
