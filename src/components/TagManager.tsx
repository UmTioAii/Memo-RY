import { useState } from 'react';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { useMemos } from '@/hooks/useMemos';
import { useI18n } from '@/lib/i18n';
import * as Popover from '@radix-ui/react-popover';

export function TagManager() {
  const { t } = useI18n();
  const { tags, addTag, updateTag, deleteTag } = useMemos();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const resetForm = () => {
    setName('');
    setColor('#3b82f6');
    setEditingId(null);
    setShowColorPicker(false);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editingId) {
      updateTag(editingId, name.trim(), color);
    } else {
      addTag(name.trim(), color);
    }
    resetForm();
  };

  const handleEdit = (tag: any) => {
    setEditingId(tag.id);
    setName(tag.name);
    setColor(tag.color);
    setShowColorPicker(false);
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <Popover.Trigger asChild>
        <button className="h-9 px-3 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-sm font-medium transition-colors">
          Tags
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content className="w-80 p-4 bg-popover border border-border rounded-xl shadow-lg z-50 text-popover-foreground outline-none" sideOffset={8}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Gerenciar Tags</h3>
            <Popover.Close asChild>
              <button className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
            </Popover.Close>
          </div>

          <div className="flex flex-col gap-3">
            {tags.length > 0 && (
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                {tags.map(tag => (
                  <div key={tag.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                      <span className="text-sm">{tag.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(tag)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteTag(tag.id)} className="p-1 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 pt-3 border-t border-border flex flex-col gap-2">
              <h4 className="text-xs font-medium text-muted-foreground">{editingId ? 'Editar Tag' : 'Nova Tag'}</h4>
              <div className="flex gap-2 items-center relative">
                <button 
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-8 h-8 rounded-md border border-border flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nome da tag"
                  className="flex-1 h-8 px-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                />
                <button 
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="h-8 px-3 bg-primary text-primary-foreground text-xs font-medium rounded-md disabled:opacity-50"
                >
                  {editingId ? 'Salvar' : 'Criar'}
                </button>
                
                {showColorPicker && (
                  <div className="absolute top-10 left-0 z-[60] bg-card p-2 rounded-xl border border-border shadow-xl">
                    <HexColorPicker color={color} onChange={setColor} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
