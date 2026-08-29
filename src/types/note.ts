export interface Note {
  id: string;
  title: string;
  folder: string;
  tags: string[];
  created: string;
  updated: string;
  pinned: boolean;
  content: string;
  updatedAt: string;
  deletedAt: string | null;
}
