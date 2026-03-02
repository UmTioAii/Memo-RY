export type MarkerColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange' | 'purple' | 'none';

export interface MemoItem {
  id: string;
  text: string;
  completed: boolean;
  markerColor: MarkerColor;
  createdAt: number;
  updatedAt: number;
  attachments: Attachment[];
  columnId?: string; // which column this memo belongs to (for board view)
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
