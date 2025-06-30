import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Users, Zap } from 'lucide-react'

interface RoomJoinProps {
  onJoinRoom: (roomId: string) => void
}

export const RoomJoin: React.FC<RoomJoinProps> = ({ onJoinRoom }) => {
  const [roomId, setRoomId] = useState('')

  const create = () => {
    const newId = Math.random().toString(36).slice(2, 8).toUpperCase()
    onJoinRoom(newId)
  }

  return (
    <div className="min-h-screen bg-[#dbeafe] flex items-center justify-center p-4">
      {/* Optional: subtle blue blob for accent */}
      <div className="absolute top-24 left-24 w-32 h-32 bg-blue-200 rounded-full blur-2xl opacity-40"></div>
      <div className="absolute bottom-24 right-24 w-40 h-40 bg-blue-300 rounded-full blur-2xl opacity-30"></div>
      <Card className="w-full max-w-md relative z-10 bg-white border border-[#cbd5e1] shadow-xl rounded-2xl">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-[#1e3a5c] animate-none" />
            <CardTitle className="text-3xl font-bold text-[#1e293b]">Collaborative Canvas</CardTitle>
            <Sparkles className="h-8 w-8 text-[#1e3a5c] animate-none" />
          </div>
          <p className="text-[#1e3a5c] text-sm">Create or join a room to start drawing together!</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            className="w-full h-12 bg-[#1e3a5c] hover:bg-[#274472] text-white font-bold text-lg shadow-md rounded-xl transition-all duration-200" 
            onClick={create}
          >
            <Zap className="h-5 w-5 mr-2" />
            Create New Room
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#cbd5e1]"></div>
            <span className="text-[#1e3a5c] text-sm font-medium">or join existing</span>
            <div className="flex-1 h-px bg-[#cbd5e1]"></div>
          </div>
          <div className="flex gap-3">
            <Input
              placeholder="Enter Room Code"
              value={roomId}
              onChange={e => setRoomId(e.target.value.toUpperCase())}
              className="flex-1 bg-white border border-[#cbd5e1] text-[#1e3a5c] placeholder:text-[#64748b] focus:bg-blue-50 focus:border-[#60a5fa] rounded-lg"
            />
            <Button 
              onClick={() => roomId && onJoinRoom(roomId)}
              className="bg-[#60a5fa] hover:bg-[#3b82f6] text-white font-bold rounded-lg shadow-md transition-all duration-200"
            >
              <Users className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 