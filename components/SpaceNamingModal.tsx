import React, { useState } from 'react';
import { Save, Sparkles } from 'lucide-react';

interface SpaceNamingModalProps {
  onCreateSpace: (name: string, description?: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  widgetCount: number;
}

export const SpaceNamingModal: React.FC<SpaceNamingModalProps> = ({
  onCreateSpace,
  onCancel,
  loading,
  widgetCount
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onCreateSpace(name.trim(), description.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
        <div className="w-16 h-16 mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-blue-400 to-green-400 rounded-xl transform rotate-3 opacity-80"></div>
          <div className="absolute inset-0.5 bg-gradient-to-tl from-pink-300 via-purple-300 to-blue-300 rounded-lg transform -rotate-2"></div>
          <div className="absolute inset-1 bg-gradient-to-br from-blue-200 via-green-200 to-pink-200 rounded-md flex items-center justify-center">
            <Save className="w-8 h-8 text-slate-700" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-slate-800 mb-2 text-center">
          Save Your Space
        </h1>
        <p className="text-slate-600 mb-6 text-center leading-relaxed">
          You're about to save {widgetCount} widget{widgetCount !== 1 ? 's' : ''} to a new shared space.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="space-name" className="block text-sm font-medium text-slate-700 mb-2">
              Space Name *
            </label>
            <input
              id="space-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Space"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              maxLength={50}
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="space-description" className="block text-sm font-medium text-slate-700 mb-2">
              Description (optional)
            </label>
            <textarea
              id="space-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this space for?"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              maxLength={200}
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-3 text-left bg-slate-50 p-3 rounded-lg">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-slate-700">Share & Collaborate</p>
              <p className="text-xs text-slate-500">Others can join and edit in real-time</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3 px-4 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Create Space</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};