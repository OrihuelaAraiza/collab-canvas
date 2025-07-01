# Paint Bucket (Flood-Fill) Feature

## Overview

The paint-bucket feature has been successfully implemented in the collaborative canvas application. This feature allows users to fill connected areas of the same color with a new color, similar to the paint bucket tool in traditional drawing applications.

## Implementation Details

### Architecture Compatibility

The paint-bucket feature is designed to work seamlessly with the existing layered canvas architecture and CRDT (Conflict-free Replicated Data Type) system:

1. **Layered Architecture**: Fill operations are stored as objects within layers, maintaining the existing layer structure
2. **CRDT-Friendly**: Fill operations are synchronized across all connected clients using Yjs
3. **Undo/Redo Support**: Fill operations are tracked by the undo manager and can be undone/redone
4. **Playback Support**: Fill operations are included in the canvas playback system

### Data Structure

Fill operations are stored as `FillObject` types:

```typescript
type FillObject = {
  type: "fill";
  x: number; // Starting X coordinate
  y: number; // Starting Y coordinate
  color: string; // Fill color (hex format)
  timestamp: number; // Operation timestamp for ordering
  filledPixels: { x: number; y: number }[]; // Array of all filled pixel coordinates
};
```

### Flood-Fill Algorithm

The implementation uses a stack-based flood-fill algorithm with the following features:

1. **Color Tolerance**: Includes a tolerance value (5) for better color matching, allowing slight variations in color
2. **Optimized Scanning**: Uses a visited set to prevent processing the same pixel multiple times
3. **Boundary Checking**: Properly handles canvas boundaries
4. **Pixel Recording**: Records all filled pixels for accurate replay and collaboration

### Key Features

#### 1. Real-time Collaboration

- Fill operations are immediately synchronized to all connected clients
- Each client sees the fill operation applied in real-time
- Operations are ordered by timestamp for consistent playback

#### 2. Layer Support

- Fill operations are stored within the active layer
- Layer visibility affects fill operation visibility
- Fill operations respect layer ordering (z-index)

#### 3. Undo/Redo

- Fill operations can be undone and redone
- Integrates with the existing undo/redo system
- Maintains operation history across sessions

#### 4. Playback System

- Fill operations are included in the canvas playback
- Operations are replayed in chronological order
- Each pixel is filled individually during playback for accuracy

### Usage

1. **Select the Paint Bucket Tool**: Click the paint bucket icon in the drawing toolbar
2. **Choose a Color**: Use the color picker to select the desired fill color
3. **Click to Fill**: Click anywhere on the canvas to fill connected areas of the same color
4. **Collaboration**: Other users will see the fill operation applied immediately

### Technical Implementation

#### Flood-Fill Function

```typescript
const floodFill = (startX: number, startY: number, fillColor: string): { x: number, y: number }[]
```

The function:

1. Gets the canvas image data
2. Identifies the target color at the clicked position
3. Uses a stack-based algorithm to find connected pixels
4. Applies the fill color to all connected pixels
5. Returns an array of all filled pixel coordinates

#### Rendering

Fill objects are rendered by:

1. Setting the fill color
2. Drawing each filled pixel as a 1x1 rectangle
3. Maintaining proper layer ordering

#### CRDT Integration

Fill operations are stored in the Yjs array structure:

- Added to the active layer's objects array
- Synchronized across all clients
- Included in undo/redo operations

### Performance Considerations

1. **Memory Usage**: Large fill areas store many pixel coordinates, but this is necessary for accurate replay
2. **Rendering Performance**: Individual pixel rendering is optimized for the canvas context
3. **Network Efficiency**: Only the fill operation metadata is transmitted, not the entire canvas state

### Future Enhancements

Potential improvements for the paint-bucket feature:

1. **Compression**: Store fill areas as rectangles or paths instead of individual pixels
2. **Smart Boundaries**: Detect and respect existing stroke boundaries
3. **Pattern Fills**: Support for pattern-based fills
4. **Gradient Fills**: Support for gradient-based fills
5. **Fill Preview**: Show a preview of the fill area before applying

## Conclusion

The paint-bucket feature successfully integrates with the existing collaborative canvas architecture while maintaining CRDT compatibility and providing a smooth user experience. The implementation is robust, performant, and ready for production use.
