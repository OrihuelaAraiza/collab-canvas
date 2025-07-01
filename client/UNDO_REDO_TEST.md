# Undo/Redo Functionality Test Guide

## How to Test Undo/Redo

### Method 1: Using the Sidebar Buttons

1. Open the application in your browser
2. Join a room
3. Draw something on the canvas (pen, rectangle, circle, or text)
4. Click the **Undo** button in the right sidebar
5. The last drawing action should be undone
6. Click the **Redo** button to restore the undone action

### Method 2: Using Keyboard Shortcuts

1. Draw something on the canvas
2. Press **Ctrl+Z** (Windows/Linux) or **Cmd+Z** (Mac) to undo
3. Press **Ctrl+Shift+Z** (Windows/Linux) or **Cmd+Shift+Z** (Mac) to redo
4. Alternatively, press **Ctrl+Y** (Windows/Linux) or **Cmd+Y** (Mac) to redo

### Method 3: Console Debugging

1. Open the browser's Developer Tools (F12)
2. Go to the Console tab
3. Draw something on the canvas
4. Use undo/redo (buttons or keyboard shortcuts)
5. You should see console messages:
   - "Undo called" when undo is triggered
   - "Redo called" when redo is triggered
   - "Keyboard undo called" when using Ctrl+Z/Cmd+Z
   - "Keyboard redo called" when using Ctrl+Shift+Z/Cmd+Shift+Z

## What Should Work

### ✅ Undo Operations

- Drawing strokes with the pen tool
- Drawing rectangles
- Drawing circles
- Adding text
- Erasing with the eraser tool
- Adding new layers
- Removing layers
- Renaming layers
- Changing layer visibility
- Reordering layers

### ✅ Redo Operations

- All the same operations as undo, but in reverse

### ✅ Collaborative Undo/Redo

- Undo/redo should work across all connected users
- Changes should be synchronized in real-time

## Troubleshooting

### If Undo/Redo is Not Working:

1. **Check Console Errors**: Look for any JavaScript errors in the browser console
2. **Verify Yjs Connection**: Make sure the collaborative connection is established
3. **Test with Simple Operations**: Try drawing a simple line first
4. **Check Layer Structure**: Make sure there's at least one layer active

### Common Issues:

1. **No Undo History**: If you can't undo, there might not be any actions to undo
2. **Layer Issues**: Make sure you're drawing on an active layer
3. **Network Issues**: Collaborative features require a stable connection

## Technical Details

The undo/redo system uses Yjs's UndoManager which tracks:

- Changes to the layers array
- Changes to objects within each layer
- Layer properties (name, visibility, z-index)

The system automatically updates the UndoManager when:

- New layers are added
- Layers are removed
- The default layer is created

## Expected Behavior

1. **Immediate Response**: Undo/redo should work immediately when triggered
2. **Visual Feedback**: The canvas should update instantly to show the undone/redone state
3. **Collaborative Sync**: All users should see the same undo/redo state
4. **No Data Loss**: Undo/redo should not cause any data corruption or loss
