import React, { useState } from 'react';
import { Plus, Sparkles, Loader2 } from 'lucide-react';

interface ToolbarProps {
  onCreate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onCreate, isGenerating }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    await onCreate(prompt);
    setPrompt('');
    setIsOpen(false);
  };

  if (isGenerating) {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-full px-6 py-3 border border-slate-200 flex items-center gap-3 z-50">
        <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
        <span className="text-sm font-medium text-slate-700">Building...</span>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 hover:bg-slate-700 text-white shadow-lg rounded-full p-4 transition-all hover:scale-105 z-50 group"
      >
        <Plus className="w-5 h-5" />
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs py-1.5 px-3 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          New Widget
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-50">
       <div className="bg-white shadow-lg rounded-xl border border-slate-200 p-3 animate-in slide-in-from-bottom-3 fade-in duration-200">
         <form onSubmit={handleSubmit} className="flex gap-2">
           <div className="relative flex-1">
             <input
                type="text"
                autoFocus
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to build..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none text-sm transition-all"
             />
           </div>
           <button
             type="submit"
             disabled={!prompt.trim()}
             className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
           >
             <span>Create</span>
           </button>
           <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-3 text-slate-400 hover:text-slate-600 transition-colors"
           >
             <Plus className="w-4 h-4 rotate-45" />
           </button>
         </form>
       </div>
    </div>
  );
};