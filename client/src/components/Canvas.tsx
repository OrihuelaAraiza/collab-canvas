// client/src/components/Canvas.tsx
import React, { useRef, useEffect, useState } from 'react'
import * as Y from 'yjs'
import { SocketIOProvider } from 'y-socket.io'
import { type Socket } from 'socket.io-client'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { saveAs } from 'file-saver'
import toast from 'react-hot-toast'
import styles from './Canvas.module.css'
import { DrawingToolbar } from './DrawingToolbar'
import VoiceChat from './VoiceChat'
import { HeaderActions } from './layout/HeaderActions'

export interface CanvasHandles {
  onUndo: () => void
  onRedo: () => void
  onCopy: () => void
  onExportPNG: () => Promise<void>
  onExportPDF: () => Promise<void>
  onClear: () => void
}

interface CanvasProps {
  roomId: string
  onLoad?: (handles: CanvasHandles) => void
}

// Define the types for our collaborative objects
type Stroke = { 
  type: 'stroke',
  points: { x: number, y: number }[],
  color: string, 
  thickness: number,
  timestamp: number
}
type Rectangle = { 
  type: 'rectangle',
  x: number, y: number, 
  width: number, height: number,
  color: string,
  thickness: number
}
type Circle = { 
  type: 'circle',
  x: number, y: number,
  radius: number,
  color: string,
  thickness: number
}

type ErasePath = {
  type: 'erase'
  points: { x: number, y: number }[]
  thickness: number
}

type TextObject = {
  type: 'text',
  x: number,
  y: number,
  text: string,
  color: string,
  fontSize: number
}

type CanvasObject = Stroke | Rectangle | Circle | ErasePath | TextObject

function usePlaybackController(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  strokes: CanvasObject[]
) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackIndex, setPlaybackIndex] = useState(0)
  const [speed, setSpeed] = useState(1)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Sort all objects by timestamp for playback (fallback to 0 if missing)
  const orderedObjects = strokes
    .filter((obj: CanvasObject) =>
      obj.type === 'stroke' || obj.type === 'rectangle' || obj.type === 'circle' || obj.type === 'erase' || obj.type === 'text')
    .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0))

  useEffect(() => {
    const playBtn = document.getElementById('playback-play') as HTMLButtonElement | null
    const pauseBtn = document.getElementById('playback-pause') as HTMLButtonElement | null
    const speedSel = document.getElementById('playback-speed') as HTMLSelectElement | null
    if (playBtn) playBtn.onclick = () => { setIsPlaying(true); setPlaybackIndex(0) }
    if (pauseBtn) pauseBtn.onclick = () => setIsPlaying(false)
    if (speedSel) speedSel.onchange = (e: Event) => setSpeed(Number((e.target as HTMLSelectElement).value))
    return () => {
      if (playBtn) playBtn.onclick = null
      if (pauseBtn) pauseBtn.onclick = null
      if (speedSel) speedSel.onchange = null
    }
  }, [])

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    if (playbackIndex >= orderedObjects.length) {
      setIsPlaying(false)
      return
    }
    // Clear canvas
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // Draw up to current index
    for (let i = 0; i <= playbackIndex; i++) {
      const obj = orderedObjects[i]
      // ---- set paint mode ---------------------------------------------------
      if (obj.type === 'erase') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = obj.thickness
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      } else {
        ctx.globalCompositeOperation = 'source-over'
        if (obj.type !== 'text') {
          ctx.strokeStyle = obj.color
          ctx.lineWidth  = obj.thickness
          ctx.lineCap    = 'round'
          ctx.lineJoin   = 'round'
        }
      }
      // ---- draw the object ---------------------------------------------------
      switch (obj.type) {
        case 'stroke':
        case 'erase': {
          ctx.beginPath()
          obj.points.forEach((p: {x: number, y: number}, j: number) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
          ctx.stroke()
          break
        }
        case 'rectangle':
          ctx.strokeRect(obj.x, obj.y, obj.width, obj.height)
          break
        case 'circle':
          ctx.beginPath()
          ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI)
          ctx.stroke()
          break
        case 'text':
          ctx.save()
          ctx.font = `${obj.fontSize || 24}px sans-serif`
          ctx.fillStyle = obj.color
          ctx.textBaseline = 'top'
          ctx.fillText(obj.text, obj.x, obj.y)
          ctx.restore()
          break
      }
    }
    timerRef.current = setTimeout(() => {
      setPlaybackIndex(idx => idx + 1)
    }, 200 / speed)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [isPlaying, playbackIndex, speed, orderedObjects, canvasRef])

  return { isPlaying, setIsPlaying, playbackIndex, setPlaybackIndex, speed, setSpeed }
}

const Canvas: React.FC<CanvasProps> = ({ roomId, onLoad }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [currentStrokePoints, setCurrentStrokePoints] = useState<{x: number, y: number}[]>([])
  const [cursors, setCursors] = useState<
    { clientId: number; color: string; x: number; y: number }[]
  >([])
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#000000')
  const [thickness, setThickness] = useState(5)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [textInput, setTextInput] = useState<{ x: number, y: number } | null>(null)
  const [textValue, setTextValue] = useState('')
  const [hoverPos, setHoverPos] = useState<{ x: number, y: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [pendingTextInput, setPendingTextInput] = useState<{ x: number, y: number } | null>(null)

  // Initialize CRDT with room ID
  const ydoc = useRef(new Y.Doc())
  const provider = useRef<SocketIOProvider | null>(null)
  const canvasObjects = useRef(ydoc.current.getArray<CanvasObject>('canvas-objects'))
  const undoManager = useRef(new Y.UndoManager(canvasObjects.current))

  // Assign a random color and register in awareness
  useEffect(() => {
    const aw = provider.current?.awareness
    const userColor = '#' + Math.floor(Math.random() * 0xffffff).toString(16)
    aw?.setLocalStateField('user', { color: userColor })
    setColor(userColor) // Start with the user's random color
  }, [])

  // Canvas setup useEffect
  useEffect(() => {
    const canvas = canvasRef.current!
    const previewCanvas = previewCanvasRef.current!
    
    // Set dimensions for both canvases
    const setCanvasSize = () => {
      const { clientWidth, clientHeight } = canvas.parentElement!
      const dpr = window.devicePixelRatio || 1
      
      canvas.width = clientWidth * dpr
      canvas.height = clientHeight * dpr
      previewCanvas.width = clientWidth * dpr
      previewCanvas.height = clientHeight * dpr
      
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      
      const previewCtx = previewCanvas.getContext('2d')!
      previewCtx.scale(dpr, dpr)
    }
    
    setCanvasSize()
    window.addEventListener('resize', setCanvasSize)
    
    // Cleanup provider on unmount
    return () => {
      window.removeEventListener('resize', setCanvasSize)
      provider.current?.destroy()
    }
  }, [])

  // 2. Listen for remote objects and render them
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    const renderObjects = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      canvasObjects.current.forEach(obj => {
        // ---- set paint mode ---------------------------------------------------
        if (obj.type === 'erase') {
          ctx.globalCompositeOperation = 'destination-out'
          ctx.lineWidth = obj.thickness
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
        } else {
          ctx.globalCompositeOperation = 'source-over'
          if (obj.type !== 'text') {
            ctx.strokeStyle = obj.color
            ctx.lineWidth  = obj.thickness
            ctx.lineCap    = 'round'
            ctx.lineJoin   = 'round'
          }
        }

        // ---- draw the object ---------------------------------------------------
        switch (obj.type) {
          case 'stroke':
          case 'erase': {
            ctx.beginPath()
            obj.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
            ctx.stroke()
            break
          }
          case 'rectangle':
            ctx.strokeRect(obj.x, obj.y, obj.width, obj.height)
            break
          case 'circle':
            ctx.beginPath()
            ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI)
            ctx.stroke()
            break
          case 'text':
            ctx.save()
            ctx.font = `${obj.fontSize || 24}px sans-serif`
            ctx.fillStyle = obj.color
            ctx.textBaseline = 'top'
            ctx.fillText(obj.text, obj.x, obj.y)
            ctx.restore()
            break
        }
      })

      // always restore normal mode at the end
      ctx.globalCompositeOperation = 'source-over'
    }
    
    renderObjects() // Initial render
    canvasObjects.current.observe(renderObjects)
    return () => { canvasObjects.current.unobserve(renderObjects) }
  }, [])

  // 3. Listen for remote cursors and render them
  useEffect(() => {
    const aw = provider.current?.awareness
    const onChange = () => {
      const states = Array.from(aw?.getStates().entries() || [])
        .filter(([clientId, state]) => clientId !== aw?.clientID && state.cursor)
        .map(([clientId, state]: any) => ({
          clientId,
          color: state.user.color,
          x: state.cursor.x,
          y: state.cursor.y,
        }))
      setCursors(states)
    }

    aw?.on('change', onChange)
    return () => {
      aw?.off('change', onChange)
    }
  }, [])

  useEffect(() => {
    const p = new SocketIOProvider(
      'http://localhost:4000',
      roomId,
      ydoc.current,
      { autoConnect: true }
    )
    provider.current = p
    setSocket(p.socket)

    // ... (rest of useEffect for awareness)
  }, [roomId])

  // Handle copying room code
  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      toast.success('Room ID copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy room code.')
      console.error('Failed to copy room code:', err)
    }
  }

  // Export current canvas + cursors as a PNG
  const exportPNG = async () => {
    if (!canvasRef.current) return
    try {
      // Get the canvas data as an image
      const canvasDataURL = canvasRef.current.toDataURL('image/png')
      
      // Create a temporary container for export
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '-9999px'
      tempContainer.style.width = canvasRef.current.width + 'px'
      tempContainer.style.height = canvasRef.current.height + 'px'
      tempContainer.style.backgroundColor = '#ffffff'
      
      // Create an image from the canvas data
      const canvasImage = document.createElement('img')
      canvasImage.src = canvasDataURL
      canvasImage.style.width = '100%'
      canvasImage.style.height = '100%'
      canvasImage.style.display = 'block'
      tempContainer.appendChild(canvasImage)
      
      // Add cursors as simple colored divs
      cursors.forEach(cursor => {
        const cursorDiv = document.createElement('div')
        cursorDiv.style.position = 'absolute'
        cursorDiv.style.left = cursor.x + 'px'
        cursorDiv.style.top = cursor.y + 'px'
        cursorDiv.style.width = '10px'
        cursorDiv.style.height = '10px'
        cursorDiv.style.backgroundColor = cursor.color
        cursorDiv.style.borderRadius = '50%'
        cursorDiv.style.pointerEvents = 'none'
        cursorDiv.style.zIndex = '10'
        tempContainer.appendChild(cursorDiv)
      })
      
      document.body.appendChild(tempContainer)
      
      // Wait for the image to load before capturing
      await new Promise((resolve) => {
        canvasImage.onload = resolve
      })
      
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#ffffff',
        scale: 1,
        logging: false,
        useCORS: true,
        allowTaint: true
      })
      
      document.body.removeChild(tempContainer)
      
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `canvas-${roomId}.png`)
        }
      }, 'image/png')
    } catch (error) {
      console.error('Export PNG failed:', error)
      alert('Failed to export PNG. Please try again.')
    }
  }

  // Export as a single-page PDF
  const exportPDF = async () => {
    if (!canvasRef.current) return
    try {
      // Get the canvas data as an image
      const canvasDataURL = canvasRef.current.toDataURL('image/png')
      
      // Create a temporary container for export
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '-9999px'
      tempContainer.style.width = canvasRef.current.width + 'px'
      tempContainer.style.height = canvasRef.current.height + 'px'
      tempContainer.style.backgroundColor = '#ffffff'
      
      // Create an image from the canvas data
      const canvasImage = document.createElement('img')
      canvasImage.src = canvasDataURL
      canvasImage.style.width = '100%'
      canvasImage.style.height = '100%'
      canvasImage.style.display = 'block'
      tempContainer.appendChild(canvasImage)
      
      // Add cursors as simple colored divs
      cursors.forEach(cursor => {
        const cursorDiv = document.createElement('div')
        cursorDiv.style.position = 'absolute'
        cursorDiv.style.left = cursor.x + 'px'
        cursorDiv.style.top = cursor.y + 'px'
        cursorDiv.style.width = '10px'
        cursorDiv.style.height = '10px'
        cursorDiv.style.backgroundColor = cursor.color
        cursorDiv.style.borderRadius = '50%'
        cursorDiv.style.pointerEvents = 'none'
        cursorDiv.style.zIndex = '10'
        tempContainer.appendChild(cursorDiv)
      })
      
      document.body.appendChild(tempContainer)
      
      // Wait for the image to load before capturing
      await new Promise((resolve) => {
        canvasImage.onload = resolve
      })
      
      const canvasImageForPDF = await html2canvas(tempContainer, {
        backgroundColor: '#ffffff',
        scale: 1,
        logging: false,
        useCORS: true,
        allowTaint: true
      })
      
      document.body.removeChild(tempContainer)
      
      const imgData = canvasImageForPDF.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvasImageForPDF.width, canvasImageForPDF.height],
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvasImageForPDF.width, canvasImageForPDF.height)
      const pdfBlob = pdf.output('blob')
      saveAs(pdfBlob, `canvas-${roomId}.pdf`)
    } catch (error) {
      console.error('Export PDF failed:', error)
      alert('Failed to export PDF. Please try again.')
    }
  }

  const clearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      // Delete all objects from the Yjs array
      if (canvasObjects.current.length > 0) {
        canvasObjects.current.delete(0, canvasObjects.current.length)
      }
    }
  }

  // Expose canvas methods via onLoad prop
  useEffect(() => {
    if (onLoad) {
      onLoad({
        onUndo: () => undoManager.current.undo(),
        onRedo: () => undoManager.current.redo(),
        onCopy: copyRoomCode,
        onExportPNG: exportPNG,
        onExportPDF: exportPDF,
        onClear: clearCanvas,
      })
    }
  }, [onLoad])

  // === Pointer handlers ===
  const handlePointerDown = (e: React.PointerEvent) => {
    const { x, y } = getCanvasPosition(e)
    setIsDrawing(true)
    setStartPos({ x, y })
    if (tool === 'pen' || tool === 'eraser') {
      setCurrentStrokePoints([{ x, y }])
    } else if (tool === 'text') {
      setPendingTextInput({ x, y })
      setTextValue('')
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const { x, y } = getCanvasPosition(e)
    provider.current?.awareness.setLocalStateField('cursor', { x, y })

    if (tool === 'text' && !isDrawing && !textInput) {
      setHoverPos({ x, y })
    }

    if (!isDrawing) return // Don't do anything if not drawing

    const previewCtx = previewCanvasRef.current!.getContext('2d')!
    previewCtx.clearRect(0, 0, previewCanvasRef.current!.width, previewCanvasRef.current!.height)
    
    // Set styles for preview
    previewCtx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,0.5)' : color
    previewCtx.lineWidth = thickness

    if (tool === 'pen' || tool === 'eraser') {
      const newPoints = [...currentStrokePoints, { x, y }]
      setCurrentStrokePoints(newPoints)
      // For eraser, we draw a standard stroke on the preview
      drawStroke(previewCtx, newPoints)
    } else if (tool === 'rectangle') {
      if (!startPos) return
      previewCtx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y)
    } else if (tool === 'circle') {
      if (!startPos) return
      const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2))
      previewCtx.beginPath()
      previewCtx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI)
      previewCtx.stroke()
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing || !startPos) return
    setIsDrawing(false)
    
    const { x: endX, y: endY } = getCanvasPosition(e)
    
    // Add final object to Yjs array
    if (tool === 'pen') {
      if (currentStrokePoints.length < 2) return
      const newStroke: Stroke = { type: 'stroke', points: currentStrokePoints, color, thickness, timestamp: Date.now() }
      canvasObjects.current.push([newStroke])
    } else if (tool === 'eraser') {
      if (currentStrokePoints.length < 2) return
      const newErase: ErasePath = { type: 'erase', points: currentStrokePoints, thickness }
      canvasObjects.current.push([newErase])
    } else if (tool === 'rectangle') {
      const newRect: Rectangle = { type: 'rectangle', x: startPos.x, y: startPos.y, width: endX - startPos.x, height: endY - startPos.y, color, thickness }
      canvasObjects.current.push([newRect])
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(endX - startPos.x, 2) + Math.pow(endY - startPos.y, 2))
      const newCircle: Circle = { type: 'circle', x: startPos.x, y: startPos.y, radius, color, thickness }
      canvasObjects.current.push([newCircle])
    }

    // Clear the preview canvas
    const previewCtx = previewCanvasRef.current!.getContext('2d')!
    previewCtx.clearRect(0, 0, previewCanvasRef.current!.width, previewCanvasRef.current!.height)

    // Reset drawing state
    setStartPos(null)
    setCurrentStrokePoints([])
    provider.current?.awareness.setLocalStateField('cursor', null)
  }

  const handlePointerLeave = (e: React.PointerEvent) => {
    setHoverPos(null)
    handlePointerUp(e)
  }
  
  // Helper to get mouse position relative to canvas
  const getCanvasPosition = (e: React.PointerEvent) => {
    const wrapperRect = wrapperRef.current!.getBoundingClientRect()
    return { x: e.clientX - wrapperRect.left, y: e.clientY - wrapperRect.top }
  }

  // Helper to draw a stroke
  const drawStroke = (ctx: CanvasRenderingContext2D, points: {x: number, y: number}[]) => {
    if (points.length < 2) return
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    points.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.stroke()
  }

  useEffect(() => {
    if (pendingTextInput) {
      setTextInput(pendingTextInput)
      setPendingTextInput(null)
    }
  }, [pendingTextInput])

  const playback = usePlaybackController(canvasRef as React.RefObject<HTMLCanvasElement>, canvasObjects.current.toArray ? canvasObjects.current.toArray() : [])

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <HeaderActions
        onExportPNG={exportPNG}
        onExportPDF={exportPDF}
        onCopyRoomId={copyRoomCode}
      />
      <DrawingToolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        thickness={thickness}
        setThickness={setThickness}
        onClear={clearCanvas}
      />
      {socket && <VoiceChat socket={socket} roomId={roomId} />}
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
      <canvas ref={canvasRef} className={styles.canvas} />
      <canvas
        ref={previewCanvasRef}
        className={styles.previewCanvas}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={textInput && tool === 'text' ? { pointerEvents: 'none' } : {}}
      />
      {hoverPos && tool === 'text' && !textInput && (
        <span
          style={{
            position: 'absolute',
            left: hoverPos.x,
            top: hoverPos.y,
            fontSize: 24,
            color: color,
            background: 'rgba(255,255,255,0.7)',
            border: '1.5px dashed #60a5fa',
            borderRadius: 4,
            padding: '0 4px',
            pointerEvents: 'none',
            zIndex: 15,
            animation: 'blink 1s steps(2, start) infinite',
          }}
        >
          T
        </span>
      )}
      {textInput && tool === 'text' && (
        <input
          ref={el => {
            if (el) {
              setTimeout(() => {
                el.focus()
              }, 50)
              console.log('Text input rendered and focus requested')
            }
          }}
          autoFocus
          style={{
            position: 'absolute',
            left: textInput.x,
            top: textInput.y,
            fontSize: 24,
            color: '#111', // debug black text
            background: '#fff', // debug white background
            border: '2px solid red', // debug border
            borderRadius: 4,
            zIndex: 9999,
            pointerEvents: 'auto',
          }}
          value={textValue}
          onChange={e => setTextValue(e.target.value)}
          onBlur={() => {
            console.log('Text input blurred')
            if (textValue.trim()) {
              const newText: TextObject = {
                type: 'text',
                x: textInput.x,
                y: textInput.y,
                text: textValue,
                color,
                fontSize: 24,
              }
              canvasObjects.current.push([newText])
            }
            setTextInput(null)
            setTextValue('')
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur()
            }
          }}
        />
      )}
    </div>
  )
}

export default Canvas
