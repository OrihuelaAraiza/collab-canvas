import React from 'react'
import { Badge } from '@/components/ui/badge'

interface FooterProps {
  roomId: string
}

export const Footer: React.FC<FooterProps> = ({ roomId }) => {
  // Placeholders
  const isConnected = true

  return (
    <footer className="flex h-12 items-center justify-between border-t border-border bg-background px-4 md:px-6 z-20 shadow-inner">
      <div className="text-sm text-foreground">
        <span className="font-semibold">Room:</span> {roomId}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={isConnected ? 'default' : 'destructive'} className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>
    </footer>
  )
} 