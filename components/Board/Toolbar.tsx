import React, { useState } from 'react';
import { Eraser, Sparkles, ChevronRight } from 'lucide-react';
import { TOOLS, GEO_SHAPES, CONNECTORS } from '../../constants';
import { ToolType, GeoType, ConnectorType } from '../../types';

interface ToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  activeGeo: GeoType;
  setActiveGeo: (geo: GeoType) => void;
  activeConnector: ConnectorType;
  setActiveConnector: (conn: ConnectorType) => void;
  color: string;
  setColor: (color: string) => void;
  onClear: () => void;
  onAiGenerate: () => void;
  isHidden: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  activeGeo,
  setActiveGeo,
  activeConnector,
  setActiveConnector,
  onClear,
  onAiGenerate,
  isHidden
}) => {
  const [openSubMenu, setOpenSubMenu] = useState<ToolType | null>(null);

  const handleToolClick = (toolId: ToolType, hasSubMenu?: boolean) => {
    setActiveTool(toolId);
    if (hasSubMenu) {
      setOpenSubMenu(openSubMenu === toolId ? null : toolId);
    } else {
      setOpenSubMenu(null);
    }
  };

  return (
    <div className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 transition-all duration-300 ${isHidden ? 'translate-y-20 opacity-0' : ''}`}>
      
      {/* Submenus */}
      {openSubMenu === 'geo' && (
        <div className="absolute bottom-full left-0 mb-3 bg-white dark:bg-zinc-800 p-2 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700 grid grid-cols-4 gap-2 w-64 animate-fade-in-up">
           {GEO_SHAPES.map(geo => {
             const Icon = geo.icon;
             return (
               <button
                 key={geo.id}
                 onClick={() => { setActiveGeo(geo.id); setOpenSubMenu(null); }}
                 className={`p-2 rounded-lg flex flex-col items-center justify-center transition-colors ${activeGeo === geo.id ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500 dark:text-gray-400'}`}
                 title={geo.label}
               >
                 <Icon size={20} />
               </button>
             )
           })}
        </div>
      )}

      {openSubMenu === 'connector' && (
        <div className="absolute bottom-full left-0 mb-3 bg-white dark:bg-zinc-800 p-2 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700 flex space-x-2 animate-fade-in-up">
           {CONNECTORS.map(conn => {
             const Icon = conn.icon;
             return (
               <button
                 key={conn.id}
                 onClick={() => { setActiveConnector(conn.id); setOpenSubMenu(null); }}
                 className={`p-2 rounded-lg flex flex-col items-center justify-center transition-colors ${activeConnector === conn.id ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500 dark:text-gray-400'}`}
                 title={conn.label}
               >
                 <Icon size={20} />
               </button>
             )
           })}
        </div>
      )}

      <div className="bg-white dark:bg-zinc-800 p-1.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 dark:border-zinc-700 flex items-center space-x-1 sm:space-x-2">
          
          {/* Tools */}
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            
            return (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.id, tool.hasSubMenu)}
                className={`p-3 rounded-xl transition-all duration-200 relative group flex items-center justify-center ${
                  isActive 
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow-inner' 
                  : 'hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500 dark:text-gray-400'
                }`}
                title={tool.label}
              >
                <Icon size={20} />
                {tool.hasSubMenu && (
                   <ChevronRight size={10} className="absolute bottom-1 right-1 opacity-50 transform rotate-45" />
                )}
              </button>
            );
          })}

          <div className="w-px h-8 bg-gray-200 dark:bg-zinc-700 mx-2"></div>

          {/* Actions */}
          <button 
            onClick={onClear}
            className="p-3 rounded-xl hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 text-gray-500 transition-colors"
            title="Clear Board"
          >
            <Eraser size={20} />
          </button>
          
          {/* Gemini AI Trigger */}
          <button 
            className="p-3 ml-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-indigo-500/30 transition-all hover:scale-105"
            title="Ask AI to Generate Ideas"
            onClick={onAiGenerate}
          >
            <Sparkles size={20} />
          </button>
      </div>
    </div>
  );
};
