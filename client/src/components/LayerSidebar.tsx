import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Eye, EyeOff, GripVertical, Plus, Trash2, Edit2, Check, X } from 'lucide-react'

export interface Layer {
  id: string
  name: string
  visible: boolean
  zIndex: number
  objects: any[]
}

interface LayerSidebarProps {
  layers: Layer[]
  activeLayerId: string
  onSetActive: (layerId: string) => void
  onToggleVisible: (layerId: string, visible: boolean) => void
  onMoveLayer: (layerId: string, toIndex: number) => void
  onAddLayer: () => void
  onRemoveLayer: (layerId: string) => void
  onRenameLayer: (layerId: string, newName: string) => void
}

export const LayerSidebar: React.FC<LayerSidebarProps> = ({
  layers,
  activeLayerId,
  onSetActive,
  onToggleVisible,
  onMoveLayer,
  onAddLayer,
  onRemoveLayer,
  onRenameLayer,
}) => {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleStartEdit = (layer: Layer) => {
    setEditingLayerId(layer.id)
    setEditName(layer.name)
  }

  const handleSaveEdit = () => {
    if (editingLayerId && editName.trim()) {
      onRenameLayer(editingLayerId, editName.trim())
      setEditingLayerId(null)
      setEditName('')
    }
  }

  const handleCancelEdit = () => {
    setEditingLayerId(null)
    setEditName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex)

  return (
    <Card className="w-64 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          Layers
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddLayer}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedLayers.map((layer, index) => (
          <div
            key={layer.id}
            className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${
              layer.id === activeLayerId
                ? 'bg-blue-50 border-blue-200'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            {/* Drag handle */}
            <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
            
            {/* Visibility toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleVisible(layer.id, !layer.visible)}
              className="h-6 w-6 p-0"
            >
              {layer.visible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>

            {/* Layer name */}
            <div className="flex-1 min-w-0">
              {editingLayerId === layer.id ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSaveEdit}
                  className="h-6 text-sm"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => onSetActive(layer.id)}
                  className="text-sm font-medium truncate text-left w-full hover:text-blue-600"
                >
                  {layer.name}
                </button>
              )}
            </div>

            {/* Object count */}
            <Badge variant="secondary" className="text-xs">
              {layer.objects.length}
            </Badge>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {editingLayerId === layer.id ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveEdit}
                    className="h-6 w-6 p-0"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEdit(layer)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  {layers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveLayer(layer.id)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        
        {layers.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-4">
            No layers yet
          </div>
        )}
      </CardContent>
    </Card>
  )
} 