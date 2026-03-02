import { AnimatePresence } from 'framer-motion';
import { Palette, X } from 'lucide-react';
import { useState } from 'react';
import type { MarkerColor } from '@/lib/types';
import './MarkerPicker.css';

const COLORS: { color: MarkerColor; label: string; className: string }[] = [
  { color: 'none', label: 'None', className: 'marker-color-none' },
  { color: 'yellow', label: 'Yellow', className: 'marker-color-yellow' },
  { color: 'green', label: 'Green', className: 'marker-color-green' },
  { color: 'blue', label: 'Blue', className: 'marker-color-blue' },
  { color: 'pink', label: 'Pink', className: 'marker-color-pink' },
  { color: 'orange', label: 'Orange', className: 'marker-color-orange' },
  { color: 'purple', label: 'Purple', className: 'marker-color-purple' },
];

interface MarkerPickerProps {
  selected: MarkerColor;
  onSelect: (color: MarkerColor) => void;
  compact?: boolean;
}

export function MarkerPicker({ selected, onSelect, compact }: MarkerPickerProps) {
  const [open, setOpen] = useState(false);

  if (compact) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
          title="Open marker color picker"
          aria-label="Open marker color picker"
        >
          <Palette className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <AnimatePresence>
          {open && (
            <div className="marker-picker-menu">
              {COLORS.map(({ color, className }) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => { onSelect(color); setOpen(false); }}
                  className={`marker-color-button ${className} h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
                    selected === color ? 'border-primary scale-110' : 'border-transparent'
                  }`}
                  title={color}
                  aria-label={color}
                >
                  {color === 'none' && <X className="h-3 w-3 text-muted-foreground m-auto" />}
                </button>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      {COLORS.map(({ color, className }) => (
        <button
          type="button"
          key={color}
          onClick={() => onSelect(color)}
          className={`marker-color-button ${className} h-7 w-7 rounded-full border-2 transition-all hover:scale-110 ${
            selected === color ? 'border-primary scale-110 ring-2 ring-primary/20' : 'border-transparent'
          }`}
          title={color}
          aria-label={color}
        >
          {color === 'none' && <X className="h-4 w-4 text-muted-foreground m-auto" />}
        </button>
      ))}
    </div>
  );
}
