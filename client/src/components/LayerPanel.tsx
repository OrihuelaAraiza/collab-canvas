import React, { useState } from 'react'
import { GripVertical, Eye, EyeOff, Plus, Trash2, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { DndContext, closestCenter } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { Layer } from './Canvas'

interface LayerPanelProps {
  layers: Layer[]
  active: string
  setActive: (id: string) => void
  moveLayer: (id: string, toIndex: number) => void
  addLayer: () => void
  removeLayer: (id: string) => void
  setLayerVisibility: (id: string, visible: boolean) => void
  renameLayer: (id: string, name: string) => void
  onClose: () => void
  isVisible: boolean
}

// Sortable Layer Item Component
const SortableLayerItem: React.FC<{
  layer: Layer
  isActive: boolean
  isEditing: boolean
  editName: string
  onEditNameChange: (name: string) => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onSetActive: () => void
  onToggleVisibility: () => void
  onRemove: () => void
}> = ({
  layer,
  isActive,
  isEditing,
  editName,
  onEditNameChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onKeyDown,
  onSetActive,
  onToggleVisibility,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`flex items-center p-3 cursor-pointer transition-all ${
        isActive 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      } ${
        isDragging ? 'opacity-50' : ''
      } hover:bg-gray-50 dark:hover:bg-gray-800/80`}
      onClick={onSetActive}
    >
      <GripVertical 
        {...attributes}
        {...listeners}
        className="mr-3 h-4 w-4 text-gray-400 cursor-grab hover:text-gray-600 dark:hover:text-gray-300" 
      />
      
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation()
          onToggleVisibility()
        }}
        className="h-6 w-6 p-0 mr-2"
      >
        {layer.visible ? (
          <Eye className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        ) : (
          <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        )}
      </Button>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={onSaveEdit}
            className="h-6 text-sm border-none focus-visible:ring-0 bg-transparent"
            autoFocus
          />
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium truncate text-gray-900 dark:text-white">
              {layer.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              {layer.objects.length} objects
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 ml-2">
        {isEditing ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSaveEdit}
              className="h-6 w-6 p-0"
            >
              ✓
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelEdit}
              className="h-6 w-6 p-0"
            >
              ✕
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onStartEdit()
              }}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✎
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="h-6 w-6 p-0 text-red-400 hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  active,
  setActive,
  moveLayer,
  addLayer,
  removeLayer,
  setLayerVisibility,
  renameLayer,
  onClose,
  isVisible,
}) => {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex)

  const handleStartEdit = (layer: Layer) => {
    setEditingLayerId(layer.id)
    setEditName(layer.name)
  }

  const handleSaveEdit = () => {
    if (editingLayerId && editName.trim()) {
      renameLayer(editingLayerId, editName.trim())
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    
    const oldIndex = sortedLayers.findIndex(l => l.id === active.id)
    const newIndex = sortedLayers.findIndex(l => l.id === over.id)
    
    if (oldIndex !== -1 && newIndex !== -1) {
      moveLayer(active.id as string, newIndex)
    }
  }

  return (
    <aside className={`fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl z-50 border-l border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${
      isVisible ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">Layers</h3>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={onClose}
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-2 overflow-y-auto h-[calc(100%-8rem)]">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={sortedLayers.map(l => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedLayers.map((layer) => {
              const isActive = layer.id === active
              const isEditing = editingLayerId === layer.id

              return (
                <SortableLayerItem
                  key={layer.id}
                  layer={layer}
                  isActive={isActive}
                  isEditing={isEditing}
                  editName={editName}
                  onEditNameChange={setEditName}
                  onStartEdit={() => handleStartEdit(layer)}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onKeyDown={handleKeyDown}
                  onSetActive={() => setActive(layer.id)}
                  onToggleVisibility={() => setLayerVisibility(layer.id, !layer.visible)}
                  onRemove={() => removeLayer(layer.id)}
                />
              )
            })}
          </SortableContext>
        </DndContext>
        
        {layers.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
            No layers yet
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Button 
          className="w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-400 dark:text-gray-900 dark:hover:bg-blue-500" 
          onClick={addLayer}
          variant="default"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Layer
        </Button>
      </div>
    </aside>
  )
} 