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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 dark:from-purple-900 dark:via-pink-900 dark:to-orange-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm"></div>
      
      {/* Animated background elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-yellow-400/30 dark:bg-yellow-300/20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-blue-400/30 dark:bg-blue-300/20 rounded-full blur-xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-green-400/30 dark:bg-green-300/20 rounded-full blur-xl animate-pulse delay-500"></div>
      
      <Card className="w-full max-w-md relative z-10 bg-white/10 dark:bg-black/20 backdrop-blur-md border-white/20 dark:border-white/10 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-yellow-300 dark:text-yellow-200 animate-spin" />
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 dark:from-yellow-200 dark:via-pink-200 dark:to-purple-200 bg-clip-text text-transparent">
              Collaborative Canvas
            </CardTitle>
            <Sparkles className="h-8 w-8 text-yellow-300 dark:text-yellow-200 animate-spin" />
          </div>
          <p className="text-white/80 dark:text-white/70 text-sm">Create or join a room to start drawing together!</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Button 
            className="w-full h-12 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 dark:from-green-500 dark:to-blue-600 dark:hover:from-green-600 dark:hover:to-blue-700 text-white font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200" 
            onClick={create}
          >
            <Zap className="h-5 w-5 mr-2" />
            Create New Room
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
            <span className="text-white/60 dark:text-white/50 text-sm font-medium">or join existing</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
          </div>
          
          <div className="flex gap-3">
            <Input
              placeholder="Enter Room Code"
              value={roomId}
              onChange={e => setRoomId(e.target.value.toUpperCase())}
              className="flex-1 bg-white/20 dark:bg-black/30 border-white/30 dark:border-white/20 text-white placeholder:text-white/50 dark:placeholder:text-white/40 focus:bg-white/30 dark:focus:bg-black/40 focus:border-white/50 dark:focus:border-white/30"
            />
            <Button 
              onClick={() => roomId && onJoinRoom(roomId)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 dark:from-purple-600 dark:to-pink-600 dark:hover:from-purple-700 dark:hover:to-pink-700 text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <Users className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 