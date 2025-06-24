import React from 'react'
import { Button } from '@/components/ui/button'
import { FaUndo, FaRedo, FaMicrophone, FaCog, FaUsers } from 'react-icons/fa'

interface SidebarProps {
  onUndo?: () => void
  onRedo?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onUndo, onRedo }) => {
  return (
    <aside className="w-64 flex-col border-l bg-background p-4 flex z-20 shadow-lg">
      <div className="flex-1 space-y-6">
        <div>
          <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2 flex items-center">
            <FaUsers className="mr-2" />
            Users
          </h3>
          {/* User list will go here */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
            <div className="h-8 w-8 rounded-full bg-purple-300 dark:bg-purple-600 flex items-center justify-center font-bold text-purple-700 dark:text-purple-200">
              T
            </div>
            <span className="font-medium text-foreground">Tyler</span>
          </div>
        </div>

        <div className="w-full h-px bg-border"></div>

        <div>
          <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2 flex items-center">
            <FaMicrophone className="mr-2" />
            Voice Chat
          </h3>
          {/* Voice chat controls will go here */}
          <p className="text-sm text-muted-foreground">Voice chat is managed on the canvas.</p>
        </div>
        
        <div className="w-full h-px bg-border"></div>

        <div>
          <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2 flex items-center">
            <FaCog className="mr-2" />
            Settings
          </h3>
          {/* Settings buttons will go here */}
          <p className="text-sm text-muted-foreground">Theme is now toggled from the header.</p>
        </div>
      </div>

      <div className="mt-auto flex justify-center gap-2">
        <Button onClick={onUndo} variant="outline" aria-label="Undo" disabled={!onUndo}>
          <FaUndo className="mr-2 h-4 w-4" />
          Undo
        </Button>
        <Button onClick={onRedo} variant="outline" aria-label="Redo" disabled={!onRedo}>
          <FaRedo className="mr-2 h-4 w-4" />
          Redo
        </Button>
      </div>
    </aside>
  )
} 