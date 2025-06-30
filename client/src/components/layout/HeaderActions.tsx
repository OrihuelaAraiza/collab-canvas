import React from 'react'
import { Download, Copy, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/ThemeProvider'

interface HeaderActionsProps {
  onExportPNG?: () => Promise<void>
  onExportPDF?: () => Promise<void>
  onCopyRoomId?: () => void
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({
  onExportPNG,
  onExportPDF,
  onCopyRoomId,
}) => {
  const { theme, setTheme } = useTheme()

  return (
    <div className="absolute top-4 right-4 z-20 flex items-center gap-4 bg-transparent">
      <Button onClick={onExportPNG} variant="outline" disabled={!onExportPNG} className="bg-white/90 dark:bg-black/90 text-black dark:text-white border-black dark:border-white hover:bg-white dark:hover:bg-black">
        <Download className="mr-2 h-4 w-4" />
        Export PNG
      </Button>
      <Button onClick={onExportPDF} variant="outline" disabled={!onExportPDF} className="bg-white/90 dark:bg-black/90 text-black dark:text-white border-black dark:border-white hover:bg-white dark:hover:bg-black">
        <Download className="mr-2 h-4 w-4" />
        Export PDF
      </Button>
      <Button onClick={onCopyRoomId} variant="outline" disabled={!onCopyRoomId} className="bg-white/90 dark:bg-black/90 text-black dark:text-white border-black dark:border-white hover:bg-white dark:hover:bg-black">
        <Copy className="mr-2 h-4 w-4" />
        Copy Room ID
      </Button>
      <div className="w-px h-6 bg-border mx-2"></div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle theme"
        className="relative bg-white/90 dark:bg-black/90 border-black dark:border-white hover:bg-white dark:hover:bg-black"
      >
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-black dark:text-white" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-black dark:text-white" />
        <span className="sr-only">Toggle theme</span>
      </Button>
      <div className="h-9 w-9 rounded-full bg-slate-300 dark:bg-zinc-600 flex items-center justify-center font-bold text-slate-600 dark:text-zinc-200">
        U
      </div>
    </div>
  )
} 