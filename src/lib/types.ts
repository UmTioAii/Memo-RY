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
  columnId?: string;          // board view: which kanban column
  previousColumnId?: string;  // board view: column before marking done
  listSectionId?: string;     // list view: which section (e.g. 'todo', 'done', or custom id)
}

export interface Attachment {
  type: 'link' | 'image' | 'video';
  url: string;
  title?: string;
  thumbnail?: string;
  isBase64?: boolean;
}

export type FilterType = 'all' | 'active' | 'completed';

export type ViewMode = 'list' | 'board';

export interface BoardColumn {
  id: string;
  name: string;
  order: number;
}

export interface ListSection {
  id: string;
  name: string;
  order: number;
  collapsed?: boolean;
}
