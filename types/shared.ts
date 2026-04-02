export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: number;
}

export interface Space {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  ownerId: string;
  members: SpaceMember[];
  widgets: WidgetData[];
  inviteCode: string;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SpaceMember {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: number;
  displayName: string;
  photoURL?: string;
}

export interface WidgetData {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  code: string;
  prompt: string;
  createdAt: number;
  createdBy: string;
  updatedAt?: number;
  updatedBy?: string;
}

export interface Invitation {
  id: string;
  spaceId: string;
  spaceName: string;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  role: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
  expiresAt: number;
}