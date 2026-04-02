import React, { useState, useRef, useEffect } from 'react';
import { WidgetData, Position } from '../types';
import { WidgetWindow } from './WidgetWindow';
import { DynamicWidget } from './DynamicWidget';
import { Minus, Plus, RotateCcw } from 'lucide-react';

interface CanvasProps {
  widgets: WidgetData[];
  onUpdateWidget: (id: string, updates: Partial<WidgetData>) => void;
  onDeleteWidget: (id: string) => void;
  onEditWidget: (id: string, instruction: string) => Promise<void>;
  onResetWidget?: (id: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ widgets, onUpdateWidget, onDeleteWidget, onEditWidget, onResetWidget }) => {
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<Position>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Center initial view
  useEffect(() => {
     const cx = window.innerWidth / 2;
     const cy = window.innerHeight / 2;
     setPan({ x: cx - 1000, y: cy - 1000 }); // Assuming "center" of virtual world is 1000,1000
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle mouse or Space + Left Click
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      setIsPanning(true);
      const initialStartPan = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setStartPan(initialStartPan);

      // Add global mouse listeners for smoother dragging
      const handleGlobalMouseMove = (e: MouseEvent) => {
        requestAnimationFrame(() => {
          setPan({ x: e.clientX - initialStartPan.x, y: e.clientY - initialStartPan.y });
        });
      };

      const handleGlobalMouseUp = () => {
        setIsPanning(false);
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Mouse move handled globally when panning
  };

  const handleMouseUp = () => {
    // Mouse up handled globally when panning
  };

  // Wheel to pan (standard) or zoom (ctrl+wheel)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        performZoom(delta, { x: e.clientX, y: e.clientY });
        return;
    }
    setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
  };

  const performZoom = (delta: number, center?: {x: number, y: number}) => {
    setZoom(prevZoom => {
        const newZoom = Math.min(Math.max(prevZoom + delta, 0.2), 3);
        
        // Zoom towards the mouse cursor or center of screen
        const cx = center ? center.x : window.innerWidth / 2;
        const cy = center ? center.y : window.innerHeight / 2;

        // Calculate world point under center
        // World = (Screen - Pan) / Zoom
        const wx = (cx - pan.x) / prevZoom;
        const wy = (cy - pan.y) / prevZoom;

        // New Pan = Screen - World * NewZoom
        const newPanX = cx - wx * newZoom;
        const newPanY = cy - wy * newZoom;

        setPan({ x: newPanX, y: newPanY });
        return newZoom;
    });
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-[#f8fafc] ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Background Grid Pattern - Scales to simulate zoom effect */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
            backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />
      
      {/* Infinite Canvas Container */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
        className="absolute top-0 left-0 w-0 h-0"
      >
        {widgets.map(widget => (
          <WidgetWindow
            key={widget.id}
            data={widget}
            scale={zoom}
            onUpdate={onUpdateWidget}
            onDelete={onDeleteWidget}
            onEdit={onEditWidget}
          >
            <DynamicWidget
                code={widget.code}
                onError={(err) => console.error(`Widget ${widget.id} error:`, err)}
                onReset={onResetWidget ? () => onResetWidget(widget.id) : undefined}
            />
          </WidgetWindow>
        ))}
      </div>
      
      {/* HUD Info */}
      <div className="absolute bottom-4 left-4 text-xs font-medium text-gray-400 select-none pointer-events-none z-50">
        {widgets.length} apps · {(zoom * 100).toFixed(0)}% · Shift+Drag to pan
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-50">
         <button 
           onClick={() => performZoom(0.2)}
           className="p-3 bg-white hover:bg-gray-50 text-gray-700 rounded-full shadow-lg border border-gray-100 transition-transform active:scale-95"
           aria-label="Zoom In"
         >
           <Plus className="w-5 h-5" />
         </button>
         <button 
           onClick={() => performZoom(-0.2)}
           className="p-3 bg-white hover:bg-gray-50 text-gray-700 rounded-full shadow-lg border border-gray-100 transition-transform active:scale-95"
           aria-label="Zoom Out"
         >
           <Minus className="w-5 h-5" />
         </button>
         <button 
           onClick={() => { setZoom(1); setPan({x: window.innerWidth/2 - 1000, y: window.innerHeight/2 - 1000}); }}
           className="p-3 bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-700 rounded-full shadow-lg border border-gray-100 transition-transform active:scale-95"
           title="Reset View"
         >
           <RotateCcw className="w-4 h-4" />
         </button>
      </div>
    </div>
  );
};
