import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';

interface SpaceNameBarProps {
  name: string;
  emoji?: string;
  onRename: (newName: string) => void;
  onEmojiChange?: (emoji: string) => void;
  onInvite?: () => void;
}

export const SpaceNameBar: React.FC<SpaceNameBarProps> = ({ name, emoji, onRename, onEmojiChange, onInvite }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(name);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojis = ['🚀', '📝', '💼', '🎯', '📊', '🎨', '🔥', '⚡', '🌟', '💡', '🎪', '🍕', '🎮', '📚', '🏠', '❤️', '🌈', '🦋', '🍀', '🌙', '☀️', '🎵'];

  const startEditing = () => {
    setTempName(name);
    setIsEditing(true);
  };
  const stopEditing = () => {
    setIsEditing(false);
  };

  const handleBlur = () => {
    if (tempName.trim() && tempName !== name) {
      onRename(tempName.trim());
    }
    stopEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setTempName(name);
      stopEditing();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        minWidth: 220,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        boxShadow: '0 8px 24px 0 rgba(0,0,0,0.04)',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontWeight: 600,
        fontSize: 18
      }}
      className="space-bar-floating"
    >
      {emoji && onEmojiChange && (
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            onMouseEnter={() => setShowEmojiPicker(true)}
            onMouseLeave={() => setShowEmojiPicker(false)}
            className="hover:bg-gray-100 rounded p-1 transition-colors text-lg"
            title="Click to change emoji"
          >
            {emoji}
          </button>
          {showEmojiPicker && (
            <div
              className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 z-50 grid grid-cols-6 gap-1 w-48"
              onMouseEnter={() => setShowEmojiPicker(true)}
              onMouseLeave={() => setShowEmojiPicker(false)}
            >
              {emojis.map((emojiOption) => (
                <button
                  key={emojiOption}
                  onClick={() => {
                    onEmojiChange(emojiOption);
                    setShowEmojiPicker(false);
                  }}
                  className="w-6 h-6 hover:bg-slate-100 rounded text-sm flex items-center justify-center transition-colors"
                >
                  {emojiOption}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isEditing ? (
        <input
          autoFocus
          value={tempName}
          maxLength={40}
          onChange={e => setTempName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="focus:ring-2 ring-blue-500 outline-none rounded px-1 flex-1"
          style={{ fontSize: 18, fontWeight: 600, background: 'transparent', border: 'none' }}
        />
      ) : (
        <span
          style={{ cursor: 'pointer', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 260, textAlign: 'center', flex: 1 }}
          title={name}
          onClick={startEditing}
        >
          {name}
        </span>
      )}

      {onInvite && (
        <button
          onClick={onInvite}
          className="ml-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-800"
          title="Invite people to this space"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
