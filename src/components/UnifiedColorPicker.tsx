import React, { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Plus, X, RotateCcw } from 'lucide-react';
import { useMemos } from '@/hooks/useMemos';
import { useI18n } from '@/lib/i18n';

export interface UnifiedColorPickerProps {
  color?: string;
  onChange: (color: string | undefined) => void;
  mode?: 'card' | 'text' | 'highlight';
  title?: string;
  onClose?: () => void;
}

const PRESET_TEXT_COLORS = [
  { label: 'Padrão', value: undefined, hex: 'transparent' },
  { label: 'Vermelho', value: '#ef4444', hex: '#ef4444' },
  { label: 'Laranja', value: '#f97316', hex: '#f97316' },
  { label: 'Amarelo', value: '#eab308', hex: '#eab308' },
  { label: 'Verde', value: '#10b981', hex: '#10b981' },
  { label: 'Ciano', value: '#06b6d4', hex: '#06b6d4' },
  { label: 'Azul', value: '#3b82f6', hex: '#3b82f6' },
  { label: 'Roxo', value: '#a855f7', hex: '#a855f7' },
  { label: 'Rosa', value: '#ec4899', hex: '#ec4899' },
  { label: 'Branco', value: '#ffffff', hex: '#ffffff' },
  { label: 'Preto', value: '#09090b', hex: '#09090b' },
];

const PRESET_HIGHLIGHT_COLORS = [
  { label: 'Sem destaque', value: undefined, hex: 'transparent' },
  { label: 'Amarelo (Atenção)', value: '#fef08a', hex: '#fef08a' },
  { label: 'Laranja (Alerta)', value: '#fed7aa', hex: '#fed7aa' },
  { label: 'Vermelho (Urgente/Crítico)', value: '#fecaca', hex: '#fecaca' },
  { label: 'Verde (Sucesso)', value: '#bbf7d0', hex: '#bbf7d0' },
  { label: 'Ciano (Info)', value: '#bae6fd', hex: '#bae6fd' },
  { label: 'Roxo (Importante)', value: '#e9d5ff', hex: '#e9d5ff' },
  { label: 'Rosa (Foco)', value: '#fbcfe8', hex: '#fbcfe8' },
  { label: 'Cinza / Escuro', value: '#374151', hex: '#374151' },
];

const PRESET_CARD_COLORS = [
  { label: 'Nenhum', value: undefined, hex: 'transparent' },
  { label: 'Vermelho', value: '#ef4444', hex: '#ef4444' },
  { label: 'Laranja', value: '#f97316', hex: '#f97316' },
  { label: 'Amarelo', value: '#eab308', hex: '#eab308' },
  { label: 'Verde', value: '#10b981', hex: '#10b981' },
  { label: 'Azul', value: '#3b82f6', hex: '#3b82f6' },
  { label: 'Roxo', value: '#8b5cf6', hex: '#8b5cf6' },
  { label: 'Rosa', value: '#ec4899', hex: '#ec4899' },
  { label: 'Branco', value: '#ffffff', hex: '#ffffff' },
];

export function UnifiedColorPicker({
  color,
  onChange,
  mode = 'text',
  title,
}: UnifiedColorPickerProps) {
  const { t } = useI18n();
  const { savedColors, saveColor, removeSavedColor } = useMemos();
  const [customHex, setCustomHex] = useState(color && color.startsWith('#') ? color : '#3b82f6');
  
  const isDragging = useRef(false);
  const latestHex = useRef(customHex);
  latestHex.current = customHex;

  useEffect(() => {
    const handlePointerUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        onChange(latestHex.current);
      }
    };
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [onChange]);

  const presets =
    mode === 'highlight'
      ? PRESET_HIGHLIGHT_COLORS
      : mode === 'card'
      ? PRESET_CARD_COLORS
      : PRESET_TEXT_COLORS;

  const displayTitle =
    title ||
    (mode === 'highlight'
      ? t('highlightColor')
      : mode === 'card'
      ? t('cardColor')
      : t('textColor'));

  const handleHexChange = (hex: string) => {
    setCustomHex(hex);
    if (!isDragging.current) {
      onChange(hex);
    }
  };

  const handleManualHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#') && val.length > 0) {
      val = '#' + val;
    }
    setCustomHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val) || /^#[0-9A-Fa-f]{3}$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3 bg-popover text-popover-foreground rounded-xl border border-border shadow-xl w-[252px] select-none text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-border/60">
        <span className="font-semibold text-foreground truncate">{displayTitle}</span>
        {color && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onChange(undefined);
            }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            title={t('clearColor')}
          >
            <RotateCcw className="h-3 w-3" />
            <span>{t('clearColor')}</span>
          </button>
        )}
      </div>

      {/* 1. Presets / Cores Fixas */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {t('presetColors')}
        </span>
        <div className="flex flex-wrap gap-1.5 items-center">
          {presets.map((p, idx) => {
            const isSelected = p.value === undefined ? !color : color === p.value;
            return (
              <button
                type="button"
                key={idx}
                onClick={(e) => {
                  e.preventDefault();
                  onChange(p.value);
                  if (p.value) setCustomHex(p.value);
                }}
                className={`h-6 w-6 rounded-full border transition-all relative flex items-center justify-center hover:scale-110 ${
                  isSelected ? 'border-primary ring-2 ring-primary/30 scale-110 shadow-sm z-10' : 'border-border/80'
                }`}
                style={{
                  backgroundColor: p.hex === 'transparent' ? 'transparent' : p.hex,
                }}
                title={p.label}
              >
                {p.value === undefined && (
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Seletor Hexadecimal customizado */}
      <div className="flex flex-col gap-2 pt-1 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {t('customColor')}
          </span>
          <div className="flex items-center gap-1">
            <span
              className="w-3.5 h-3.5 rounded-full border border-border inline-block shadow-xs"
              style={{ backgroundColor: customHex }}
            />
            <input
              type="text"
              value={customHex}
              onChange={handleManualHexInput}
              maxLength={7}
              placeholder="#000000"
              className="w-16 h-5 px-1 text-[11px] font-mono bg-background border border-input rounded text-center focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div 
          className="flex justify-center my-0.5"
          onPointerDown={() => { isDragging.current = true; }}
        >
          <HexColorPicker
            color={customHex}
            onChange={handleHexChange}
            style={{ width: '100%', height: '120px' }}
          />
        </div>
      </div>

      {/* 3. Cores Salvas */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {t('savedColors')}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              saveColor(customHex);
            }}
            className="text-[10px] text-primary font-medium hover:underline flex items-center gap-0.5"
            title={t('saveCurrentColor')}
          >
            <Plus className="h-3 w-3" />
            <span>{t('saveCurrentColor')}</span>
          </button>
        </div>

        {savedColors.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-0.5">
            {savedColors.map((saved) => (
              <div key={saved} className="group/saved relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setCustomHex(saved);
                    onChange(saved);
                  }}
                  className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${
                    color === saved ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-border'
                  }`}
                  style={{ backgroundColor: saved }}
                  title={saved}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    removeSavedColor(saved);
                  }}
                  className="absolute -top-1 -right-1 hidden group-hover/saved:flex items-center justify-center w-3 h-3 bg-destructive text-destructive-foreground rounded-full shadow-xs z-10"
                  title="Remover cor salva"
                >
                  <X className="w-2 h-2" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">Nenhuma cor salva ainda.</p>
        )}
      </div>
    </div>
  );
}
