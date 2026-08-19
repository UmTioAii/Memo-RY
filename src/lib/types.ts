export type MarkerColor = 'red' | 'orange' | 'yellow' | 'blue' | 'white' | 'none';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface MemoItem {
  id: string;
  text: string;
  completed: boolean;
  markerColor: MarkerColor;
  customColor?: string;
  tagIds?: string[];
  createdAt: number;
  updatedAt: number;
  attachments: Attachment[];
  columnId?: string; // which column this memo belongs to (for board view)
  previousColumnId?: string; // remembers the previous column when marked as done
}

export interface Attachment {
  type: 'link' | 'image' | 'video';
  url: string;
  title?: string;
  thumbnail?: string;
  isBase64?: boolean; // for uploaded images
}

export type FilterType = 'all' | 'active' | 'completed';

export type ViewMode = 'list' | 'board';

export interface BoardColumn {
  id: string;
  name: string;
  order: number;
}
