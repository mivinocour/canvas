export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface WidgetData {
  id: string;
  name: string;
  type: 'ai-app';
  position: Position;
  size: Size;
  code: string; // The raw code string returned by Gemini
  prompt: string; // The original prompt
  data?: any; // Persistent widget state data (e.g., todo items, form data, etc.)
  createdAt: number;
  updatedAt: number;
  version: number; // Track edits
  lastSaved: number; // Timestamp of last successful save
  spaceId?: string; // For local storage association with spaces
}

export interface DragItem {
  type: 'widget';
  id: string;
  offset: Position;
}