import { useState } from 'react'
import Canvas from './components/Canvas'
import RoomJoin from './components/RoomJoin'

function App() {
  const [roomId, setRoomId] = useState<string | null>(null)

  return (
    <div>
      {roomId ? (
        <Canvas roomId={roomId} />
      ) : (
        <RoomJoin onJoinRoom={setRoomId} />
      )}
    </div>
  )
}

export default App
