import React from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'
import { type CanvasHandles } from '../Canvas'

interface MainLayoutProps {
  children: React.ReactNode
  roomId: string
  canvasHandles: CanvasHandles | null
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, roomId, canvasHandles }) => {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-hidden relative">{children}</main>
        <Footer 
          roomId={roomId}
        />
      </div>
      <Sidebar 
        onUndo={canvasHandles?.onUndo}
        onRedo={canvasHandles?.onRedo}
      />
    </div>
  )
} 