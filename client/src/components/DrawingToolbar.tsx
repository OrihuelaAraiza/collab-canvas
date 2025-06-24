import React from 'react'
import { Button } from '@/components/ui/button'
import { FaPen, FaEraser, FaRegCircle, FaRegSquare, FaTrash } from 'react-icons/fa'
import { IoMdColorPalette } from 'react-icons/io'

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
  return (
    <div className="absolute top-1/2 left-4 -translate-y-1/2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-2 rounded-lg shadow-lg flex flex-col gap-2 border border-slate-200 dark:border-zinc-700 z-10">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTool('pen')}
        title="Pen"
        className={`transition-all hover:bg-slate-200 dark:hover:bg-zinc-700 hover:scale-110 ${
          tool === 'pen' ? 'bg-slate-300 dark:bg-zinc-600' : ''
        }`}
      >
        <FaPen className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTool('eraser')}
        title="Eraser"
        className={`transition-all hover:bg-slate-200 dark:hover:bg-zinc-700 hover:scale-110 ${
          tool === 'eraser' ? 'bg-slate-300 dark:bg-zinc-600' : ''
        }`}
      >
        <FaEraser className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTool('rectangle')}
        title="Rectangle"
        className={`transition-all hover:bg-slate-200 dark:hover:bg-zinc-700 hover:scale-110 ${
          tool === 'rectangle' ? 'bg-slate-300 dark:bg-zinc-600' : ''
        }`}
      >
        <FaRegSquare className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTool('circle')}
        title="Circle"
        className={`transition-all hover:bg-slate-200 dark:hover:bg-zinc-700 hover:scale-110 ${
          tool === 'circle' ? 'bg-slate-300 dark:bg-zinc-600' : ''
        }`}
      >
        <FaRegCircle className="h-5 w-5" />
      </Button>
      
      <div className="w-full h-px bg-slate-300 dark:bg-zinc-600 my-1"></div>

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
        <label htmlFor="thickness-slider" className="text-xs font-medium text-gray-600 dark:text-gray-300">
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
        <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{thickness}</span>
      </div>
    </div>
  )
} 