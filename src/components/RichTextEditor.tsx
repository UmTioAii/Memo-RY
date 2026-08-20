import React, { useRef, useEffect, useCallback, useState } from 'react';
import { FormattingToolbar } from './FormattingToolbar';
import { GripHorizontal } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  submitOnEnter?: boolean;
  minHeight?: number;
  maxHeight?: number;
  autoFocus?: boolean;
  className?: string;
  showToolbar?: boolean;
  toolbarPosition?: 'top' | 'bottom';
  cardColor?: string;
  onCardColorChange?: (color: string | undefined) => void;
  onPasteImages?: (files: FileList) => void;
}

export function RichTextEditor({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
  submitOnEnter = true,
  minHeight = 80,
  maxHeight = 600,
  autoFocus = false,
  className = '',
  showToolbar = true,
  toolbarPosition = 'bottom',
  cardColor,
  onCardColorChange,
  onPasteImages,
}: RichTextEditorProps) {
  const { t } = useI18n();
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const isComposingRef = useRef(false);

  const [textColor, setTextColor] = useState<string | undefined>(undefined);
  const [highlightColor, setHighlightColor] = useState<string | undefined>(undefined);
  const [userResizedHeight, setUserResizedHeight] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [activeStates, setActiveStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
  });

  const updateActiveStates = useCallback(() => {
    if (typeof document === 'undefined') return;
    try {
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isUnderline = document.queryCommandState('underline');
      const isStrikeThrough = document.queryCommandState('strikeThrough');

      setActiveStates((prev) => {
        if (
          prev.bold === isBold &&
          prev.italic === isItalic &&
          prev.underline === isUnderline &&
          prev.strikeThrough === isStrikeThrough
        ) {
          return prev;
        }
        return {
          bold: isBold,
          italic: isItalic,
          underline: isUnderline,
          strikeThrough: isStrikeThrough,
        };
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!editorRef.current) return;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const anchorNode = sel.anchorNode;
        if (anchorNode && editorRef.current.contains(anchorNode)) {
          updateActiveStates();
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateActiveStates]);

  // Initialize and sync content without resetting cursor during normal typing
  useEffect(() => {
    if (editorRef.current && !isComposingRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      if (value !== currentHtml) {
        // Convert raw newlines to <br> if plain text
        const formatted = value.includes('<') ? value : value.replace(/\n/g, '<br>');
        editorRef.current.innerHTML = formatted;
      }
    }
  }, [value]);

  // Autofocus
  useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
      // Place cursor at end
      try {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch {
        /* ignore */
      }
    }
  }, [autoFocus]);

  // Save selection range
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
    updateActiveStates();
  }, [updateActiveStates]);

  // Restore selection range
  const restoreSelection = useCallback(() => {
    if (savedRangeRef.current && editorRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
  }, []);

  // Handle user input
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      // If just <br> or empty whitespace, treat as empty
      const isActuallyEmpty =
        editorRef.current.innerText.trim() === '' &&
        !editorRef.current.querySelector('img');
      onChange(isActuallyEmpty ? '' : html);
    }
    saveSelection();
  }, [onChange, saveSelection]);

  // Formatting execution
  const handleFormat = useCallback((command: string, formatValue?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    try {
      if (command === 'foreColor') {
        if (!formatValue) {
          document.execCommand('removeFormat', false);
        } else {
          document.execCommand('foreColor', false, formatValue);
        }
        setTextColor(formatValue);
      } else if (command === 'hiliteColor') {
        if (!formatValue) {
          document.execCommand('removeFormat', false);
        } else {
          // Both hiliteColor and backColor for cross-browser support
          const success = document.execCommand('hiliteColor', false, formatValue);
          if (!success) {
            document.execCommand('backColor', false, formatValue);
          }
        }
        setHighlightColor(formatValue);
      } else if (command === 'fontName') {
        if (formatValue) {
          document.execCommand('fontName', false, formatValue);
        }
      } else {
        document.execCommand(command, false, formatValue);
      }
    } catch (err) {
      console.warn('Formatting command failed:', command, err);
    }

    handleInput();
    saveSelection();
    updateActiveStates();
  }, [restoreSelection, handleInput, saveSelection, updateActiveStates]);

  // Keyboard navigation & Shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Shortcuts: Ctrl+B, Ctrl+I, Ctrl+U
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleFormat('bold');
        return;
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleFormat('italic');
        return;
      }
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        handleFormat('underline');
        return;
      }
    }

    if (e.key === 'Enter') {
      if (submitOnEnter) {
        if (e.shiftKey) {
          // Shift+Enter → save
          e.preventDefault();
          if (onSubmit) onSubmit();
        }
        // Enter alone → natural line break (default contentEditable behavior)
      } else {
        // Not submit on enter (e.g. note body)
        if ((e.ctrlKey || e.metaKey) && onSubmit) {
          e.preventDefault();
          onSubmit();
        }
      }
    }

    if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };

  // Paste handling (rich text + images)
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (items && onPasteImages) {
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        const dt = new DataTransfer();
        files.forEach((f) => dt.items.add(f));
        onPasteImages(dt.files);
        return;
      }
    }

    // Default paste continues, then trigger handleInput
    setTimeout(handleInput, 0);
  };

  // Manual Drag-to-Resize handler
  const startResizing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const initialHeight = containerRef.current?.getBoundingClientRect().height || minHeight;

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const deltaY = currentY - startY;
      const newHeight = Math.max(minHeight, Math.min(maxHeight, initialHeight + deltaY));
      setUserResizedHeight(newHeight);
    };

    const handleEnd = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
  }, [minHeight, maxHeight]);

  const isEmpty = !value || value.trim() === '' || value === '<br>';

  return (
    <div
      ref={containerRef}
      style={userResizedHeight ? { height: `${userResizedHeight}px` } : { minHeight: `${minHeight}px` }}
      className={`relative flex flex-col rounded-xl border border-input bg-background transition-all focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent ${
        isResizing ? 'select-none transition-none' : ''
      } ${className}`}
    >
      {/* Top Toolbar */}
      {showToolbar && toolbarPosition === 'top' && (
        <div className="p-2 border-b border-border/60 bg-muted/20 rounded-t-xl shrink-0">
          <FormattingToolbar
            onFormat={handleFormat}
            activeStates={activeStates}
            textColor={textColor}
            onTextColorChange={setTextColor}
            highlightColor={highlightColor}
            onHighlightColorChange={setHighlightColor}
            cardColor={cardColor}
            onCardColorChange={onCardColorChange}
          />
        </div>
      )}

      {/* Editable Content Area */}
      <div className="relative flex-1 min-h-0 overflow-y-auto px-3.5 py-2.5">
        {isEmpty && placeholder && (
          <div className="pointer-events-none absolute left-3.5 top-2.5 text-sm text-muted-foreground/60 select-none">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onTouchEnd={saveSelection}
          onSelect={saveSelection}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
            handleInput();
          }}
          className="min-h-full outline-none text-sm leading-relaxed text-foreground break-words whitespace-pre-wrap font-sans"
        />
      </div>

      {/* Bottom Toolbar & Drag Resize Handle */}
      <div className="shrink-0 flex items-center justify-between px-2.5 py-1.5 border-t border-border/40 bg-muted/10 rounded-b-xl gap-2">
        {showToolbar && toolbarPosition === 'bottom' ? (
          <FormattingToolbar
            onFormat={handleFormat}
            activeStates={activeStates}
            textColor={textColor}
            onTextColorChange={setTextColor}
            highlightColor={highlightColor}
            onHighlightColorChange={setHighlightColor}
            cardColor={cardColor}
            onCardColorChange={onCardColorChange}
            className="flex-1"
          />
        ) : (
          <div className="flex-1" />
        )}

        {/* Drag to Resize handle */}
        <div
          onMouseDown={startResizing}
          onTouchStart={startResizing}
          className="cursor-ns-resize text-muted-foreground/40 hover:text-primary transition-colors p-0.5 rounded flex items-center justify-center shrink-0"
          title={t('dragToResize')}
          aria-label={t('dragToResize')}
        >
          <GripHorizontal className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Save hint */}
      {submitOnEnter && onSubmit && (
        <div className="px-3 py-1 text-[10px] text-muted-foreground/50 text-right select-none">
          Shift + Enter para salvar
        </div>
      )}
    </div>
  );
}
