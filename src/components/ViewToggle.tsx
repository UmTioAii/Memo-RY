import { LayoutList, Columns3 } from 'lucide-react';
import type { ViewMode } from '@/lib/types';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
      <button
        onClick={() => onChange('list')}
        className={`h-8 w-8 rounded-md flex items-center justify-center transition-all ${
          mode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        }`}
        title="List view"
      >
        <LayoutList className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange('board')}
        className={`h-8 w-8 rounded-md flex items-center justify-center transition-all ${
          mode === 'board' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Board view"
      >
        <Columns3 className="h-4 w-4" />
      </button>
    </div>
  );
}
