import { useState } from 'react'
import Canvas, { type CanvasHandles } from './components/Canvas'
import { RoomJoin } from './components/RoomJoin'
import { MainLayout } from './components/layout/MainLayout'
import { Toaster } from 'react-hot-toast'

function App() {
  const [roomId, setRoomId] = useState<string | null>(null)
  const [canvasHandles, setCanvasHandles] = useState<CanvasHandles | null>(null)

  return (
    <>
      <Toaster position="top-center" />
      {!roomId ? (
        <RoomJoin onJoinRoom={setRoomId} />
      ) : (
        <MainLayout
          roomId={roomId}
          canvasHandles={canvasHandles}
        >
          <Canvas 
            roomId={roomId} 
            onLoad={setCanvasHandles} 
          />
        </MainLayout>
      )}
    </>
  )
}

export default App
