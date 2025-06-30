import React from 'react'
import { Button } from '@/components/ui/button'
import { FaPen, FaEraser, FaRegCircle, FaRegSquare, FaTrash } from 'react-icons/fa'
import { IoMdColorPalette } from 'react-icons/io'
import { useTheme } from './ThemeProvider'

interface DrawingToolbarProps {
  tool: string
  setTool: (tool: string) => void
  color: string
  setColor: (color: string) => void
  thickness: number
  setThickness: (thickness: number) => void
  onClear: () => void;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  tool,
  setTool,
  color,
  setColor,
  thickness,
  setThickness,
  onClear,
}) => {
  const { theme } = useTheme();
  return (
    <div className="absolute top-1/2 left-4 -translate-y-1/2 bg-[#dbeafe] dark:bg-[#1e293b] p-2 rounded-lg shadow-lg flex flex-col gap-2 border border-[#60a5fa] dark:border-[#334155] z-10 text-[#1e293b] dark:text-white">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTool('pen')}
        title="Pen"
        className={`transition-all hover:bg-[#bfdbfe] dark:hover:bg-[#334155] hover:scale-110 ${tool === 'pen' ? 'bg-[#60a5fa] dark:bg-[#334155]' : ''}`}
      >
        <FaPen className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTool('eraser')}
        title="Eraser"
        className={`transition-all hover:bg-[#bfdbfe] dark:hover:bg-[#334155] hover:scale-110 ${tool === 'eraser' ? 'bg-[#60a5fa] dark:bg-[#334155]' : ''}`}
      >
        <FaEraser className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTool('rectangle')}
        title="Rectangle"
        className={`transition-all hover:bg-[#bfdbfe] dark:hover:bg-[#334155] hover:scale-110 ${tool === 'rectangle' ? 'bg-[#60a5fa] dark:bg-[#334155]' : ''}`}
      >
        <FaRegSquare className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTool('circle')}
        title="Circle"
        className={`transition-all hover:bg-[#bfdbfe] dark:hover:bg-[#334155] hover:scale-110 ${tool === 'circle' ? 'bg-[#60a5fa] dark:bg-[#334155]' : ''}`}
      >
        <FaRegCircle className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTool('text')}
        title="Text"
        className={`transition-all hover:bg-[#bfdbfe] dark:hover:bg-[#334155] hover:scale-110 ${tool === 'text' ? 'bg-[#60a5fa] dark:bg-[#334155]' : ''}`}
      >
        <span className="text-lg font-bold">T</span>
      </Button>
      
      <div className="w-full h-px bg-[#60a5fa] dark:bg-[#334155] my-1"></div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onClear}
        title="Clear Canvas"
        className="transition-all hover:bg-red-200 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 hover:scale-110"
      >
        <FaTrash className="h-5 w-5" />
      </Button>

      <div className={`relative w-full flex justify-center items-center pt-2 transition-opacity ${tool === 'eraser' ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}>
        <label htmlFor="color-picker" className={`cursor-pointer hover:scale-110 transition-all ${tool === 'eraser' ? 'cursor-not-allowed' : ''}`}>
          <IoMdColorPalette className="h-6 w-6" style={{ color }} />
        </label>
        <input
          id="color-picker"
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
          disabled={tool === 'eraser'}
        />
      </div>

      <div className="flex flex-col items-center gap-2 pt-2">
        <label htmlFor="thickness-slider" className="text-xs font-medium text-[#334155] dark:text-[#cbd5e1]">
          Size
        </label>
        <input
          id="thickness-slider"
          type="range"
          min="1"
          max="50"
          value={thickness}
          onChange={(e) => setThickness(Number(e.target.value))}
          className="w-20 cursor-pointer"
        />
        <span className="text-xs font-bold text-[#1e293b] dark:text-white">{thickness}</span>
      </div>
      {/* Playback Controls */}
      <div className="flex flex-col items-center gap-2 pt-4 border-t border-[#60a5fa] dark:border-[#334155] mt-2">
        <button id="playback-play" className="px-2 py-1 rounded bg-[#60a5fa] text-white text-xs mb-1">▶️ Play</button>
        <button id="playback-pause" className="px-2 py-1 rounded bg-[#334155] text-white text-xs mb-1">⏸ Pause</button>
        <label className="text-xs text-[#334155] dark:text-[#cbd5e1]">Speed
          <select id="playback-speed" className="ml-1 rounded">
            <option value="0.5">0.5x</option>
            <option value="1" selected>1x</option>
            <option value="2">2x</option>
            <option value="4">4x</option>
          </select>
        </label>
      </div>
    </div>
  )
} 