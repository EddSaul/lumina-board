import React, { useRef } from 'react';
import { Trash2, Copy, MoveUp, MoveDown, Minus, MoreHorizontal, GripHorizontal, MoveLeft, MoveRight, Spline, CornerDownRight, Slash, CircleDashed, Type } from 'lucide-react';
import { Shape, ConnectorShape, GeoShape, StickyShape, TextShape } from '../../types';
import { COLORS, BACKGROUND_COLORS, STROKE_WIDTHS, STROKE_STYLES } from '../../constants';

interface PropertiesPanelProps {
  shape: Shape;
  onChange: (updates: Partial<Shape>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveLayer: (direction: 'up' | 'down') => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  shape,
  onChange,
  onDelete,
  onDuplicate,
  onMoveLayer
}) => {
  const strokeInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  
  const isConnector = shape.type === 'connector';
  const isGeo = shape.type === 'geo';
  const isPen = shape.type === 'pen';
  const isText = shape.type === 'text';
  const isSticky = shape.type === 'sticky';
  
  const connector = shape as ConnectorShape;
  const geo = shape as GeoShape;
  const textShape = shape as TextShape | StickyShape;
  
  // Shapes that can have border radius (not circles, not pen, not connectors)
  const supportsRoundness = isGeo && !['circle', 'bubble', 'arrow_shape'].includes(geo.subType);

  return (
    <div className="absolute top-20 left-4 bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-hard dark:shadow-hard-dark border border-gray-200 dark:border-zinc-700 w-64 animate-fade-in-up select-none z-30">
      
      {/* Section: Actions */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-zinc-700">
         <div className="flex space-x-1">
            <button onClick={() => onMoveLayer('down')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500" title="Send Backward">
               <MoveDown size={16} />
            </button>
            <button onClick={() => onMoveLayer('up')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500" title="Bring Forward">
               <MoveUp size={16} />
            </button>
         </div>
         <div className="flex space-x-1">
            <button onClick={onDuplicate} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500" title="Duplicate">
               <Copy size={16} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 text-gray-500" title="Delete">
               <Trash2 size={16} />
            </button>
         </div>
      </div>

      {/* Section: Text Content Editing (For Sticky & Text) */}
      {(isText || isSticky) && (
          <div className="mb-4">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Content</label>
              <textarea
                  className="w-full p-2 text-sm border border-gray-200 dark:border-zinc-600 rounded-lg bg-gray-50 dark:bg-zinc-900 text-ink-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  rows={3}
                  value={textShape.text}
                  onChange={(e) => onChange({ text: e.target.value })}
                  placeholder="Type text here..."
              />
              {isText && (
                  <div className="mt-2">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1"><Type size={14} /> Size</span>
                        <span>{(textShape as TextShape).fontSize}px</span>
                     </label>
                     <input 
                        type="range" 
                        min="12" 
                        max="72" 
                        step="1" 
                        value={(textShape as TextShape).fontSize || 16}
                        onChange={(e) => onChange({ fontSize: parseInt(e.target.value) })}
                        className="w-full accent-indigo-500 h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                     />
                  </div>
              )}
          </div>
      )}

      {/* Section: Stroke Color (Label changes for Text) */}
      <div className="mb-4">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
            {isText ? 'Text Color' : 'Stroke'}
        </label>
        <div className="grid grid-cols-6 gap-2">
           {COLORS.slice(0, 11).map(c => (
             <button
               key={c}
               onClick={() => onChange({ color: c })}
               className={`w-6 h-6 rounded-md border border-gray-200 dark:border-zinc-600 ${shape.color === c ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-zinc-800' : ''}`}
               style={{ backgroundColor: c }}
             />
           ))}
           {/* Custom Color Picker */}
           <div className="relative w-6 h-6 rounded-md border border-gray-200 dark:border-zinc-600 overflow-hidden bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 hover:opacity-90 transition-opacity ring-offset-1 dark:ring-offset-zinc-800 group">
              <input 
                  ref={strokeInputRef}
                  type="color"
                  className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 opacity-0 cursor-pointer"
                  value={shape.color}
                  onChange={(e) => onChange({ color: e.target.value })}
                  title="Custom Color"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
              </div>
           </div>
        </div>
      </div>

      {/* Section: Background Color (Not for connectors/pen/text) */}
      {!isConnector && !isPen && !isText && (
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Background</label>
          <div className="grid grid-cols-6 gap-2">
            {BACKGROUND_COLORS.map(c => (
              <button
                key={c}
                onClick={() => onChange({ backgroundColor: c })}
                className={`w-6 h-6 rounded-md border border-gray-200 dark:border-zinc-600 relative ${shape.backgroundColor === c ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-zinc-800' : ''}`}
                style={{ backgroundColor: c === 'transparent' ? 'white' : c }}
              >
                {c === 'transparent' && (
                   <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-full h-px bg-red-400 transform rotate-45"></div>
                   </div>
                )}
              </button>
            ))}
            {/* Custom Background Color Picker */}
            <div className="relative w-6 h-6 rounded-md border border-gray-200 dark:border-zinc-600 overflow-hidden bg-gradient-to-br from-blue-400 via-teal-400 to-green-400 hover:opacity-90 transition-opacity ring-offset-1 dark:ring-offset-zinc-800 group">
                <input 
                    ref={bgInputRef}
                    type="color"
                    className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 opacity-0 cursor-pointer"
                    value={shape.backgroundColor === 'transparent' ? '#ffffff' : shape.backgroundColor}
                    onChange={(e) => onChange({ backgroundColor: e.target.value })}
                    title="Custom Background Color"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Section: Stroke Options (Not for Text) */}
      {!isText && (
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Stroke Style</label>
            
            {/* Width */}
            <div className="flex bg-gray-100 dark:bg-zinc-900 rounded-lg p-1 mb-2">
               {STROKE_WIDTHS.map(w => (
                 <button
                   key={w.value}
                   onClick={() => onChange({ strokeWidth: w.value })}
                   className={`flex-1 py-1 rounded-md flex items-center justify-center ${shape.strokeWidth === w.value ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                   <div className="bg-current rounded-full" style={{ width: 16, height: w.value }}></div>
                 </button>
               ))}
            </div>

            {/* Style */}
            <div className="flex bg-gray-100 dark:bg-zinc-900 rounded-lg p-1">
               {STROKE_STYLES.map(s => (
                 <button
                   key={s.value}
                   onClick={() => onChange({ strokeStyle: s.value as any })}
                   className={`flex-1 py-1 rounded-md flex items-center justify-center ${shape.strokeStyle === s.value ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                   title={s.label}
                 >
                    {s.value === 'solid' && <Minus size={20} />}
                    {s.value === 'dashed' && <GripHorizontal size={20} />}
                    {s.value === 'dotted' && <MoreHorizontal size={20} />}
                 </button>
               ))}
            </div>
          </div>
      )}
      
      {/* Corner Radius (Roundness) */}
      {supportsRoundness && (
          <div className="mb-4">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <CircleDashed size={14} /> <span>Roundness</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="1" 
                value={geo.cornerRadius || 0}
                onChange={(e) => onChange({ cornerRadius: parseInt(e.target.value) })}
                className="w-full accent-indigo-500 h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
              />
          </div>
      )}

      {/* Section: Arrow Configuration */}
      {isConnector && (
         <div className="mb-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Arrow Type</label>
            <div className="flex space-x-2 mb-3">
               <button onClick={() => onChange({ subType: 'straight' })} className={`p-2 rounded-lg flex-1 flex justify-center ${connector.subType === 'straight' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500'}`}><Slash size={18} className="transform -rotate-45" /></button>
               <button onClick={() => onChange({ subType: 'curved' })} className={`p-2 rounded-lg flex-1 flex justify-center ${connector.subType === 'curved' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500'}`}><Spline size={18} /></button>
               <button onClick={() => onChange({ subType: 'elbow' })} className={`p-2 rounded-lg flex-1 flex justify-center ${connector.subType === 'elbow' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500'}`}><CornerDownRight size={18} /></button>
            </div>
            
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Arrowheads</label>
            <div className="flex space-x-2">
                <button 
                  onClick={() => onChange({ startArrowhead: !connector.startArrowhead })} 
                  className={`p-2 rounded-lg flex-1 flex justify-center transition-colors ${connector.startArrowhead ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500'}`}
                >
                   <MoveLeft size={18} />
                </button>
                <button 
                  onClick={() => onChange({ endArrowhead: !connector.endArrowhead })} 
                  className={`p-2 rounded-lg flex-1 flex justify-center transition-colors ${connector.endArrowhead ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500'}`}
                >
                   <MoveRight size={18} />
                </button>
            </div>
         </div>
      )}

      {/* Opacity */}
      <div className="mb-2">
         <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block flex justify-between">
            <span>Opacity</span>
            <span>{Math.round((shape.opacity || 1) * 100)}%</span>
         </label>
         <input 
           type="range" 
           min="0.1" 
           max="1" 
           step="0.1" 
           value={shape.opacity || 1}
           onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
           className="w-full accent-indigo-500 h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
         />
      </div>

    </div>
  );
};
