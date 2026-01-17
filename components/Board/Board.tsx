import React, { useState, useRef, useEffect } from 'react';
import { Undo2, Redo2, Check, Settings2, Grid3X3, Circle, LayoutTemplate, Save, CloudCheck } from 'lucide-react';
import { Shape, ToolType, Point, PathShape, GeoShape, ConnectorShape, StickyShape, TextShape, Theme, User, GeoType, ConnectorType, BackgroundType } from '../../types';
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
  theme: Theme;
  toggleTheme: () => void;
}

export const Board: React.FC<BoardProps> = ({ boardId, onBack, theme, toggleTheme }) => {
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

  // History
  const { pushState, undo, redo, canUndo, canRedo, currentShapes, setState } = useHistory([]);
  
  // Interaction State
  const [isPanning, setIsPanning] = useState(false);
  const [interactionState, setInteractionState] = useState<'idle' | 'drawing' | 'resizing' | 'rotating' | 'connecting' | 'dragging'>('idle');
  
  // Selection & Transform
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
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

  // --- Helpers ---
  const showToast = (msg: string) => setToast({ msg, visible: true });

  const copyLink = () => {
    showToast('Link copied to clipboard');
  };

  const getShapeById = (id: string) => currentShapes.find(s => s.id === id);

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
      pushState(currentShapes.filter(s => s.id !== selectedId));
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

    // 3. Hit Test Shapes (Selection)
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
        
        // Prepare for potential drag
        const s = getShapeById(clickedShapeId)!;
        initialShapeState.current = s;
        setTempShape(s);
        
        // We set state to dragging immediately if clicked on shape body
        // Note: resizing logic handles its own mousedown on handles
        setInteractionState('dragging');

      } else {
        setSelectedId(null);
        setTempShape(null);
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
          setTempShape({
             ...tempShape,
             x: s.x + dx,
             y: s.y + dy
          } as Shape);
       }
    }
    else if (interactionState === 'connecting' && tempShape) {
       setTempShape({
          ...tempShape,
          endPoint: world
       } as ConnectorShape);
    }
    
    lastMousePos.current = screen;
  };

  const handlePointerUp = () => {
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
       const newShapes = currentShapes.map(s => s.id === selectedId ? tempShape : s);
       pushState(newShapes);
    } else if (interactionState === 'connecting' && tempShape) {
       pushState([...currentShapes, tempShape]);
       setActiveTool('select');
    }

    setInteractionState('idle');
    setTempShape(null);
    initialShapeState.current = null;
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

  // Load board data on mount
  useEffect(() => {
    const loadBoard = async () => {
      try {
        const board = await boardOperations.getBoard(boardId);
        if (board) {
          setState(board.shapes || []);
          setBoardLoaded(true);
          // Update last accessed time
          await boardOperations.updateLastAccessed(boardId);
        }
      } catch (error) {
        console.error('Error loading board:', error);
        showToast('Failed to load board');
      }
    };

    loadBoard();
  }, [boardId]);

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
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) redo(); else undo();
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedId && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
          handleDelete();
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
        let d = `M ${s.startPoint.x},${s.startPoint.y} L ${s.endPoint.x},${s.endPoint.y}`;
        if (s.subType === 'curved') {
           const c1 = {x: (s.startPoint.x + s.endPoint.x)/2, y: s.startPoint.y};
           const c2 = {x: (s.startPoint.x + s.endPoint.x)/2, y: s.endPoint.y};
           d = `M ${s.startPoint.x},${s.startPoint.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${s.endPoint.x},${s.endPoint.y}`;
        } else if (s.subType === 'elbow') {
           const points = Geo.getElbowPoints(s.startPoint, s.endPoint);
           d = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
        }

        return <path key={s.id} d={d} stroke={s.color} strokeWidth={2} fill="none" markerEnd={s.endArrowhead ? `url(#arrow-${s.id})` : undefined} opacity={s.opacity} />;
     }

     const s = shape as GeoShape | StickyShape | TextShape;
     const center = { x: s.x + s.width/2, y: s.y + s.height/2 };
     
     return (
       <g key={s.id} transform={`rotate(${s.rotation || 0} ${center.x} ${center.y})`}>
          {shape.type === 'geo' && (() => {
             const g = shape as GeoShape;
             const commonProps = {
                 fill: g.backgroundColor,
                 stroke: g.color,
                 strokeWidth: g.strokeWidth,
                 opacity: g.opacity
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

  return (
    <div className="w-full h-screen overflow-hidden bg-cream-50 dark:bg-zinc-900 flex flex-col relative touch-none">
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
       />
       
       <TopBar onMenuClick={() => setIsMenuOpen(true)} collaboratorsOpen={collaboratorsOpen} setCollaboratorsOpen={setCollaboratorsOpen} onShare={copyLink} theme={theme} toggleTheme={toggleTheme} onLogout={onBack} />
       
       <div className="flex-1 relative cursor-crosshair" onWheel={handleWheel}>
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
    </div>
  );
};