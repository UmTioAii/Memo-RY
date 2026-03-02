import type { FilterType } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface FilterBarProps {
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  totalCount: number;
  activeCount: number;
  completedCount: number;
  onClearCompleted: () => void;
}

export function FilterBar({ filter, onFilterChange, activeCount, completedCount, onClearCompleted }: FilterBarProps) {
  const { t } = useI18n();

  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: t('all') },
    { value: 'active', label: t('active') },
    { value: 'completed', label: t('done') },
  ];

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              filter === f.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {activeCount} {t('left')} · {completedCount} {t('doneCount')}
        </span>
        {completedCount > 0 && (
          <button
            onClick={onClearCompleted}
            className="text-xs text-destructive/70 hover:text-destructive transition-colors"
          >
            {t('clearDone')}
          </button>
        )}
      </div>
    </div>
  );
}
