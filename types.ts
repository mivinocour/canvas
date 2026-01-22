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
  createdAt: number;
}

export interface DragItem {
  type: 'widget';
  id: string;
  offset: Position;
}