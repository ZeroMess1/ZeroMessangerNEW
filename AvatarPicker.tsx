import { useState } from 'react';

const avatars = [
  '👤', '👨', '👩', '🧑', '👦', '👧', '👴', '👵',
  '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞',
  '🤠', '🤡', '🤖', '👽', '👾', '🤺', '⛹️', '🏄'
];

interface AvatarPickerProps {
  onSelect: (avatar: string) => void;
  selected?: string;
}

export const AvatarPicker = ({ onSelect, selected }: AvatarPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-20 h-20 rounded-full bg-white border-2 border-black flex items-center justify-center text-4xl hover:bg-gray-50 transition-colors"
      >
        {selected || '👤'}
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 p-3 bg-white rounded-2xl shadow-2xl z-50 grid grid-cols-4 gap-2 max-w-64">
            {avatars.map((avatar) => (
              <button
                key={avatar}
                type="button"
                onClick={() => {
                  onSelect(avatar);
                  setIsOpen(false);
                }}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all hover:bg-gray-100 ${
                  selected === avatar ? 'bg-black text-white' : ''
                }`}
              >
                {avatar}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};