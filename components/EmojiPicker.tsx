import React, { useState } from 'react';

interface EmojiPickerProps {
  currentEmoji?: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  currentEmoji,
  onSelect,
  onClose
}) => {
  const emojis = [
    '🚀', '🎨', '💡', '🔥', '✨', '🌟', '🎯', '💪', '🎪', '🌈', '🎵', '🏆',
    '📝', '💼', '🏠', '🎮', '📚', '🍕', '☕', '🌍', '🎸', '📷', '🎬', '🏃‍♂️',
    '🧠', '💻', '🔧', '🎲', '🚗', '✈️', '⭐', '🎈', '🍎', '🌸', '🔮', '🎊'
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          maxWidth: '320px',
          width: '90%'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1e293b',
            textAlign: 'center'
          }}
        >
          Choose an emoji
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '8px',
            marginBottom: '16px'
          }}
        >
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              style={{
                background: currentEmoji === emoji ? '#e2e8f0' : 'none',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '20px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (currentEmoji !== emoji) {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (currentEmoji !== emoji) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            background: '#e2e8f0',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            color: '#64748b'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};