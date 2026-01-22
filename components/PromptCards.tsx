import React, { useState } from 'react';

interface PromptCard {
  icon: string;
  text: string;
  category: 'social' | 'partner' | 'work' | 'home';
}

interface PromptCardsProps {
  onSelectPrompt: (prompt: string) => void;
}

export const PromptCards: React.FC<PromptCardsProps> = ({ onSelectPrompt }) => {
  const [currentSet, setCurrentSet] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  const promptSets: PromptCard[][] = [
    [
      { icon: '🎬', text: 'Movie night roulette for girls night', category: 'social' },
      { icon: '🌽', text: 'Shared grocery list', category: 'partner' },
      { icon: '😋', text: 'Spin the wheel for who buys dinner', category: 'home' },
      { icon: '🎵', text: 'Office playlist suggestion box', category: 'work' }
    ],
    [
      { icon: '🏃‍♀️', text: 'Workout timer with intervals', category: 'social' },
      { icon: '✈️', text: 'Trip planning itinerary generator', category: 'partner' },
      { icon: '🍕', text: 'NYC restaurant roulette', category: 'social' },
      { icon: '📚', text: 'Book shared ranking system', category: 'work' }
    ],
    [
      { icon: '🎲', text: 'Date night idea generator', category: 'partner' },
      { icon: '☕', text: 'Coffee shop rating tracker', category: 'social' },
      { icon: '💰', text: 'Split bill calculator', category: 'home' },
      { icon: '📊', text: 'Team mood check-in board', category: 'work' }
    ]
  ];

  const handleShuffle = () => {
    console.log('Shuffle clicked');
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentSet((prev) => (prev + 1) % promptSets.length);
      setIsFlipping(false);
    }, 300);
  };

  const currentPrompts = promptSets[currentSet];

  return (
    <div className="text-left bg-slate-50 p-4 rounded-lg border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-slate-700">Ideas to get started:</p>
        <button
          onClick={handleShuffle}
          className="text-slate-500 hover:text-slate-700 transition-all group p-1 rounded hover:bg-slate-100 cursor-pointer active:scale-90"
          disabled={isFlipping}
        >
          <span className={`text-sm transition-transform duration-300 ${isFlipping ? 'rotate-180' : 'group-hover:rotate-12'}`}>
            🔀
          </span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {currentPrompts.map((prompt, index) => (
          <button
            key={`${currentSet}-${index}`}
            onClick={() => {
              console.log('Prompt clicked:', prompt.text);
              onSelectPrompt(prompt.text);
            }}
            className={`
              p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300
              transition-all duration-300 text-left group hover:shadow-sm cursor-pointer
              hover:bg-slate-25 active:scale-95
              ${isFlipping ? 'animate-pulse opacity-50' : 'animate-in fade-in slide-in-from-bottom-2'}
            `}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none">{prompt.icon}</span>
              <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors leading-relaxed">
                {prompt.text}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};