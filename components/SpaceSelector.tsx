import React, { useState } from 'react';
import { Plus, Users, Lock, Globe, ChevronDown } from 'lucide-react';
import { Space, User } from '../types/shared';

interface SpaceSelectorProps {
  user: User;
  spaces: Space[];
  currentSpace: Space | null;
  onSpaceSelect: (space: Space) => void;
  onCreateSpace: (name: string, description?: string) => Promise<void>;
  onSignOut: () => void;
}

export const SpaceSelector: React.FC<SpaceSelectorProps> = ({
  user,
  spaces,
  currentSpace,
  onSpaceSelect,
  onCreateSpace,
  onSignOut
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDescription, setNewSpaceDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;

    setCreating(true);
    try {
      await onCreateSpace(newSpaceName.trim(), newSpaceDescription.trim() || undefined);
      setNewSpaceName('');
      setNewSpaceDescription('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating space:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed top-4 left-4 z-40">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white shadow-lg border border-slate-200 rounded-lg px-4 py-2 flex items-center gap-3 hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center gap-2">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                {user.displayName[0]?.toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <p className="text-sm font-medium text-slate-800">
                {currentSpace?.name || 'Select Space'}
              </p>
              <p className="text-xs text-slate-500">{user.displayName}</p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-white shadow-xl border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-800">Your Spaces</h3>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
              </div>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreateSpace} className="p-4 border-b border-slate-100 bg-slate-50">
                <input
                  type="text"
                  placeholder="Space name..."
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Description (optional)..."
                  value={newSpaceDescription}
                  onChange={(e) => setNewSpaceDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!newSpaceName.trim() || creating}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-3 py-2 text-slate-600 hover:text-slate-800 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="max-h-64 overflow-y-auto">
              {spaces.map((space) => (
                <button
                  key={space.id}
                  onClick={() => {
                    onSpaceSelect(space);
                    setIsOpen(false);
                  }}
                  className="w-full p-3 hover:bg-slate-50 text-left flex items-center gap-3 border-b border-slate-100 last:border-b-0"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-blue-500 rounded-lg flex items-center justify-center">
                    {space.isPublic ? (
                      <Globe className="w-4 h-4 text-white" />
                    ) : (
                      <Lock className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{space.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {space.members.length} member{space.members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {currentSpace?.id === space.id && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </button>
              ))}

              {spaces.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No spaces yet. Create your first space to get started!
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-100">
              <button
                onClick={() => {
                  onSignOut();
                  setIsOpen(false);
                }}
                className="w-full text-left text-sm text-slate-600 hover:text-slate-800 px-1"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};