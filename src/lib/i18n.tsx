import { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export type Locale = 'pt' | 'en' | 'es';

const translations = {
  pt: {
    subtitle: 'Seu bloco de notas local',
    addNewMemo: 'Adicionar novo memo...',
    placeholder: 'O que está pensando? Cole links, URLs de imagens...',
    cancel: 'Cancelar',
    add: 'Adicionar',
    tip: 'Dica: Ctrl+Enter para salvar · Cole URLs para pré-visualizar',
    save: 'Salvar',
    all: 'Todos',
    active: 'Ativos',
    done: 'Feitos',
    left: 'restantes',
    doneCount: 'feitos',
    clearDone: 'Limpar feitos',
    emptyTitle: 'Sua memória está vazia',
    emptyDesc: 'Adicione seu primeiro memo acima. Cole links para pré-visualizar, use marcadores coloridos para organizar.',
    noActive: 'Nenhum memo ativo',
    noCompleted: 'Nenhum memo concluído',
    footer: 'Todos os dados salvos localmente no navegador · Sem necessidade de conta',
    addMemo: 'Adicionar memo',
    writeSomething: 'Escreva algo...',
    rename: 'Renomear',
    delete: 'Excluir',
    addColumn: 'Adicionar coluna',
    columnName: 'Nome da coluna...',
    create: 'Criar',
    clickToPlay: 'Clique para assistir',
    open: 'Abrir',
    openNewTab: 'Abrir em nova aba',
    preview: 'Pré-visualizar',
    attachImage: 'Anexar imagem',
    imageAttached: 'imagem(ns) anexada(s)',
    dropHere: 'Soltar aqui',
    dragMemo: 'Arrastar memo',
  },
  en: {
    subtitle: 'Your local memory keeper',
    addNewMemo: 'Add a new memo...',
    placeholder: "What's on your mind? Paste links, image URLs...",
    cancel: 'Cancel',
    add: 'Add',
    tip: 'Tip: Ctrl+Enter to save · Paste URLs for previews',
    save: 'Save',
    all: 'All',
    active: 'Active',
    done: 'Done',
    left: 'left',
    doneCount: 'done',
    clearDone: 'Clear done',
    emptyTitle: 'Your memory is empty',
    emptyDesc: 'Add your first memo above. Paste links for previews, use color markers to organize.',
    noActive: 'No active memos',
    noCompleted: 'No completed memos',
    footer: 'All data stored locally in your browser · No account needed',
    addMemo: 'Add memo',
    writeSomething: 'Write something...',
    rename: 'Rename',
    delete: 'Delete',
    addColumn: 'Add column',
    columnName: 'Column name...',
    create: 'Create',
    clickToPlay: 'Click to play',
    open: 'Open',
    openNewTab: 'Open in new tab',
    preview: 'Preview',
    attachImage: 'Attach image',
    imageAttached: 'image(s) attached',
    dropHere: 'Drop here',
    dragMemo: 'Drag memo',
  },
  es: {
    subtitle: 'Tu bloc de notas local',
    addNewMemo: 'Agregar un nuevo memo...',
    placeholder: '¿Qué tienes en mente? Pega enlaces, URLs de imágenes...',
    cancel: 'Cancelar',
    add: 'Agregar',
    tip: 'Consejo: Ctrl+Enter para guardar · Pega URLs para previsualizar',
    save: 'Guardar',
    all: 'Todos',
    active: 'Activos',
    done: 'Hechos',
    left: 'pendientes',
    doneCount: 'hechos',
    clearDone: 'Limpiar hechos',
    emptyTitle: 'Tu memoria está vacía',
    emptyDesc: 'Agrega tu primer memo arriba. Pega enlaces para previsualizar, usa marcadores de color para organizar.',
    noActive: 'No hay memos activos',
    noCompleted: 'No hay memos completados',
    footer: 'Todos los datos guardados localmente en tu navegador · Sin necesidad de cuenta',
    addMemo: 'Agregar memo',
    writeSomething: 'Escribe algo...',
    rename: 'Renombrar',
    delete: 'Eliminar',
    addColumn: 'Agregar columna',
    columnName: 'Nombre de columna...',
    create: 'Crear',
    clickToPlay: 'Clic para reproducir',
    open: 'Abrir',
    openNewTab: 'Abrir en nueva pestaña',
    preview: 'Previsualizar',
    attachImage: 'Adjuntar imagen',
    imageAttached: 'imagen(es) adjuntada(s)',
    dropHere: 'Soltar aquí',
    dragMemo: 'Arrastrar memo',
  },
} as const;

export type TranslationKeys = keyof typeof translations.pt;

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKeys) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useLocalStorage<Locale>('memory-locale', 'pt');
  const t = (key: TranslationKeys) => translations[locale][key] || key;
  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
