  import React, { useState, useRef, useEffect } from 'react';
import { Undo2, Redo2, Check, Settings2, Grid3X3, Circle, LayoutTemplate, Save, CloudCheck } from 'lucide-react';
import { Shape, ToolType, Point, PathShape, GeoShape, ConnectorShape, StickyShape, TextShape, Theme, User, GeoType, ConnectorType, BackgroundType, ResizeHandle } from '../../types';
import { COLORS } from '../../constants';
import { useHistory } from '../../hooks/useHistory';
import { Toast } from '../Common/Toast';
import { Modal } from '../Common/Modal';
import { RemoteCursor } from './RemoteCursor';
import { Sidebar } from '../Layout/Sidebar';
import { TopBar } from '../Layout/TopBar';
import { Toolbar } from './Toolbar';
import { PropertiesPanel } from './PropertiesPanel';
import * as Geo from '../../utils/geometry';
import { boardOperations } from '../../lib/database';

interface BoardProps {
  boardId: string;
  onBack: () => void;
  onSwitchBoard?: (boardId: string) => void;
  theme: Theme;
  toggleTheme: () => void;
}

export const Board: React.FC<BoardProps> = ({ boardId, onBack, onSwitchBoard, theme, toggleTheme }) => {
  // Board Settings State
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('grid');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Tools State
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeGeo, setActiveGeo] = useState<GeoType>('rectangle');
  const [activeConnector, setActiveConnector] = useState<ConnectorType>('curved');
  const [color, setColor] = useState(COLORS[7]); // Default Indigo

  // Save state
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [boardLoaded, setBoardLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Board data
  const [currentBoardTitle, setCurrentBoardTitle] = useState('Untitled Board');
  const [allBoards, setAllBoards] = useState<any[]>([]);

  // History
  const { pushState, undo, redo, canUndo, canRedo, currentShapes, setState } = useHistory([]);
  
  // Interaction State
  const [isPanning, setIsPanning] = useState(false);
  const [interactionState, setInteractionState] = useState<'idle' | 'drawing' | 'resizing' | 'rotating' | 'connecting' | 'dragging'>('idle');
  
  // Selection & Transform
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeResizeHandle, setActiveResizeHandle] = useState<ResizeHandle | null>(null);
  
  // Temp Shapes for Rendering while dragging
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [tempShape, setTempShape] = useState<Shape | null>(null);

  // Viewport
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  // UI
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [toast, setToast] = useState<{msg: string, visible: boolean}>({msg: '', visible: false});
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);
  const [remoteCursors] = useState<{id: string, x: number, y: number, user: User}[]>([]);

  // Refs
  const svgRef = useRef<SVGSVGElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const startDragPos = useRef({ x: 0, y: 0 });
  const initialShapeState = useRef<Shape | null>(null);
  const initialRotation = useRef<number>(0);

  // --- Helpers ---
  const showToast = (msg: string) => setToast({ msg, visible: true });

  const copyLink = () => {
    showToast('Link copied to clipboard');
  };

  const getShapeById = (id: string) => currentShapes.find(s => s.id === id);

  // Get handle position in world space (accounting for rotation)
  const getHandlePosition = (shape: GeoShape | StickyShape | TextShape, handle: ResizeHandle, padding: number = 8): Point => {
    const { x, y, width, height, rotation = 0 } = shape;
    const center = { x: x + width / 2, y: y + height / 2 };
    const halfW = width / 2 + padding;
    const halfH = height / 2 + padding;

    let localPos: Point;
    switch (handle) {
      case 'nw': localPos = { x: x - padding, y: y - padding }; break;
      case 'n': localPos = { x: center.x, y: y - padding }; break;
      case 'ne': localPos = { x: x + width + padding, y: y - padding }; break;
      case 'e': localPos = { x: x + width + padding, y: center.y }; break;
      case 'se': localPos = { x: x + width + padding, y: y + height + padding }; break;
      case 's': localPos = { x: center.x, y: y + height + padding }; break;
      case 'sw': localPos = { x: x - padding, y: y + height + padding }; break;
      case 'w': localPos = { x: x - padding, y: center.y }; break;
      case 'rotate': localPos = { x: center.x, y: y - padding - 20 }; break;
      default: localPos = center;
    }

    // If rotated, transform to world space
    if (rotation !== 0) {
      return Geo.rotatePoint(localPos, center, rotation);
    }
    return localPos;
  };

  // Check if a point hits any handle (returns handle type or null)
  const getHandleAtPoint = (shape: GeoShape | StickyShape | TextShape, point: Point): ResizeHandle | null => {
    const handleRadius = 8; // Handle hit radius in world space
    const handles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rotate'];
    
    for (const handle of handles) {
      const handlePos = getHandlePosition(shape, handle);
      if (Geo.distance(point, handlePos) <= handleRadius / zoom) {
        return handle;
      }
    }
    return null;
  };

  // Get cursor style based on tool and state
  const getCursorStyle = () => {
    const isDark = theme === 'dark';

    if (isPanning) return isDark ? 'custom-cursor-grabbing-dark' : 'custom-cursor-grabbing-light';

    switch (activeTool) {
      case 'select':
        return 'cursor-default';
      case 'hand':
        return isDark ? 'custom-cursor-grab-dark' : 'custom-cursor-grab-light';
      case 'pen':
      case 'geo':
      case 'sticky':
      case 'text':
      case 'connector':
        return 'cursor-crosshair';
      default:
        return 'cursor-default';
    }
  };

  // Properties Panel Handlers
  const handleShapeUpdate = (updates: Partial<Shape>) => {
    if (!selectedId) return;
    const newShapes = currentShapes.map(s => s.id === selectedId ? { ...s, ...updates } as Shape : s);
    pushState(newShapes);
    // Also update temp if exists to reflect immediately without drag end
    if (tempShape) setTempShape({ ...tempShape, ...updates } as Shape);
  };

  const handleDelete = () => {
    if (selectedId) {
      // Also remove any connectors that are bound to this shape
      const newShapes = currentShapes.filter(s => {
        if (s.id === selectedId) return false;

        // Remove connectors that are bound to the deleted shape
        if (s.type === 'connector') {
          const conn = s as ConnectorShape;
          if (conn.startBindingId === selectedId || conn.endBindingId === selectedId) {
            return false; // Remove this connector too
          }
        }

        return true;
      });

      pushState(newShapes);
      setSelectedId(null);
      setTempShape(null);
      showToast('Item deleted');
    }
  };

  const handleDuplicate = () => {
    if (selectedId) {
      const s = getShapeById(selectedId);
      if (s) {
        const newShape = { 
          ...s, 
          id: Date.now().toString(), 
          x: (s as any).x ? (s as any).x + 20 : 0, 
          y: (s as any).y ? (s as any).y + 20 : 0 
        } as Shape;
        pushState([...currentShapes, newShape]);
        setSelectedId(newShape.id);
        showToast('Duplicated');
      }
    }
  };

  const handleMoveLayer = (dir: 'up' | 'down') => {
    if (!selectedId) return;
    const idx = currentShapes.findIndex(s => s.id === selectedId);
    if (idx === -1) return;

    const newShapes = [...currentShapes];
    if (dir === 'up' && idx < newShapes.length - 1) {
      [newShapes[idx], newShapes[idx + 1]] = [newShapes[idx + 1], newShapes[idx]];
    } else if (dir === 'down' && idx > 0) {
      [newShapes[idx], newShapes[idx - 1]] = [newShapes[idx - 1], newShapes[idx]];
    }
    pushState(newShapes);
  };

  // --- Event Handlers ---

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isMenuOpen || isSettingsOpen) return;
    
    // 1. Coordinates
    const screen = 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
    const world = Geo.screenToWorld(screen.x, screen.y, pan, zoom, svgRef);
    
    lastMousePos.current = screen;
    startDragPos.current = world;

    // 2. Hand Tool / Middle Mouse / Space -> Pan
    if (activeTool === 'hand' || (activeTool === 'select' && ('button' in e && e.button === 1 || (e as React.MouseEvent).ctrlKey))) {
      setIsPanning(true);
      return;
    }

    // 3. Handle Hit Detection (check handles before shape body)
    let clickedHandle: ResizeHandle | null = null;
    if (activeTool === 'select' && selectedId) {
      const selectedShape = getShapeById(selectedId);
      // Only check handles for resizable shapes
      if (selectedShape && (selectedShape.type === 'geo' || selectedShape.type === 'sticky' || selectedShape.type === 'text')) {
        clickedHandle = getHandleAtPoint(selectedShape as GeoShape | StickyShape | TextShape, world);
        if (clickedHandle) {
          setActiveResizeHandle(clickedHandle);
          initialShapeState.current = selectedShape;
          setTempShape(selectedShape);
          
          if (clickedHandle === 'rotate') {
            setInteractionState('rotating');
            initialRotation.current = (selectedShape as any).rotation || 0;
          } else {
            setInteractionState('resizing');
          }
          return; // Early return, don't process shape body hit
        }
      }
    }

    // 4. Hit Test Shapes (Selection)
    // We traverse reverse to pick top-most
    let clickedShapeId: string | null = null;
    for (let i = currentShapes.length - 1; i >= 0; i--) {
      if (Geo.isPointInShape(world, currentShapes[i])) {
        clickedShapeId = currentShapes[i].id;
        break;
      }
    }

    if (activeTool === 'select') {
      if (clickedShapeId) {
        // If clicking a new shape or the same shape
        setSelectedId(clickedShapeId);
        setInteractionState('idle'); 
        setActiveResizeHandle(null);
        
        // Prepare for potential drag
        const s = getShapeById(clickedShapeId)!;
        initialShapeState.current = s;
        setTempShape(s);
        
        // We set state to dragging immediately if clicked on shape body
        setInteractionState('dragging');

      } else {
        setSelectedId(null);
        setTempShape(null);
        setActiveResizeHandle(null);
        setIsPanning(true); // Dragging on canvas pans in select mode
      }
    } 
    else if (activeTool === 'pen') {
      setInteractionState('drawing');
      setCurrentPoints([world]);
    }
    else if (activeTool === 'connector') {
      setInteractionState('connecting');
      // Snap to shape if clicked on one
      const startBinding = clickedShapeId || undefined;
      setTempShape({
        id: 'temp_conn',
        type: 'connector',
        subType: activeConnector,
        color,
        strokeWidth: 2,
        strokeStyle: 'solid',
        startPoint: world,
        endPoint: world,
        startBindingId: startBinding,
        endArrowhead: true
      } as ConnectorShape);
    }
    else if (activeTool === 'geo' || activeTool === 'sticky' || activeTool === 'text') {
      setInteractionState('drawing');
      const id = Date.now().toString();
      
      const newShape: any = {
        id,
        type: activeTool,
        color: activeTool === 'sticky' || activeTool === 'text' ? (activeTool === 'sticky' ? '#000000' : color) : color,
        backgroundColor: activeTool === 'sticky' ? '#FCD34D' : 'transparent',
        strokeWidth: 2,
        strokeStyle: 'solid',
        opacity: 1,
        x: world.x,
        y: world.y,
        width: 0,
        height: 0,
        rotation: 0
      };
      
      if (activeTool === 'geo') {
          newShape.subType = activeGeo;
          if (activeGeo === 'rectangle' || activeGeo === 'rounded_rect') {
             newShape.cornerRadius = 0;
          }
      }
      if (activeTool === 'sticky') {
        newShape.text = 'New Note';
        newShape.width = 150; // default size
        newShape.height = 150;
      }
      if (activeTool === 'text') {
        newShape.text = 'Type here';
        newShape.fontSize = 24;
        newShape.width = 200; // default width
        newShape.height = 40; // approx height
      }

      setTempShape(newShape);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const screen = 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
    const world = Geo.screenToWorld(screen.x, screen.y, pan, zoom, svgRef);
    
    if (isPanning) {
      const dx = screen.x - lastMousePos.current.x;
      const dy = screen.y - lastMousePos.current.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      lastMousePos.current = screen;
      return;
    }

    if (interactionState === 'drawing' && activeTool === 'pen') {
      setCurrentPoints(prev => [...prev, world]);
    } 
    else if (interactionState === 'drawing' && tempShape) {
       // Geo/Sticky/Text creation dragging
       const start = startDragPos.current;
       const width = world.x - start.x;
       const height = world.y - start.y;
       
       setTempShape({
         ...tempShape,
         width: Math.abs(width),
         height: Math.abs(height),
         x: width < 0 ? world.x : start.x,
         y: height < 0 ? world.y : start.y
       } as Shape);
    }
    else if (interactionState === 'dragging' && selectedId && tempShape) {
       const dx = world.x - startDragPos.current.x;
       const dy = world.y - startDragPos.current.y;
       if (initialShapeState.current) {
          const s = initialShapeState.current as any;
          const updatedShape = {
             ...tempShape,
             x: s.x + dx,
             y: s.y + dy
          } as Shape;
          setTempShape(updatedShape);

          // Also update any connectors bound to this shape in real-time
          // Note: We can't pushState here as it would add to history on every pixel move
          // Instead, we'll update the visual representation only
       }
    }
    else if (interactionState === 'resizing' && selectedId && tempShape && activeResizeHandle && initialShapeState.current) {
       const initial = initialShapeState.current as GeoShape | StickyShape | TextShape;
       const { x: initialX, y: initialY, width: initialWidth, height: initialHeight, rotation = 0 } = initial;
       const center = { x: initialX + initialWidth / 2, y: initialY + initialHeight / 2 };
       
       // Transform mouse position to shape's local space (accounting for rotation)
       const localPoint = rotation !== 0 ? Geo.rotatePoint(world, center, -rotation) : world;
       
       let newX = initialX;
       let newY = initialY;
       let newWidth = initialWidth;
       let newHeight = initialHeight;
       
       const minSize = 10; // Minimum width/height
       
       // Calculate new bounds based on handle type
       switch (activeResizeHandle) {
         case 'nw':
           newWidth = Math.max(minSize, initialX + initialWidth - localPoint.x);
           newHeight = Math.max(minSize, initialY + initialHeight - localPoint.y);
           newX = localPoint.x;
           newY = localPoint.y;
           break;
         case 'n':
           newHeight = Math.max(minSize, initialY + initialHeight - localPoint.y);
           newY = localPoint.y;
           break;
         case 'ne':
           newWidth = Math.max(minSize, localPoint.x - initialX);
           newHeight = Math.max(minSize, initialY + initialHeight - localPoint.y);
           newY = localPoint.y;
           break;
         case 'e':
           newWidth = Math.max(minSize, localPoint.x - initialX);
           break;
         case 'se':
           newWidth = Math.max(minSize, localPoint.x - initialX);
           newHeight = Math.max(minSize, localPoint.y - initialY);
           break;
         case 's':
           newHeight = Math.max(minSize, localPoint.y - initialY);
           break;
         case 'sw':
           newWidth = Math.max(minSize, initialX + initialWidth - localPoint.x);
           newHeight = Math.max(minSize, localPoint.y - initialY);
           newX = localPoint.x;
           break;
         case 'w':
           newWidth = Math.max(minSize, initialX + initialWidth - localPoint.x);
           newX = localPoint.x;
           break;
       }
       
       setTempShape({
         ...tempShape,
         x: newX,
         y: newY,
         width: newWidth,
         height: newHeight
       } as Shape);
    }
    else if (interactionState === 'rotating' && selectedId && tempShape && initialShapeState.current) {
       const initial = initialShapeState.current as GeoShape | StickyShape | TextShape;
       const center = { x: initial.x + initial.width / 2, y: initial.y + initial.height / 2 };
       
       // Calculate angle from center to current mouse position
       const dx = world.x - center.x;
       const dy = world.y - center.y;
       const angleRad = Math.atan2(dy, dx);
       const angleDeg = (angleRad * 180) / Math.PI;
       
       // Calculate angle from center to start position for relative rotation
       const startDx = startDragPos.current.x - center.x;
       const startDy = startDragPos.current.y - center.y;
       const startAngleRad = Math.atan2(startDy, startDx);
       const startAngleDeg = (startAngleRad * 180) / Math.PI;
       
       // Relative rotation
       const rotationDelta = angleDeg - startAngleDeg;
       const newRotation = initialRotation.current + rotationDelta;
       
       setTempShape({
         ...tempShape,
         rotation: newRotation
       } as Shape);
    }
    else if (interactionState === 'connecting' && tempShape) {
       // Check if hovering over a shape for snap preview
       let hoverShapeId: string | undefined = undefined;
       for (let i = currentShapes.length - 1; i >= 0; i--) {
         if (Geo.isPointInShape(world, currentShapes[i])) {
           hoverShapeId = currentShapes[i].id;
           break;
         }
       }

       let endPoint = world;
       if (hoverShapeId) {
         const hoverShape = currentShapes.find(s => s.id === hoverShapeId);
         if (hoverShape) {
           const conn = tempShape as ConnectorShape;
           endPoint = Geo.getPerimeterPoint(hoverShape, conn.startPoint);
         }
       }

       setTempShape({
          ...tempShape,
          endPoint
       } as ConnectorShape);
    }
    
    lastMousePos.current = screen;
  };

  const handlePointerUp = (e?: React.MouseEvent | React.TouchEvent) => {
    setIsPanning(false);

    if (interactionState === 'drawing') {
       if (activeTool === 'pen') {
          if (currentPoints.length > 1) {
             const newShape: PathShape = {
                id: Date.now().toString(),
                type: 'pen',
                color,
                points: currentPoints,
                strokeWidth: 4,
                opacity: 1
             };
             pushState([...currentShapes, newShape]);
          }
          setCurrentPoints([]);
       } else if (tempShape) {
          if ((tempShape as any).width && (tempShape as any).width > 5) {
             pushState([...currentShapes, tempShape]);
             setSelectedId(tempShape.id);
             setActiveTool('select');
          }
       }
    } else if (interactionState === 'dragging' && tempShape && selectedId) {
       // Update connectors that are bound to the dragged shape
       const newShapes = currentShapes.map(s => {
         if (s.id === selectedId) return tempShape;

         // Update connectors bound to this shape
         if (s.type === 'connector') {
           const conn = s as ConnectorShape;
           let updated = false;
           let newConn = { ...conn };

           if (conn.startBindingId === selectedId) {
             newConn.startPoint = Geo.getPerimeterPoint(tempShape, conn.endPoint);
             updated = true;
           }
           if (conn.endBindingId === selectedId) {
             newConn.endPoint = Geo.getPerimeterPoint(tempShape, conn.startPoint);
             updated = true;
           }

           return updated ? newConn : s;
         }

         return s;
       });
       pushState(newShapes);
    } else if (interactionState === 'connecting' && tempShape && e) {
       // Check if we're ending on a shape
       const screen = 'touches' in e ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY } : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
       const world = Geo.screenToWorld(screen.x, screen.y, pan, zoom, svgRef);

       let endShapeId: string | undefined = undefined;
       for (let i = currentShapes.length - 1; i >= 0; i--) {
         if (Geo.isPointInShape(world, currentShapes[i])) {
           endShapeId = currentShapes[i].id;
           break;
         }
       }

       // Update connector with end binding and snap to perimeter
       const conn = tempShape as ConnectorShape;
       const finalConn = { ...conn, id: Date.now().toString() };

       if (endShapeId) {
         finalConn.endBindingId = endShapeId;
         const endShape = currentShapes.find(s => s.id === endShapeId);
         if (endShape) {
           finalConn.endPoint = Geo.getPerimeterPoint(endShape, conn.startPoint);
         }
       }

       // Also snap start point if bound
       if (conn.startBindingId) {
         const startShape = currentShapes.find(s => s.id === conn.startBindingId);
         if (startShape) {
           finalConn.startPoint = Geo.getPerimeterPoint(startShape, finalConn.endPoint);
         }
       }

       pushState([...currentShapes, finalConn]);
       setActiveTool('select');
    } else if ((interactionState === 'resizing' || interactionState === 'rotating') && tempShape && selectedId) {
       // Commit resize/rotate to shape
       const newShapes = currentShapes.map(s => s.id === selectedId ? tempShape : s);
       pushState(newShapes);
    }

    setInteractionState('idle');
    setTempShape(null);
    setActiveResizeHandle(null);
    initialShapeState.current = null;
    initialRotation.current = 0;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
       e.preventDefault();
       const zoomSensitivity = 0.001;
       const newZoom = Math.min(Math.max(0.1, zoom - e.deltaY * zoomSensitivity), 5);
       setZoom(newZoom);
    } else {
       setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  // Load board data and all boards on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [board, boards] = await Promise.all([
          boardOperations.getBoard(boardId),
          boardOperations.getBoards()
        ]);

        if (board) {
          setState(board.shapes || []);
          setCurrentBoardTitle(board.title);
          setBoardLoaded(true);
          // Update last accessed time
          await boardOperations.updateLastAccessed(boardId);
        }

        setAllBoards(boards);
      } catch (error) {
        console.error('Error loading board:', error);
        showToast('Failed to load board');
      }
    };

    loadData();
  }, [boardId]);

  // Handle board switch
  const handleSwitchBoard = async (newBoardId: string) => {
    // Save current board before switching
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    try {
      await boardOperations.saveShapes(boardId, currentShapes);
      if (onSwitchBoard) {
        onSwitchBoard(newBoardId);
      }
    } catch (error) {
      console.error('Error saving board before switch:', error);
      showToast('Failed to save board');
    }
  };

  // Auto-save shapes when changed
  useEffect(() => {
    if (!boardLoaded) return; // Don't save until initial load is complete

    setSaveState('unsaved');

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout to save after 5 seconds
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveState('saving');
        await boardOperations.saveShapes(boardId, currentShapes);
        setSaveState('saved');
        setLastSaveTime(new Date());
      } catch (error) {
        console.error('Error saving board:', error);
        setSaveState('unsaved');
        showToast('Failed to save changes');
      }
    }, 5000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentShapes, boardLoaded, boardId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const isTyping = document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT';

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }

      // Delete
      if ((e.key === 'Backspace' || e.key === 'Delete') && !isTyping) {
        if (selectedId) {
          e.preventDefault();
          handleDelete();
        }
      }

      // Tool shortcuts (only when not typing)
      if (!isTyping && !e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            setActiveTool('select');
            break;
          case 'h':
            setActiveTool('hand');
            break;
          case 'p':
            setActiveTool('pen');
            break;
          case 'g':
            setActiveTool('geo');
            break;
          case 'c':
            setActiveTool('connector');
            break;
          case 's':
            setActiveTool('sticky');
            break;
          case 't':
            setActiveTool('text');
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, currentShapes, undo, redo]);

  const renderShape = (shape: Shape) => {
     const isSelected = selectedId === shape.id;
     
     if (shape.type === 'pen') {
        const s = shape as PathShape;
        const d = `M ${s.points.map(p => `${p.x},${p.y}`).join(' L ')}`;
        return <path key={s.id} d={d} stroke={s.color} strokeWidth={s.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={s.opacity} />;
     }
     
     if (shape.type === 'connector') {
        const s = shape as ConnectorShape;

        // Compute actual endpoints based on bindings
        let startPoint = s.startPoint;
        let endPoint = s.endPoint;

        // If dragging a bound shape, use tempShape
        const getShape = (id: string) => {
          if (tempShape && tempShape.id === id) return tempShape;
          return currentShapes.find(sh => sh.id === id);
        };

        if (s.startBindingId) {
          const startShape = getShape(s.startBindingId);
          if (startShape) {
            startPoint = Geo.getPerimeterPoint(startShape, endPoint);
          }
        }

        if (s.endBindingId) {
          const endShape = getShape(s.endBindingId);
          if (endShape) {
            endPoint = Geo.getPerimeterPoint(endShape, startPoint);
          }
        }

        // Re-compute start if both are bound (for accuracy)
        if (s.startBindingId) {
          const startShape = getShape(s.startBindingId);
          if (startShape) {
            startPoint = Geo.getPerimeterPoint(startShape, endPoint);
          }
        }

        let d = `M ${startPoint.x},${startPoint.y} L ${endPoint.x},${endPoint.y}`;
        if (s.subType === 'curved') {
           // Calculate distance between endpoints for proportional curvature
           const connectorLength = Math.sqrt(
             Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
           );

           // Calculate control points that extend outward from shape centers (Excalidraw-style)
           const getControlPoint = (point: Point, shape: Shape | undefined, otherPoint: Point): Point => {
             // More pronounced curvature: minimum 80px, scales with distance
             const offsetDist = Math.max(80, connectorLength * 0.4);

             if (shape) {
               const shapeData = shape as any;
               if (shapeData.x !== undefined && shapeData.width) {
                 const center = {
                   x: shapeData.x + shapeData.width / 2,
                   y: shapeData.y + shapeData.height / 2
                 };

                 // Direction from shape center outward through attachment point
                 const dx = point.x - center.x;
                 const dy = point.y - center.y;
                 const len = Math.sqrt(dx * dx + dy * dy);

                 if (len > 0) {
                   // Extend in the direction away from the shape center
                   return {
                     x: point.x + (dx / len) * offsetDist,
                     y: point.y + (dy / len) * offsetDist
                   };
                 }
               }
             }

             // Fallback: extend towards the other point
             const dx = otherPoint.x - point.x;
             const dy = otherPoint.y - point.y;
             const len = Math.sqrt(dx * dx + dy * dy);
             if (len > 0) {
               return {
                 x: point.x + (dx / len) * offsetDist,
                 y: point.y + (dy / len) * offsetDist
               };
             }

             return point;
           };

           const startShape = s.startBindingId ? getShape(s.startBindingId) : undefined;
           const endShape = s.endBindingId ? getShape(s.endBindingId) : undefined;

           const c1 = getControlPoint(startPoint, startShape, endPoint);
           const c2 = getControlPoint(endPoint, endShape, startPoint);

           d = `M ${startPoint.x},${startPoint.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${endPoint.x},${endPoint.y}`;
        } else if (s.subType === 'elbow') {
           const points = Geo.getElbowPoints(startPoint, endPoint);
           d = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
        }

        // Add visual selection indicator
        const strokeWidth = isSelected ? 3 : 2;
        const strokeColor = isSelected ? '#6366f1' : s.color;

        // Apply stroke style (solid, dashed, dotted)
        let strokeDasharray: string | undefined;
        if (s.strokeStyle === 'dashed') {
          strokeDasharray = '8 4';
        } else if (s.strokeStyle === 'dotted') {
          strokeDasharray = '2 4';
        }

        return <path key={s.id} d={d} stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} fill="none" markerEnd={s.endArrowhead ? `url(#arrow-${s.id})` : undefined} opacity={s.opacity} strokeLinecap="round" />;
     }

     const s = shape as GeoShape | StickyShape | TextShape;
     const center = { x: s.x + s.width/2, y: s.y + s.height/2 };
     
     return (
       <g key={s.id} transform={`rotate(${s.rotation || 0} ${center.x} ${center.y})`}>
          {shape.type === 'geo' && (() => {
             const g = shape as GeoShape;
             
             // Apply stroke style (solid, dashed, dotted)
             let strokeDasharray: string | undefined;
             if (g.strokeStyle === 'dashed') {
               strokeDasharray = '8 4';
             } else if (g.strokeStyle === 'dotted') {
               strokeDasharray = '2 4';
             }
             
             const commonProps = {
                 fill: g.backgroundColor,
                 stroke: g.color,
                 strokeWidth: g.strokeWidth,
                 opacity: g.opacity,
                 strokeDasharray
             };
             
             switch (g.subType) {
                 case 'circle':
                     return <ellipse cx={center.x} cy={center.y} rx={g.width/2} ry={g.height/2} {...commonProps} transform={`translate(${-center.x + g.x + g.width/2}, ${-center.y + g.y + g.height/2})`} />;
                 case 'triangle':
                     return <path d={Geo.getRoundedTrianglePath(g.width, g.height, g.cornerRadius || 0)} transform={`translate(${g.x}, ${g.y})`} {...commonProps} />;
                 case 'diamond':
                     return <path d={Geo.getRoundedDiamondPath(g.width, g.height, g.cornerRadius || 0)} transform={`translate(${g.x}, ${g.y})`} {...commonProps} />;
                 case 'star':
                     return <path d={Geo.getStarPath(g.width, g.height, g.cornerRadius || 0)} transform={`translate(${g.x}, ${g.y})`} {...commonProps} />;
                 case 'bubble':
                     return <path d={Geo.getBubblePath(g.width, g.height)} transform={`translate(${g.x}, ${g.y})`} {...commonProps} />;
                 case 'arrow_shape':
                     return <path d={Geo.getArrowPath(g.width, g.height)} transform={`translate(${g.x}, ${g.y})`} {...commonProps} />;
                 case 'rounded_rect':
                 case 'rectangle':
                 default:
                     return <rect x={g.x} y={g.y} width={g.width} height={g.height} rx={g.cornerRadius || 0} {...commonProps} />;
             }
          })()}

          {shape.type === 'sticky' && (
             <g>
                <rect x={s.x} y={s.y} width={s.width} height={s.height} fill={s.backgroundColor} className="shadow-lg" />
                <foreignObject x={s.x} y={s.y} width={s.width} height={s.height}>
                   <div className="w-full h-full p-2 font-hand text-xl overflow-hidden break-words" style={{color: s.color}}>{(s as StickyShape).text}</div>
                </foreignObject>
             </g>
          )}
          {shape.type === 'text' && (
             <text x={s.x} y={s.y + (s as TextShape).fontSize} fill={s.color} fontSize={(s as TextShape).fontSize} fontFamily="sans-serif">{(s as TextShape).text}</text>
          )}
          
          {isSelected && (
             <rect x={s.x-4} y={s.y-4} width={s.width+8} height={s.height+8} stroke="#6366f1" strokeWidth={2} fill="none" strokeDasharray="4" />
          )}
       </g>
     );
  };

  // Render resize/rotate handles for selected resizable shapes
  const renderHandles = (shape: Shape) => {
    if (!(shape.type === 'geo' || shape.type === 'sticky' || shape.type === 'text')) return null;
    if (selectedId !== shape.id) return null;
    if (interactionState === 'drawing' || interactionState === 'connecting') return null;
    
    const s = shape as GeoShape | StickyShape | TextShape;
    const handles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    const handleSize = 8 / zoom; // Scale handle size with zoom
    
    return (
      <g key={`handles-${s.id}`}>
        {/* Resize handles */}
        {handles.map(handle => {
          const pos = getHandlePosition(s, handle);
          const isActive = activeResizeHandle === handle;
          return (
            <circle
              key={handle}
              cx={pos.x}
              cy={pos.y}
              r={handleSize}
              fill="#6366f1"
              stroke="white"
              strokeWidth={1.5 / zoom}
              style={{ cursor: 'pointer' }}
              opacity={isActive ? 1 : 0.9}
            />
          );
        })}
        {/* Rotation handle */}
        {(() => {
          const pos = getHandlePosition(s, 'rotate');
          const isActive = activeResizeHandle === 'rotate';
          return (
            <g>
              {/* Line from center to rotation handle */}
              <line
                x1={s.x + s.width / 2}
                y1={s.y + s.height / 2}
                x2={pos.x}
                y2={pos.y}
                stroke="#6366f1"
                strokeWidth={1 / zoom}
                strokeDasharray={`${4 / zoom} ${2 / zoom}`}
                opacity={0.5}
              />
              {/* Rotation handle circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={handleSize}
                fill="#6366f1"
                stroke="white"
                strokeWidth={1.5 / zoom}
                style={{ cursor: 'grab' }}
                opacity={isActive ? 1 : 0.9}
              />
            </g>
          );
        })()}
      </g>
    );
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-cream-50 dark:bg-zinc-900 flex flex-col relative touch-none">
       <style>{`
         .custom-cursor-grab-light {
           cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" stroke="%23000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>') 12 12, grab;
         }
         .custom-cursor-grab-dark {
           cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" stroke="%23FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>') 12 12, grab;
         }
         .custom-cursor-grabbing-light {
           cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 11.5V9a2 2 0 1 0-4 0v2M14 10V8a2 2 0 1 0-4 0v2M10 9.5V6a2 2 0 1 0-4 0v8M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.82-2.82L7 15.5" stroke="%23000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>') 12 12, grabbing;
         }
         .custom-cursor-grabbing-dark {
           cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 11.5V9a2 2 0 1 0-4 0v2M14 10V8a2 2 0 1 0-4 0v2M10 9.5V6a2 2 0 1 0-4 0v8M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.82-2.82L7 15.5" stroke="%23FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>') 12 12, grabbing;
         }
       `}</style>
       <Sidebar
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          theme={theme}
          isGridOn={backgroundType === 'grid'}
          toggleGrid={() => setBackgroundType(prev => prev === 'grid' ? 'none' : 'grid')}
          onCreateBoard={() => pushState([])}
          onShowShortcuts={() => setShowShortcuts(true)}
          onOpenSettings={() => { setIsMenuOpen(false); setIsSettingsOpen(true); }}
          onBackToDashboard={onBack}
          currentBoardTitle={currentBoardTitle}
          currentBoardId={boardId}
          boards={allBoards}
          onSwitchBoard={handleSwitchBoard}
       />
       
       <TopBar
          onMenuClick={() => setIsMenuOpen(true)}
          collaboratorsOpen={collaboratorsOpen}
          setCollaboratorsOpen={setCollaboratorsOpen}
          onShare={copyLink}
          theme={theme}
          toggleTheme={toggleTheme}
          onLogout={onBack}
          boardTitle={currentBoardTitle}
          onRenameBoard={async (newTitle) => {
            try {
              await boardOperations.updateBoardTitle(boardId, newTitle);
              setCurrentBoardTitle(newTitle);
              showToast('Board renamed');
            } catch (error) {
              console.error('Error renaming board:', error);
              showToast('Failed to rename board');
            }
          }}
       />
       
       <div className={`flex-1 relative ${getCursorStyle()}`} onWheel={handleWheel}>
          <svg 
            ref={svgRef}
            className="w-full h-full block touch-none"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          >
             <defs>
                {/* Grid Pattern */}
                <pattern id="grid" width={40 * zoom} height={40 * zoom} patternUnits="userSpaceOnUse" x={pan.x} y={pan.y}>
                   <path d={`M ${40 * zoom} 0 L 0 0 0 ${40 * zoom}`} fill="none" stroke={theme === 'light' ? '#e5e7eb' : '#27272a'} strokeWidth={1} />
                </pattern>
                
                {/* Dots Pattern */}
                <pattern id="dots" width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse" x={pan.x} y={pan.y}>
                    <circle cx={1 * zoom} cy={1 * zoom} r={1.5 * zoom} fill={theme === 'light' ? '#d1d5db' : '#3f3f46'} />
                </pattern>

                {currentShapes.filter(s => s.type === 'connector').map(s => (
                   <marker key={`arrow-${s.id}`} id={`arrow-${s.id}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L0,6 L9,3 z" fill={s.color} />
                   </marker>
                ))}
             </defs>
             
             {/* Background Rendering */}
             {backgroundType === 'grid' && <rect width="100%" height="100%" fill="url(#grid)" />}
             {backgroundType === 'dots' && <rect width="100%" height="100%" fill="url(#dots)" />}
             
             <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {currentShapes.map(s => (tempShape && s.id === tempShape.id) ? null : renderShape(s))}
                {tempShape && renderShape(tempShape)}
                {activeTool === 'pen' && interactionState === 'drawing' && currentPoints.length > 0 && (
                   <path d={`M ${currentPoints.map(p => `${p.x},${p.y}`).join(' L ')}`} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                )}
                {/* Render handles for selected shapes */}
                {activeTool === 'select' && selectedId && (() => {
                  // Prioritize tempShape during resize/rotate so handles update smoothly
                  const selectedShape = (tempShape && tempShape.id === selectedId) ? tempShape : getShapeById(selectedId);
                  return selectedShape ? renderHandles(selectedShape) : null;
                })()}
                {remoteCursors.map(c => <RemoteCursor key={c.id} user={c.user} x={c.x} y={c.y} />)}
             </g>
          </svg>
          
          {selectedId && !tempShape && (() => {
             const s = getShapeById(selectedId);
             return s ? (
               <PropertiesPanel 
                  shape={s} 
                  onChange={handleShapeUpdate} 
                  onDelete={handleDelete} 
                  onDuplicate={handleDuplicate} 
                  onMoveLayer={handleMoveLayer}
               />
             ) : null;
          })()}

          <Toolbar 
            activeTool={activeTool} 
            setActiveTool={setActiveTool}
            activeGeo={activeGeo} 
            setActiveGeo={setActiveGeo}
            activeConnector={activeConnector} 
            setActiveConnector={setActiveConnector}
            color={color} 
            setColor={setColor}
            onClear={() => pushState([])}
            onAiGenerate={() => showToast("AI Generation coming soon!")}
            isHidden={interactionState !== 'idle'}
          />

          <div className="absolute bottom-6 right-6 flex items-center space-x-2">
             {/* Save indicator */}
             <div className="px-3 py-2 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex items-center space-x-2 text-sm">
                {saveState === 'saving' && (
                  <>
                    <Save size={16} className="text-gray-500 animate-pulse" />
                    <span className="text-gray-500">Saving...</span>
                  </>
                )}
                {saveState === 'saved' && (
                  <>
                    <CloudCheck size={16} className="text-green-500" />
                    <span className="text-gray-500">
                      {lastSaveTime ? `Saved ${Math.floor((new Date().getTime() - lastSaveTime.getTime()) / 1000)}s ago` : 'Saved'}
                    </span>
                  </>
                )}
                {saveState === 'unsaved' && (
                  <>
                    <Save size={16} className="text-orange-500" />
                    <span className="text-gray-500">Unsaved</span>
                  </>
                )}
             </div>
             <button onClick={undo} disabled={!canUndo} className="p-3 bg-white dark:bg-zinc-800 rounded-full shadow-lg disabled:opacity-50 text-gray-700 dark:text-gray-200"><Undo2 size={20} /></button>
             <button onClick={redo} disabled={!canRedo} className="p-3 bg-white dark:bg-zinc-800 rounded-full shadow-lg disabled:opacity-50 text-gray-700 dark:text-gray-200"><Redo2 size={20} /></button>
          </div>
       </div>
       
       <Toast message={toast.msg} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

       {/* Settings Modal */}
       <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="App Settings">
          <div className="space-y-6">
             {/* Canvas Appearance */}
             <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Canvas Background</h4>
                <div className="grid grid-cols-3 gap-3">
                   <button 
                     onClick={() => setBackgroundType('grid')}
                     className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${backgroundType === 'grid' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-transparent bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200'}`}
                   >
                      <Grid3X3 size={24} className={backgroundType === 'grid' ? 'text-orange-500' : 'text-gray-500'} />
                      <span className="text-xs font-medium mt-2 text-gray-700 dark:text-gray-200">Grid</span>
                   </button>
                   <button 
                     onClick={() => setBackgroundType('dots')}
                     className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${backgroundType === 'dots' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-transparent bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200'}`}
                   >
                      <Circle size={24} className={backgroundType === 'dots' ? 'text-orange-500' : 'text-gray-500'} />
                      <span className="text-xs font-medium mt-2 text-gray-700 dark:text-gray-200">Dots</span>
                   </button>
                   <button 
                     onClick={() => setBackgroundType('none')}
                     className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${backgroundType === 'none' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-transparent bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200'}`}
                   >
                      <LayoutTemplate size={24} className={backgroundType === 'none' ? 'text-orange-500' : 'text-gray-500'} />
                      <span className="text-xs font-medium mt-2 text-gray-700 dark:text-gray-200">Blank</span>
                   </button>
                </div>
             </div>

             {/* Theme Preferences */}
             <div>
               <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Theme</h4>
               <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900/50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Dark Mode</span>
                  <button 
                    onClick={toggleTheme} 
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${theme === 'dark' ? 'bg-orange-500' : 'bg-gray-300'}`}
                  >
                     <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
               </div>
             </div>
          </div>
       </Modal>

       {/* Shortcuts Modal */}
       <Modal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} title="Keyboard Shortcuts">
          <div className="space-y-4">
             <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Tools</h4>
                <div className="space-y-1">
                   <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Select Tool</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded">V</kbd>
                   </div>
                   <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Hand Tool</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded">H</kbd>
                   </div>
                   <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Pen Tool</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded">P</kbd>
                   </div>
                   <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Geo Shapes</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded">G</kbd>
                   </div>
                   <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Connector</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded">C</kbd>
                   </div>
                   <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Sticky Note</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded">S</kbd>
                   </div>
                   <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Text</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded">T</kbd>
                   </div>
                </div>
             </div>

             <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Actions</h4>
                <div className="space-y-1">
                   <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Undo</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded">Ctrl + Z</kbd>
                   </div>
                   <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Redo</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded">Ctrl + Shift + Z</kbd>
                   </div>
                   <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Delete Selected</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded">Delete / Backspace</kbd>
                   </div>
                </div>
             </div>

             <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">View</h4>
                <div className="space-y-1">
                   <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Zoom</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded">Ctrl + Scroll</kbd>
                   </div>
                   <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Pan Canvas</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded">Middle Click + Drag</kbd>
                   </div>
                </div>
             </div>
          </div>
       </Modal>
    </div>
  );
};