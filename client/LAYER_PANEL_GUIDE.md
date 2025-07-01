# Layer Panel System Guide

This collaborative canvas application features a Procreate-style layer panel system that allows users to manage multiple drawing layers with full collaborative capabilities.

## Features

### 🎨 Layer Management

- **Multiple Layers**: Create, delete, and manage multiple drawing layers
- **Layer Visibility**: Toggle layer visibility with eye icons
- **Layer Renaming**: Double-click or use the edit button to rename layers
- **Layer Reordering**: Drag and drop layers to reorder them using the grip handle
- **Active Layer Selection**: Click on a layer to make it the active drawing layer

### 🔄 Collaborative Features

- **Real-time Sync**: All layer operations are synchronized across all connected users
- **Live Updates**: See layer changes from other users in real-time
- **Conflict Resolution**: Built-in conflict resolution using Yjs CRDT

### ⌨️ Keyboard Shortcuts

- **L Key**: Toggle layer panel visibility

## How to Use

### Opening the Layer Panel

1. Click the **Layers** button (📚 icon) in the left toolbar
2. Or press the **L** key on your keyboard

### Layer Operations

#### Creating a New Layer

- Click the **"Add Layer"** button at the bottom of the panel
- New layers are automatically named "Layer X" where X is the next number

#### Selecting the Active Layer

- Click on any layer in the panel to make it active
- The active layer will be highlighted in blue
- All new drawings will be added to the active layer

#### Toggling Layer Visibility

- Click the **eye icon** next to any layer
- Hidden layers (👁️‍🗨️) will not be rendered on the canvas
- Visible layers (👁️) will be shown

#### Renaming Layers

- Click the **edit icon** (✎) next to the layer name
- Type the new name
- Press **Enter** to save or **Escape** to cancel
- Or click outside the input to save

#### Reordering Layers

- Drag the **grip handle** (⋮⋮) to reorder layers
- Layers at the top are rendered first (background)
- Layers at the bottom are rendered last (foreground)

#### Deleting Layers

- Click the **trash icon** (🗑️) next to any layer
- Note: You cannot delete the last remaining layer

## Technical Implementation

### Dependencies

- **@dnd-kit/core**: For smooth drag-and-drop functionality
- **@dnd-kit/sortable**: For layer reordering
- **@dnd-kit/utilities**: For drag-and-drop utilities
- **Yjs**: For collaborative data synchronization

### Architecture

- **LayerPanel.tsx**: Main layer panel component with DnD Kit integration
- **Canvas.tsx**: Layer management functions and Yjs integration
- **DrawingToolbar.tsx**: Layer panel toggle button

### Data Structure

Each layer contains:

```typescript
type Layer = {
  id: string;
  name: string;
  visible: boolean;
  zIndex: number;
  objects: CanvasObject[];
};
```

### Collaborative Features

- All layer operations are stored in a Yjs Array
- Changes are automatically synchronized via Socket.IO
- Real-time awareness of other users' layer operations
- Automatic conflict resolution for concurrent edits

## Styling

The layer panel features:

- **Dark/Light Theme Support**: Automatically adapts to the current theme
- **Smooth Animations**: CSS transitions for panel slide-in/out
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Keyboard navigation and screen reader support

## Browser Compatibility

- Modern browsers with ES6+ support
- Requires WebSocket support for real-time collaboration
- Touch devices supported for mobile drawing and layer management
