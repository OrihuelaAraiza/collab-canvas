import React, { useState } from 'react'

interface RoomJoinProps {
  onJoinRoom: (roomId: string) => void
}

const RoomJoin: React.FC<RoomJoinProps> = ({ onJoinRoom }) => {
  const [roomId, setRoomId] = useState('')

  const handleCreateRoom = () => {
    // Generate a 6-character room code (like Kahoot)
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    onJoinRoom(newRoomId)
  }

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault()
    if (roomId.trim()) {
      onJoinRoom(roomId.trim().toUpperCase())
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '2rem',
      padding: '2rem'
    }}>
      <h1>Collaborative Canvas</h1>
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        maxWidth: '300px',
        width: '100%'
      }}>
        <button
          onClick={handleCreateRoom}
          style={{
            padding: '1rem',
            fontSize: '1.1rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Create New Room
        </button>

        <div style={{ textAlign: 'center', margin: '1rem 0' }}>or</div>

        <form onSubmit={handleJoinRoom}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter Room Code"
              style={{
                padding: '0.5rem',
                fontSize: '1.1rem',
                flex: 1,
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '1.1rem',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RoomJoin 