import React, { useRef, useState, useEffect } from 'react';
import { GripHorizontal, Pencil, X, Check, Loader2 } from 'lucide-react';
import { WidgetData } from '../types';

interface WidgetWindowProps {
  data: WidgetData;
  onUpdate: (id: string, updates: Partial<WidgetData>) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, instruction: string) => Promise<void>;
  children: React.ReactNode;
  scale: number;
}

export const WidgetWindow: React.FC<WidgetWindowProps> = ({ data, onUpdate, onDelete, onEdit, children, scale }) => {
  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [startResize, setStartResize] = useState({ w: 0, h: 0, x: 0, y: 0 });
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof Element && e.target.closest('.no-drag')) return;
    e.stopPropagation(); // Prevent canvas panning
    setIsDragging(true);
    // Calculate the offset of the mouse relative to the widget's origin (top-left) in World Coordinates
    // WorldMouse = ScreenMouse / Scale
    setDragOffset({
      x: e.clientX / scale - data.position.x,
      y: e.clientY / scale - data.position.y
    });
  };

  // Handle Resizing
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setStartResize({
      w: data.size.width,
      h: data.size.height,
      x: e.clientX,
      y: e.clientY
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // NewPosition = NewWorldMouse - Offset
        onUpdate(data.id, {
          position: {
            x: e.clientX / scale - dragOffset.x,
            y: e.clientY / scale - dragOffset.y
          }
        });
      }
      if (isResizing) {
        // Calculate delta in world units
        const deltaX = (e.clientX - startResize.x) / scale;
        const deltaY = (e.clientY - startResize.y) / scale;
        onUpdate(data.id, {
          size: {
            width: Math.max(240, startResize.w + deltaX),
            height: Math.max(180, startResize.h + deltaY)
          }
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, startResize, onUpdate, data.id, scale]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPrompt.trim()) return;
    
    setIsUpdating(true);
    try {
      await onEdit(data.id, editPrompt);
      setIsEditing(false);
      setEditPrompt('');
    } catch (err) {
      console.error("Failed to edit widget", err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      ref={windowRef}
      style={{
        transform: `translate(${data.position.x}px, ${data.position.y}px)`,
        width: data.size.width,
        height: data.size.height,
      }}
      className={`absolute bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden ring-1 ring-black/5 transition-shadow duration-200 ${isDragging ? 'shadow-2xl z-50 scale-[1.01]' : ''}`}
    >
      {/* Header / Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="h-10 bg-gray-50 border-b border-gray-100 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing select-none shrink-0 group z-30 relative"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
           {/* macOS style traffic lights */}
           <div className="flex gap-1.5 mr-2 group-hover:opacity-100 opacity-60 transition-opacity">
             <button 
               onClick={(e) => { e.stopPropagation(); onDelete(data.id); }}
               className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors"
               title="Close"
             />
             <div className="w-3 h-3 rounded-full bg-amber-400" />
             <div className="w-3 h-3 rounded-full bg-green-400" />
           </div>
           <span className="truncate max-w-[120px] text-gray-600 font-semibold">{data.name}</span>
        </div>
        
        <div className="flex items-center gap-1 no-drag">
           <button 
             onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
             className={`p-1 rounded-md transition-colors ${isEditing ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-200 text-gray-400'}`}
             title="Edit App"
           >
             <Pencil className="w-3.5 h-3.5" />
           </button>
           <GripHorizontal className="w-4 h-4 text-gray-300 ml-1" />
        </div>
      </div>

      {/* Widget Content */}
      <div className="flex-1 relative overflow-hidden bg-white no-drag cursor-auto">
        {children}
        
        {/* Loading Overlay */}
        {isUpdating && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center text-purple-600">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span className="text-sm font-medium animate-pulse">Updating app...</span>
          </div>
        )}

        {/* Edit Overlay */}
        {isEditing && !isUpdating && (
          <div className="absolute inset-0 bg-gray-50/95 backdrop-blur-sm z-40 p-4 flex flex-col animate-in fade-in duration-200">
             <div className="flex items-center justify-between mb-3">
               <h3 className="text-sm font-bold text-gray-700">Edit App</h3>
               <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                 <X className="w-4 h-4" />
               </button>
             </div>
             
             <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 h-full">
               <textarea
                 autoFocus
                 value={editPrompt}
                 onChange={(e) => setEditPrompt(e.target.value)}
                 className="flex-1 w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none mb-3"
                 placeholder="How should we change this app? (e.g., 'Make the background dark mode' or 'Add a reset button')"
               />
               <div className="flex justify-end gap-2">
                 <button 
                   type="button" 
                   onClick={() => setIsEditing(false)}
                   className="px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   type="submit"
                   disabled={!editPrompt.trim()}
                   className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   Update App
                   <Check className="w-3 h-3" />
                 </button>
               </div>
             </form>
          </div>
        )}
      </div>

      {/* Resize Handle - Larger touch target */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize z-20 group flex items-end justify-end p-1.5"
      >
        {/* Visible graphic */}
        <div className="w-3 h-3 border-r-2 border-b-2 border-gray-300 group-hover:border-purple-400 rounded-br-sm transition-colors" />
      </div>
    </div>
  );
};
