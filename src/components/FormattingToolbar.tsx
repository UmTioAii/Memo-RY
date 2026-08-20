import React, { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Palette,
  Eraser,
  Type,
  ChevronDown,
} from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { UnifiedColorPicker } from './UnifiedColorPicker';
import { useI18n } from '@/lib/i18n';

export interface FormattingActiveStates {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikeThrough?: boolean;
}

export interface FormattingToolbarProps {
  onFormat: (command: string, value?: string) => void;
  activeStates?: FormattingActiveStates;
  textColor?: string;
  onTextColorChange?: (color: string | undefined) => void;
  highlightColor?: string;
  onHighlightColorChange?: (color: string | undefined) => void;
  cardColor?: string;
  onCardColorChange?: (color: string | undefined) => void;
  compact?: boolean;
  className?: string;
}

const FONT_FAMILIES = [
  { id: 'Space Grotesk, sans-serif', labelKey: 'fontSpaceGrotesk', sample: 'Space Grotesk' },
  { id: 'ui-sans-serif, system-ui, -apple-system, sans-serif', labelKey: 'fontSans', sample: 'Sans-Serif' },
  { id: 'Georgia, Cambria, serif', labelKey: 'fontSerif', sample: 'Serif' },
  { id: 'JetBrains Mono, monospace', labelKey: 'fontMono', sample: 'Mono (Código)' },
  { id: 'cursive, "Brush Script MT", "Comic Sans MS"', labelKey: 'fontCursive', sample: 'Manuscrita' },
] as const;

export function FormattingToolbar({
  onFormat,
  activeStates,
  textColor,
  onTextColorChange,
  highlightColor,
  onHighlightColorChange,
  cardColor,
  onCardColorChange,
  compact = false,
  className = '',
}: FormattingToolbarProps) {
  const { t } = useI18n();
  const [fontMenuOpen, setFontMenuOpen] = useState(false);

  const handleButtonClick = (command: string, value?: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onFormat(command, value);
  };

  const getButtonClass = (isActive?: boolean) =>
    `h-7 w-7 rounded flex items-center justify-center transition-all ${
      isActive
        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
        : 'hover:bg-accent hover:text-foreground text-muted-foreground'
    }`;

  return (
    <div
      className={`flex items-center flex-wrap gap-0.5 sm:gap-1 text-muted-foreground ${className}`}
      onMouseDown={(e) => {
        // Prevent stealing focus from the text editor
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          // If not typing in input (like Hex input), keep editor selection
          if (!target.closest('.react-colorful') && !target.closest('input')) {
            e.preventDefault();
          }
        }
      }}
    >
      {/* 1. Bold */}
      <button
        type="button"
        onClick={handleButtonClick('bold')}
        className={getButtonClass(activeStates?.bold)}
        title={t('bold')}
        aria-label={t('bold')}
      >
        <Bold className="h-3.5 w-3.5" />
      </button>

      {/* 2. Italic */}
      <button
        type="button"
        onClick={handleButtonClick('italic')}
        className={getButtonClass(activeStates?.italic)}
        title={t('italic')}
        aria-label={t('italic')}
      >
        <Italic className="h-3.5 w-3.5" />
      </button>

      {/* 3. Underline */}
      <button
        type="button"
        onClick={handleButtonClick('underline')}
        className={getButtonClass(activeStates?.underline)}
        title={t('underline')}
        aria-label={t('underline')}
      >
        <Underline className="h-3.5 w-3.5" />
      </button>

      {/* 4. Strikethrough */}
      <button
        type="button"
        onClick={handleButtonClick('strikeThrough')}
        className={getButtonClass(activeStates?.strikeThrough)}
        title={t('strikethrough')}
        aria-label={t('strikethrough')}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>

      {/* Divider */}
      <div className="h-4 w-[1px] bg-border mx-0.5" />

      {/* 5. Text Color (Selected text) */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={`h-7 px-1.5 rounded flex items-center gap-1 transition-all relative border ${
              textColor
                ? 'bg-accent/80 border-border text-foreground font-semibold shadow-xs'
                : 'border-transparent hover:bg-accent hover:text-foreground text-muted-foreground'
            }`}
            title={t('textColor')}
            aria-label={t('textColor')}
          >
            <div className="flex flex-col items-center justify-center">
              <span
                className="text-xs font-black leading-none"
                style={{ color: textColor || 'currentColor' }}
              >
                A
              </span>
              <div
                className="w-3.5 h-1 mt-0.5 rounded-full shadow-xs transition-colors"
                style={{ backgroundColor: textColor || 'currentColor' }}
              />
            </div>
            <ChevronDown className="h-2.5 w-2.5 opacity-60" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content 
            className="z-50" 
            sideOffset={5}
            onFocusOutside={(e) => e.preventDefault()}
          >
            <UnifiedColorPicker
              mode="text"
              color={textColor}
              onChange={(color) => {
                if (onTextColorChange) onTextColorChange(color);
                onFormat('foreColor', color);
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* 6. Highlight / Background Color (Selected text) */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={`h-7 px-1.5 rounded flex items-center gap-1 transition-all relative border ${
              highlightColor
                ? 'bg-accent/80 border-border text-foreground font-semibold shadow-xs'
                : 'border-transparent hover:bg-accent hover:text-foreground text-muted-foreground'
            }`}
            title={t('highlightColor')}
            aria-label={t('highlightColor')}
          >
            <div className="flex flex-col items-center justify-center">
              <Highlighter
                className="h-3.5 w-3.5 transition-colors"
                style={highlightColor ? { color: highlightColor } : undefined}
              />
              <div
                className="w-3.5 h-1 mt-0.5 rounded-full shadow-xs transition-colors"
                style={{
                  backgroundColor: highlightColor || 'transparent',
                  border: highlightColor ? 'none' : '1px dashed currentColor',
                }}
              />
            </div>
            <ChevronDown className="h-2.5 w-2.5 opacity-60" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content 
            className="z-50" 
            sideOffset={5}
            onFocusOutside={(e) => e.preventDefault()}
          >
            <UnifiedColorPicker
              mode="highlight"
              color={highlightColor}
              onChange={(color) => {
                if (onHighlightColorChange) onHighlightColorChange(color);
                onFormat('hiliteColor', color);
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* 7. Font Family Selector */}
      <Popover.Root open={fontMenuOpen} onOpenChange={setFontMenuOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="h-7 px-1.5 rounded flex items-center gap-1 hover:bg-accent hover:text-foreground transition-colors border border-transparent"
            title={t('font')}
            aria-label={t('font')}
          >
            <Type className="h-3.5 w-3.5" />
            <ChevronDown className="h-2.5 w-2.5 opacity-60" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="z-50 p-1.5 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl w-48 flex flex-col gap-1 text-xs"
            sideOffset={5}
          >
            <span className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t('font')}
            </span>
            {FONT_FAMILIES.map((f) => (
              <button
                type="button"
                key={f.id}
                onClick={(e) => {
                  e.preventDefault();
                  onFormat('fontName', f.id);
                  setFontMenuOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between"
                style={{ fontFamily: f.id }}
              >
                <span>{t(f.labelKey)}</span>
                <span className="text-[10px] text-muted-foreground font-normal">Aa</span>
              </button>
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* 8. Clear Formatting */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          if (onTextColorChange) onTextColorChange(undefined);
          if (onHighlightColorChange) onHighlightColorChange(undefined);
          onFormat('removeFormat');
        }}
        className="h-7 w-7 rounded flex items-center justify-center hover:bg-accent hover:text-foreground transition-colors border border-transparent text-muted-foreground"
        title={t('clearFormatting')}
        aria-label={t('clearFormatting')}
      >
        <Eraser className="h-3.5 w-3.5" />
      </button>

      {/* 9. Card / Note Color (Optional, if onCardColorChange provided) */}
      {onCardColorChange && (
        <>
          <div className="h-4 w-[1px] bg-border mx-0.5" />
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                type="button"
                className={`h-7 px-1.5 rounded flex items-center gap-1 transition-all border ${
                  cardColor
                    ? 'bg-accent/80 border-border text-foreground shadow-xs'
                    : 'border-transparent hover:bg-accent hover:text-foreground text-muted-foreground'
                }`}
                title={t('cardColor')}
                aria-label={t('cardColor')}
              >
                <Palette
                  className="h-3.5 w-3.5"
                  style={cardColor ? { color: cardColor } : undefined}
                />
                {cardColor && (
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-border shrink-0 shadow-xs"
                    style={{ backgroundColor: cardColor }}
                  />
                )}
                <ChevronDown className="h-2.5 w-2.5 opacity-60" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="z-50" sideOffset={5}>
                <UnifiedColorPicker
                  mode="card"
                  color={cardColor}
                  onChange={onCardColorChange}
                />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </>
      )}
    </div>
  );
}
