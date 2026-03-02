import { Globe } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n, type Locale } from '@/lib/i18n';

const languages: { code: Locale; label: string; flag: string }[] = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const current = languages.find(l => l.code === locale)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-10 flex items-center gap-1.5 px-2.5 rounded-full bg-card border border-border hover:bg-accent transition-colors"
      >
        <span className="text-sm">{current.flag}</span>
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              className="absolute right-0 top-full mt-1.5 bg-popover border border-border rounded-xl shadow-lg py-1 z-50 min-w-[140px]"
            >
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { setLocale(lang.code); setOpen(false); }}
                  className={`w-full px-3 py-2 text-xs text-left flex items-center gap-2.5 hover:bg-accent transition-colors ${
                    locale === lang.code ? 'text-primary font-medium' : 'text-foreground'
                  }`}
                >
                  <span className="text-sm">{lang.flag}</span>
                  {lang.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
