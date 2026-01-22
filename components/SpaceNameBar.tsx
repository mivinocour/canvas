import React, { useState } from 'react';

interface SpaceNameBarProps {
  name: string;
  onRename: (newName: string) => void;
}

export const SpaceNameBar: React.FC<SpaceNameBarProps> = ({ name, onRename }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(name);

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
        fontWeight: 600,
        fontSize: 18
      }}
      className="space-bar-floating"
    >
      {isEditing ? (
        <input
          autoFocus
          value={tempName}
          maxLength={40}
          onChange={e => setTempName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="focus:ring-2 ring-blue-500 outline-none rounded px-1 w-full"
          style={{ fontSize: 18, fontWeight: 600, background: 'transparent', border: 'none' }}
        />
      ) : (
        <span
          style={{ cursor: 'pointer', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 260 }}
          title={name}
          onClick={startEditing}
        >
          {name}
        </span>
      )}
    </div>
  );
};
