// client/src/components/Canvas.tsx
import React, { useRef, useEffect, useState } from 'react'
import * as Y from 'yjs'
import { SocketIOProvider } from 'y-socket.io'
import { type Socket } from 'socket.io-client'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { saveAs } from 'file-saver'
import toast from 'react-hot-toast'
import Moveable from 'react-moveable'
import styles from './Canvas.module.css'
import { DrawingToolbar } from './DrawingToolbar'
import VoiceChat from './VoiceChat'
import { HeaderActions } from './layout/HeaderActions'
import { LayerPanel } from './LayerPanel'
import { v4 as uuidv4 } from 'uuid'

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
  id: string,
  type: 'stroke',
  points: { x: number, y: number }[],
  color: string, 
  thickness: number,
  timestamp: number
}
type Rectangle = { 
  id: string,
  type: 'rectangle',
  x: number, y: number, 
  width: number, height: number,
  color: string,
  thickness: number,
  timestamp: number
}
type Circle = { 
  id: string,
  type: 'circle',
  x: number, y: number,
  radius: number,
  color: string,
  thickness: number,
  timestamp: number
}

type ErasePath = {
  id: string,
  type: 'erase'
  points: { x: number, y: number }[]
  thickness: number
  timestamp: number
}

type TextObject = {
  id: string,
  type: 'text',
  x: number,
  y: number,
  text: string,
  color: string,
  fontSize: number
  timestamp: number
}

type FillObject = {
  id: string,
  type: 'fill',
  x: number,
  y: number,
  color: string,
  timestamp: number,
  filledPixels: { x: number, y: number }[]
}

type ImageObject = {
  id: string
  type: 'image'
  src: string        // data-url
  x: number
  y: number
  width: number
  height: number
  timestamp: number
}

type CanvasObject = Stroke | Rectangle | Circle | ErasePath | TextObject | FillObject | ImageObject

export type Layer = {
  id: string;
  name: string;
  visible: boolean;
  zIndex: number;
  objects: CanvasObject[];
};

// Device pixel ratio for coordinate conversion
const dpr = window.devicePixelRatio || 1

// Image cache for better performance
const imageCache: Record<string, HTMLImageElement> = {}

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
      obj.type === 'stroke' || obj.type === 'rectangle' || obj.type === 'circle' || obj.type === 'erase' || obj.type === 'text' || obj.type === 'fill' || obj.type === 'image')
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
        if (obj.type !== 'text' && obj.type !== 'fill' && obj.type !== 'image') {
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
        case 'fill':
          // For playback, we apply the flood fill to the stored pixels
          ctx.save()
          ctx.globalCompositeOperation = 'source-over'
          ctx.fillStyle = obj.color
          
          // Fill each pixel that was filled in the original operation
          obj.filledPixels.forEach(pixel => {
            ctx.fillRect(pixel.x, pixel.y, 1, 1)
          })
          
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
  const [layers, setLayers] = useState<Layer[]>([])
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [shiftDown, setShiftDown] = useState(false)
  const moveableRef = useRef<any>(null)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    el.style.cursor = selectedId ? 'move' : 'default'
  }, [selectedId])

  useEffect(() => {
    const down = (e: KeyboardEvent) => e.key === 'Shift' && setShiftDown(true)
    const up = (e: KeyboardEvent) => e.key === 'Shift' && setShiftDown(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { 
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up) 
    }
  }, [])

  // Initialize CRDT with room ID
  const ydoc = useRef(new Y.Doc())
  const provider = useRef<SocketIOProvider | null>(null)
  const yLayers = useRef<Y.Array<Y.Map<any>>>(ydoc.current.getArray('layers'))
  
  // Active layer state
  const [activeLayerId, setActiveLayerId] = useState<string>(() => {
    const firstLayer = yLayers.current.get(0)
    return firstLayer ? firstLayer.get('id') : ''
  })
  
  // Updated undo manager to track all layers and their objects
  const undoManager = useRef(new Y.UndoManager([yLayers.current], {
    captureTimeout: 300
  }))

  // Function to update undo manager to track all layer objects
  const updateUndoManager = () => {
    const allObjectsArrays: Y.Array<CanvasObject>[] = []
    yLayers.current.forEach(layer => {
      const objects = layer.get('objects') as Y.Array<CanvasObject>
      allObjectsArrays.push(objects)
    })
    
    // Create a new undo manager that tracks both layers and all object arrays
    undoManager.current = new Y.UndoManager([yLayers.current, ...allObjectsArrays], {
      captureTimeout: 300
    })
  }

  // Helper functions for layer management
  function getActiveLayer(): Y.Map<any> | undefined {
    return yLayers.current.toArray().find(l => l.get('id') === activeLayerId)
  }

  function addObjectToLayer(layerId: string, obj: CanvasObject) {
    const layer = yLayers.current.toArray().find(l => l.get('id') === layerId)
    if (layer) {
      (layer.get('objects') as Y.Array<CanvasObject>).push([obj])
    }
  }

  function clearLayer(layerId: string) {
    const layer = yLayers.current.toArray().find(l => l.get('id') === layerId)
    if (layer) {
      const objects = layer.get('objects') as Y.Array<CanvasObject>
      objects.delete(0, objects.length)
    }
  }

  function clearAllLayers() {
    yLayers.current.forEach(l => {
      const objects = l.get('objects') as Y.Array<CanvasObject>
      objects.delete(0, objects.length)
    })
  }

  function moveLayer(layerId: string, toIndex: number) {
    const layersArr = yLayers.current.toArray()
    const idx = layersArr.findIndex(l => l.get('id') === layerId)
    if (idx === -1 || toIndex < 0 || toIndex >= layersArr.length) return
    const [layer] = layersArr.splice(idx, 1)
    layersArr.splice(toIndex, 0, layer)
    // Update zIndex for all layers
    layersArr.forEach((l, i) => l.set('zIndex', i))
    // Replace the Y.Array with the new order
    yLayers.current.delete(0, yLayers.current.length)
    yLayers.current.insert(0, layersArr)
  }

  function renameLayer(layerId: string, newName: string) {
    const layer = yLayers.current.toArray().find(l => l.get('id') === layerId)
    if (layer) layer.set('name', newName)
  }

  function setLayerVisibility(layerId: string, visible: boolean) {
    const layer = yLayers.current.toArray().find(l => l.get('id') === layerId)
    if (layer) layer.set('visible', visible)
  }

  function addLayer() {
    const newLayer = new Y.Map()
    newLayer.set('id', uuidv4())
    newLayer.set('name', `Layer ${yLayers.current.length + 1}`)
    newLayer.set('visible', true)
    newLayer.set('zIndex', yLayers.current.length)
    newLayer.set('objects', new Y.Array())
    yLayers.current.push([newLayer])
    
    // Update undo manager to track the new layer's objects
    updateUndoManager()
  }

  function removeLayer(layerId: string) {
    const idx = yLayers.current.toArray().findIndex(l => l.get('id') === layerId)
    if (idx !== -1) yLayers.current.delete(idx, 1)
    
    // Update undo manager after removing layer
    updateUndoManager()
  }

  // 2. If no layers exist, create a default one
  useEffect(() => {
    if (yLayers.current.length === 0) {
      const defaultLayer = new Y.Map()
      defaultLayer.set('id', uuidv4())
      defaultLayer.set('name', 'Layer 1')
      defaultLayer.set('visible', true)
      defaultLayer.set('zIndex', 0)
      defaultLayer.set('objects', new Y.Array())
      yLayers.current.push([defaultLayer])
      setActiveLayerId(defaultLayer.get('id') as string)
      
      // Update undo manager to track the default layer's objects
      updateUndoManager()
    }
  }, [])

  // Assign a random color and register in awareness
  useEffect(() => {
    const aw = provider.current?.awareness
    const userColor = '#' + Math.floor(Math.random() * 0xffffff).toString(16)
    aw?.setLocalStateField('user', { color: userColor })
    setColor(userColor) // Start with the user's random color
  }, [])

  // Sync layers state with Yjs layers
  useEffect(() => {
    const updateLayers = () => {
      const yjsLayers = yLayers.current.toArray()
      const layersData: Layer[] = yjsLayers.map(layer => ({
        id: layer.get('id') as string,
        name: layer.get('name') as string,
        visible: layer.get('visible') as boolean,
        zIndex: layer.get('zIndex') as number,
        objects: (layer.get('objects') as Y.Array<CanvasObject>).toArray()
      }))
      console.log('[Yjs] updateLayers fired', layersData)
      setLayers(layersData)
    }

    updateLayers()
    
    // Create a comprehensive observer that watches both array and individual layer changes
    const observer = () => updateLayers()
    
    // Observe changes to the layers array itself
    yLayers.current.observe(observer)
    
    // Set up observers for individual layers and their objects
    const setupLayerObservers = () => {
      const layerObservers: (() => void)[] = []
      
      yLayers.current.forEach(layer => {
        // Observe the layer map itself
        layer.observe(observer)
        layerObservers.push(() => layer.unobserve(observer))
        
        // Observe the objects array within the layer
        const objects = layer.get('objects') as Y.Array<CanvasObject>
        objects.observe(observer)
        layerObservers.push(() => objects.unobserve(observer))
      })
      
      return layerObservers
    }
    
    let layerObservers = setupLayerObservers()
    
    // Re-setup observers when the layers array changes
    const arrayObserver = () => {
      // Clean up old observers
      layerObservers.forEach(unobserve => unobserve())
      // Set up new observers
      layerObservers = setupLayerObservers()
      // Update the layers state
      updateLayers()
    }
    
    yLayers.current.observe(arrayObserver)
    
    return () => {
      yLayers.current.unobserve(observer)
      yLayers.current.unobserve(arrayObserver)
      layerObservers.forEach(unobserve => unobserve())
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        setShowLayerPanel(prev => !prev)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          // Ctrl+Shift+Z or Cmd+Shift+Z for redo
          console.log('Keyboard redo called')
          undoManager.current.redo()
        } else {
          // Ctrl+Z or Cmd+Z for undo
          console.log('Keyboard undo called')
          undoManager.current.undo()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        // Ctrl+Y or Cmd+Y for redo (alternative)
        console.log('Keyboard redo (Y) called')
        undoManager.current.redo()
      } else if (e.key === 'Delete' && selectedId) {
        e.preventDefault();
        deleteImage(selectedId);
        setSelectedId(null);
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedId])

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

    // Scratch canvas pool for better performance
    const scratchPool: HTMLCanvasElement[] = []

    const getScratch = (): CanvasRenderingContext2D => {
      const c = scratchPool.pop() || document.createElement('canvas')
      c.width = canvas.width      // already device-px dimensions
      c.height = canvas.height
      const lctx = c.getContext('2d')!
      
      // Reset all old transforms (no scaling needed)
      lctx.setTransform(1, 0, 0, 1, 0, 0)
      return lctx
    }

    const releaseScratch = (lctx: CanvasRenderingContext2D) => {
      scratchPool.push(lctx.canvas)
    }

    const requestRepaint = () => ydoc.current.transact(() => {})

    const renderObjects = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Get all layers sorted by zIndex and render visible ones
      const layers = yLayers.current.toArray()
        .sort((a, b) => a.get('zIndex') - b.get('zIndex'))
        .filter(layer => layer.get('visible'))

      layers.forEach(layer => {
        // 1. Draw this layer into a scratch canvas
        const lctx = getScratch()

        const objects = layer.get('objects') as Y.Array<CanvasObject>
        objects.forEach((obj: CanvasObject) => {
          // Set paint mode for this layer only
          if (obj.type === 'erase') {
            lctx.globalCompositeOperation = 'destination-out'
            lctx.lineWidth = obj.thickness
            lctx.lineCap = 'round'
            lctx.lineJoin = 'round'
          } else {
            lctx.globalCompositeOperation = 'source-over'
            if (obj.type !== 'text' && obj.type !== 'fill' && obj.type !== 'image') {
              lctx.strokeStyle = obj.color
              lctx.lineWidth = obj.thickness
              lctx.lineCap = 'round'
              lctx.lineJoin = 'round'
            }
          }

          // Draw the object on the layer canvas
          switch (obj.type) {
            case 'stroke':
            case 'erase': {
              lctx.beginPath()
              obj.points.forEach((p: {x: number, y: number}, i: number) => (i ? lctx.lineTo(p.x, p.y) : lctx.moveTo(p.x, p.y)))
              lctx.stroke()
              break
            }
            case 'rectangle':
              lctx.strokeRect(obj.x, obj.y, obj.width, obj.height)
              break
            case 'circle':
              lctx.beginPath()
              lctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI)
              lctx.stroke()
              break
            case 'text':
              lctx.save()
              lctx.font = `${obj.fontSize || 24}px sans-serif`
              lctx.fillStyle = obj.color
              lctx.textBaseline = 'top'
              lctx.fillText(obj.text, obj.x, obj.y)
              lctx.restore()
              break
            case 'fill':
              // Apply the flood fill to the stored pixels
              lctx.save()
              lctx.globalCompositeOperation = 'source-over'
              lctx.fillStyle = obj.color
              
              // Fill each pixel that was filled in the original operation
              obj.filledPixels.forEach(pixel => {
                lctx.fillRect(pixel.x, pixel.y, 1, 1)
              })
              
              lctx.restore()
              break
            case 'image': {
              const cached = imageCache[obj.id]           // simple memo
              if (cached) {
                lctx.drawImage(cached, obj.x, obj.y, obj.width, obj.height)
              } else {
                const i = new Image()
                i.onload = () => { imageCache[obj.id] = i; requestRepaint() }
                i.src = obj.src
              }
              break
            }
          }
        })

        // 2. Composite this layer bitmap onto the main canvas
        ctx.drawImage(lctx.canvas, 0, 0)
        
        // Return the scratch canvas to the pool
        releaseScratch(lctx)
      })

      // Always restore normal mode at the end
      ctx.globalCompositeOperation = 'source-over'
    }
    
    // Use deep observer that fires for any change anywhere in the document
    const observer = () => renderObjects()
    ydoc.current.on('afterTransaction', observer)
    
    // Draw once on mount
    renderObjects()
    
    return () => {
      ydoc.current.off('afterTransaction', observer)
    }
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
      clearAllLayers()
    }
  }

  // Expose canvas methods via onLoad prop
  useEffect(() => {
    if (onLoad) {
      onLoad({
        onUndo: () => {
          console.log('Undo called')
          undoManager.current.undo()
        },
        onRedo: () => {
          console.log('Redo called')
          undoManager.current.redo()
        },
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
    
    // Always check for image selection regardless of tool
    const hit = layers
      .filter(l => l.visible)
      .reverse()                     // top-most first
      .flatMap(l => l.objects)
      .find(o => o.type === 'image' &&
                 x >= o.x && x <= o.x + o.width &&
                 y >= o.y && y <= o.y + o.height)
    
    if (hit) {
      setSelectedId(hit.id)
      // Don't return here - allow other tools to work
    } else if (tool === 'select') {
      setSelectedId(null)
    }

    if (tool === 'paint-bucket') {
      // For paint-bucket, we don't need to track drawing state
      // Just perform the flood fill immediately
      const filledPixels = floodFill(x, y, color)
      
      // Only add the fill operation if pixels were actually filled
      if (filledPixels.length > 0) {
        const newFill: FillObject = { 
          id: `fill-${Date.now()}`,
          type: 'fill', 
          x, 
          y, 
          color, 
          timestamp: Date.now(),
          filledPixels
        }
        addObjectToLayer(activeLayerId, newFill)
      }
      return
    }
    
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
      const newStroke: Stroke = { id: `stroke-${Date.now()}`, type: 'stroke', points: currentStrokePoints, color, thickness, timestamp: Date.now() }
      addObjectToLayer(activeLayerId, newStroke)
    } else if (tool === 'eraser') {
      if (currentStrokePoints.length < 2) return
      const newErase: ErasePath = { id: `erase-${Date.now()}`, type: 'erase', points: currentStrokePoints, thickness, timestamp: Date.now() }
      addObjectToLayer(activeLayerId, newErase)
    } else if (tool === 'rectangle') {
      const newRect: Rectangle = { id: `rect-${Date.now()}`, type: 'rectangle', x: startPos.x, y: startPos.y, width: endX - startPos.x, height: endY - startPos.y, color, thickness, timestamp: Date.now() }
      addObjectToLayer(activeLayerId, newRect)
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(endX - startPos.x, 2) + Math.pow(endY - startPos.y, 2))
      const newCircle: Circle = { id: `circle-${Date.now()}`, type: 'circle', x: startPos.x, y: startPos.y, radius, color, thickness, timestamp: Date.now() }
      addObjectToLayer(activeLayerId, newCircle)
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

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 600                                     // max dimension
        const scale = Math.min(1, max / Math.max(img.width, img.height))

        const obj: ImageObject = {
          id: `img-${Date.now()}`,
          type: 'image',
          src: reader.result as string,
          x: 100,
          y: 100,
          width: img.width * scale,
          height: img.height * scale,
          timestamp: Date.now()
        }
        addObjectToLayer(activeLayerId, obj)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
    
    // Reset the input
    e.target.value = ''
  }

  // Flood-fill algorithm implementation
  const floodFill = (cssX: number, cssY: number, fillColor: string): { x: number, y: number }[] => {
    const main = canvasRef.current!
    if (!main) return []

    // Create off-screen canvas for flood fill
    const off = document.createElement('canvas')
    off.width = main.width
    off.height = main.height
    const ctx = off.getContext('2d')!
    
    // Do not scale the off-screen context - algorithm works with raw device pixels

    // Draw the CURRENT state of the active layer into 'off'
    const activeLayer = getActiveLayer()
    if (!activeLayer) return []
    
    // Render the active layer to the off-screen canvas (scale geometry to device pixels)
    const objects = activeLayer.get('objects') as Y.Array<CanvasObject>
    objects.forEach((obj: CanvasObject) => {
      // Set paint mode for this layer only
      if (obj.type === 'erase') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = obj.thickness * dpr
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      } else {
        ctx.globalCompositeOperation = 'source-over'
        if (obj.type !== 'text' && obj.type !== 'fill' && obj.type !== 'image') {
          ctx.strokeStyle = obj.color
          ctx.lineWidth = obj.thickness * dpr
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
        }
      }

      // Draw the object on the off-screen canvas (convert CSS coords to device coords)
      switch (obj.type) {
        case 'stroke':
        case 'erase': {
          ctx.beginPath()
          obj.points.forEach((p: {x: number, y: number}, i: number) => (i ? ctx.lineTo(p.x * dpr, p.y * dpr) : ctx.moveTo(p.x * dpr, p.y * dpr)))
          ctx.stroke()
          break
        }
        case 'rectangle':
          ctx.strokeRect(obj.x * dpr, obj.y * dpr, obj.width * dpr, obj.height * dpr)
          break
        case 'circle':
          ctx.beginPath()
          ctx.arc(obj.x * dpr, obj.y * dpr, obj.radius * dpr, 0, 2 * Math.PI)
          ctx.stroke()
          break
        case 'text':
          ctx.save()
          ctx.font = `${(obj.fontSize || 24) * dpr}px sans-serif`
          ctx.fillStyle = obj.color
          ctx.textBaseline = 'top'
          ctx.fillText(obj.text, obj.x * dpr, obj.y * dpr)
          ctx.restore()
          break
        case 'fill':
          // Apply the flood fill to the stored pixels
          ctx.save()
          ctx.globalCompositeOperation = 'source-over'
          ctx.fillStyle = obj.color
          
          // Fill each pixel that was filled in the original operation (convert to device coords)
          obj.filledPixels.forEach(pixel => {
            ctx.fillRect(pixel.x * dpr, pixel.y * dpr, dpr, dpr)
          })
          
          ctx.restore()
          break
        case 'image': {
          const cached = imageCache[obj.id]           // simple memo
          if (cached) {
            ctx.drawImage(cached, obj.x * dpr, obj.y * dpr, obj.width * dpr, obj.height * dpr)
          } else {
            const i = new Image()
            i.onload = () => { imageCache[obj.id] = i; ydoc.current.transact(() => {}) }
            i.src = obj.src
          }
          break
        }
      }
    })

    // Convert CSS coordinates to device-pixel coordinates
    const x = Math.floor(cssX * dpr)
    const y = Math.floor(cssY * dpr)

    const imageData = ctx.getImageData(0, 0, off.width, off.height)
    const data = imageData.data
    const width = off.width
    const height = off.height

    // Convert hex color to RGBA
    const hexToRgba = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return [r, g, b, 255]
    }

    const fillRgba = hexToRgba(fillColor)
    
    // Get the target color (the color we're replacing)
    const startIndex = (y * width + x) * 4
    const targetR = data[startIndex]
    const targetG = data[startIndex + 1]
    const targetB = data[startIndex + 2]
    const targetA = data[startIndex + 3]

    // If we're already filling with the same color, do nothing
    if (targetR === fillRgba[0] && targetG === fillRgba[1] && targetB === fillRgba[2] && targetA === fillRgba[3]) {
      return []
    }

    // Color tolerance for better matching (adjust this value as needed)
    const tolerance = 5

    // Helper function to check if colors are similar
    const colorsMatch = (r1: number, g1: number, b1: number, a1: number, 
                        r2: number, g2: number, b2: number, a2: number) => {
      return Math.abs(r1 - r2) <= tolerance &&
             Math.abs(g1 - g2) <= tolerance &&
             Math.abs(b1 - b2) <= tolerance &&
             Math.abs(a1 - a2) <= tolerance
    }

    // Stack-based flood fill algorithm with optimized scanning
    const stack: [number, number][] = [[x, y]]
    const filledPixels: { x: number, y: number }[] = []
    const visited = new Set<string>()
    
    while (stack.length > 0) {
      const [px, py] = stack.pop()!
      const key = `${px},${py}`
      
      if (px < 0 || px >= width || py < 0 || py >= height || visited.has(key)) continue
      
      visited.add(key)
      const index = (py * width + px) * 4
      
      // Check if this pixel matches the target color
      if (!colorsMatch(data[index], data[index + 1], data[index + 2], data[index + 3],
                      targetR, targetG, targetB, targetA)) {
        continue
      }
      
      // Fill this pixel
      data[index] = fillRgba[0]
      data[index + 1] = fillRgba[1]
      data[index + 2] = fillRgba[2]
      data[index + 3] = fillRgba[3]
      
      // Record this pixel as filled (convert back to CSS coordinates)
      filledPixels.push({ x: px / dpr, y: py / dpr })
      
      // Add neighboring pixels to the stack
      stack.push([px + 1, py])
      stack.push([px - 1, py])
      stack.push([px, py + 1])
      stack.push([px, py - 1])
    }
    
    // Don't apply changes to the main canvas - let renderObjects() handle it
    // ctx.putImageData(imageData, 0, 0) - REMOVED
    
    return filledPixels
  }

  useEffect(() => {
    if (pendingTextInput) {
      setTextInput(pendingTextInput)
      setPendingTextInput(null)
    }
  }, [pendingTextInput])

  // Get all objects from all visible layers for playback
  /** Replace the image object in-place so Yjs can record the change */
  function patchImage(id: string, patch: Partial<ImageObject>) {
    ydoc.current.transact(() => {
      yLayers.current.forEach(layer => {
        const arr = layer.get('objects') as Y.Array<CanvasObject>;
        const i   = arr.toArray().findIndex(o => o.id === id);
        if (i === -1) return;
        const current = arr.get(i) as ImageObject;
        arr.delete(i, 1);
        arr.insert(i, [{ ...current, ...patch }]);
      });
    });
  }

  function deleteImage(id: string) {
    ydoc.current.transact(() => {
      yLayers.current.forEach(layer => {
        const arr = layer.get('objects') as Y.Array<CanvasObject>;
        const i   = arr.toArray().findIndex(o => o.id === id);
        if (i !== -1) arr.delete(i, 1);
      });
    });
  }

  const getAllObjects = (): CanvasObject[] => {
    const layers = yLayers.current.toArray()
      .sort((a, b) => a.get('zIndex') - b.get('zIndex'))
      .filter(layer => layer.get('visible'))
    
    const allObjects: CanvasObject[] = []
    layers.forEach(layer => {
      const objects = layer.get('objects') as Y.Array<CanvasObject>
      allObjects.push(...objects.toArray())
    })
    return allObjects
  }

  const playback = usePlaybackController(canvasRef as React.RefObject<HTMLCanvasElement>, getAllObjects())

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <HeaderActions
        onExportPNG={exportPNG}
        onExportPDF={exportPDF}
        onCopyRoomId={copyRoomCode}
      />
      <div className="flex h-full">
        <div className="flex-1 relative">
          <DrawingToolbar
            tool={tool}
            setTool={setTool}
            color={color}
            setColor={setColor}
            thickness={thickness}
            setThickness={setThickness}
            onClear={clearCanvas}
            onToggleLayers={() => setShowLayerPanel(!showLayerPanel)}
            onImageUpload={handleImageUpload}
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
      
      {/* Render actual <img> elements for Moveable to attach to */}
      {layers.filter(l => l.visible).map(l =>
        l.objects.filter(o => o.type === 'image').map(o => (
          <img
            id={`img-${o.id}`}
            key={o.id}
            src={(o as ImageObject).src}
            style={{
              position: 'absolute',
              left: o.x,
              top: o.y,
              width: o.width,
              height: o.height,
              pointerEvents: 'auto',
              cursor: selectedId === o.id ? 'move' : 'default'
            }}
          />
        ))
      )}
      
      {/* Moveable overlay for drag/resize */}
      {selectedId && (() => {
        const imgObj = layers.flatMap(l => l.objects)
                         .find(o => o.id === selectedId) as ImageObject
        if (!imgObj) {
          return null
        }

        const targetElement = document.querySelector(`#img-${imgObj.id}`) as HTMLElement
        if (!targetElement) {
          console.log('Target element not found for:', imgObj.id)
          return null
        }

        return (
          <Moveable
            ref={moveableRef}
            target={targetElement}
            container={wrapperRef.current!}
            origin={false}
            zoom={1}
            draggable
            resizable
            throttleResize={0}
            keepRatio={shiftDown}

            onDrag={e => {
              console.log('Moveable drag:', { left: e.left, top: e.top, beforeDelta: e.beforeDelta })
              // Update DOM immediately for smooth interaction
              targetElement.style.left = `${e.left}px`
              targetElement.style.top = `${e.top}px`
              
              // Update data model
              patchImage(imgObj.id, { x: e.left, y: e.top });
            }}

            onResize={e => {
              console.log('Moveable resize event:', e)
              const { width, height } = e;
              const [dx, dy] = e.drag.beforeDelta;
              
              // Update DOM immediately for smooth interaction
              targetElement.style.width = `${width}px`
              targetElement.style.height = `${height}px`
              targetElement.style.left = `${imgObj.x + dx}px`
              targetElement.style.top = `${imgObj.y + dy}px`
              
              // Update data model
              patchImage(imgObj.id, {
                width,
                height,
                x: imgObj.x + dx,
                y: imgObj.y + dy,
              });
            }}
          />
        )
      })()}
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
                id: `text-${Date.now()}`,
                type: 'text',
                x: textInput.x,
                y: textInput.y,
                text: textValue,
                color,
                fontSize: 24,
                timestamp: Date.now()
              }
              addObjectToLayer(activeLayerId, newText)
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
        <LayerPanel
          layers={layers}
          active={activeLayerId}
          setActive={setActiveLayerId}
          moveLayer={moveLayer}
          addLayer={addLayer}
          removeLayer={removeLayer}
          setLayerVisibility={setLayerVisibility}
          renameLayer={renameLayer}
          onClose={() => setShowLayerPanel(false)}
          isVisible={showLayerPanel}
        />
      </div>
    </div>
  )
}

export default Canvas
