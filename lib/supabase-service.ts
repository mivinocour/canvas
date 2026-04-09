import { createClient } from '@supabase/supabase-js';
import { WidgetData } from '../types';
import { Space, Invitation, SpaceMember } from '../types/shared';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Device ID for sync tracking
const DEVICE_ID = localStorage.getItem('device_id') ||
  (() => {
    const id = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device_id', id);
    return id;
  })();

// Database types
export interface DbSpace {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbWidgetTemplate {
  id: string;
  name: string;
  description: string | null;
  code: string;
  prompt: string;
  author_id: string | null;
  is_public: boolean;
  category: string;
  tags: string[];
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbWidgetInstance {
  id: string;
  space_id: string;
  template_id: string | null;
  name: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  custom_code: string | null;
  instance_data: Record<string, any>;
  version: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbInvitation {
  id: string;
  space_id: string;
  space_name: string;
  inviter_id: string;
  inviter_name: string;
  inviter_email: string;
  invitee_email: string;
  role: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  expires_at: string;
}

export interface DbSpaceMember {
  id: string;
  space_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  joined_at: string;
  display_name: string;
  photo_url?: string;
}

export class SupabaseService {
  private static instance: SupabaseService;

  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  }

  // Get current user ID
  async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  }

  // Authentication methods
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  // Auth state listener
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // SPACES OPERATIONS
  async getSpaces(): Promise<Space[]> {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching spaces:', error);
      return [];
    }

    return data.map(this.transformDbSpaceToSpace);
  }

  async createSpace(space: Omit<Space, 'id' | 'createdAt' | 'updatedAt'>): Promise<Space | null> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      console.error('User not authenticated');
      return null;
    }

    const { data, error } = await supabase
      .from('spaces')
      .insert({
        name: space.name,
        description: space.description || null,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating space:', error);
      return null;
    }

    return this.transformDbSpaceToSpace(data);
  }

  async updateSpace(id: string, updates: Partial<Space>): Promise<Space | null> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description || null;

    const { data, error } = await supabase
      .from('spaces')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating space:', error);
      return null;
    }

    return this.transformDbSpaceToSpace(data);
  }

  async deleteSpace(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('spaces')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting space:', error);
      return false;
    }

    return true;
  }

  // WIDGET OPERATIONS
  async getWidgetsBySpace(spaceId: string): Promise<WidgetData[]> {
    const { data, error } = await supabase
      .from('widget_instances')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching widgets:', error);
      return [];
    }

    return data.map(this.transformDbWidgetToWidget);
  }

  async createWidget(widget: Omit<WidgetData, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'lastSaved'>, spaceId: string): Promise<WidgetData | null> {
    console.log('Creating widget in database:', {
      widgetName: widget.name,
      spaceId,
      widgetId: (widget as any).id
    });

    const userId = await this.getCurrentUserId();
    if (!userId) {
      console.error('User not authenticated');
      return null;
    }

    // First, create a template for this widget (for now, each widget gets its own template)
    const { data: templateData, error: templateError } = await supabase
      .from('widget_templates')
      .insert({
        name: widget.name,
        description: `Generated from: ${widget.prompt}`,
        code: widget.code,
        prompt: widget.prompt,
        author_id: userId,
        is_public: false,
        category: 'custom',
        tags: ['generated']
      })
      .select()
      .single();

    if (templateError) {
      console.error('Error creating widget template:', templateError);
      return null;
    }

    // Then create the widget instance
    const { data, error } = await supabase
      .from('widget_instances')
      .insert({
        space_id: spaceId,
        template_id: templateData.id,
        name: widget.name,
        position_x: Math.round(widget.position.x),
        position_y: Math.round(widget.position.y),
        width: Math.round(widget.size.width),
        height: Math.round(widget.size.height),
        custom_code: widget.code, // Store the actual code in custom_code
        instance_data: {},
        version: 1,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating widget instance:', error);
      return null;
    }

    console.log('Widget instance created successfully:', data.id);
    return this.transformDbWidgetToWidget(data);
  }

  async updateWidget(id: string, updates: Partial<WidgetData>): Promise<WidgetData | null> {
    const updateData: Partial<DbWidgetInstance> = {
      version: (updates.version || 1) + 1
    };

    if (updates.name) updateData.name = updates.name;
    if (updates.position) {
      updateData.position_x = Math.round(updates.position.x);
      updateData.position_y = Math.round(updates.position.y);
    }
    if (updates.size) {
      updateData.width = Math.round(updates.size.width);
      updateData.height = Math.round(updates.size.height);
    }
    if (updates.code) updateData.custom_code = updates.code;
    if (updates.data !== undefined) updateData.data = updates.data;

    const { data, error } = await supabase
      .from('widget_instances')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating widget:', error);
      return null;
    }

    return this.transformDbWidgetToWidget(data);
  }

  async deleteWidget(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('widget_instances')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting widget:', error);
      return false;
    }

    return true;
  }

  // TEMPLATE OPERATIONS (for future gallery)
  async getPublicTemplates(category?: string): Promise<DbWidgetTemplate[]> {
    let query = supabase
      .from('widget_templates')
      .select('*')
      .eq('is_public', true);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('download_count', { ascending: false });

    if (error) {
      console.error('Error fetching public templates:', error);
      return [];
    }

    return data || [];
  }

  // SYNC OPERATIONS
  async updateSyncMetadata(tableName: string, recordId: string, lastChange: Date): Promise<void> {
    await supabase
      .from('sync_metadata')
      .upsert({
        device_id: DEVICE_ID,
        table_name: tableName,
        record_id: recordId,
        last_local_change: lastChange.toISOString(),
        last_server_sync: new Date().toISOString()
      });
  }

  async getSyncMetadata(tableName: string, recordId: string): Promise<any> {
    const { data } = await supabase
      .from('sync_metadata')
      .select('*')
      .eq('device_id', DEVICE_ID)
      .eq('table_name', tableName)
      .eq('record_id', recordId)
      .single();

    return data;
  }

  // REAL-TIME SUBSCRIPTIONS
  subscribeToSpaces(callback: (spaces: Space[]) => void): () => void {
    const channel = supabase
      .channel('spaces_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spaces' },
        async () => {
          const spaces = await this.getSpaces();
          callback(spaces);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  subscribeToWidgets(spaceId: string, callback: (widgets: WidgetData[]) => void): () => void {
    const channel = supabase
      .channel(`widgets_${spaceId}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'widget_instances',
          filter: `space_id=eq.${spaceId}`
        },
        async () => {
          const widgets = await this.getWidgetsBySpace(spaceId);
          callback(widgets);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // INVITATION OPERATIONS
  async createInvitation(spaceId: string, inviteeEmail: string, role: 'viewer' | 'editor'): Promise<Invitation | null> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser.user) {
      console.error('User not authenticated');
      return null;
    }

    // Get space details
    const { data: spaceData, error: spaceError } = await supabase
      .from('spaces')
      .select('name')
      .eq('id', spaceId)
      .single();

    if (spaceError) {
      console.error('Error fetching space:', spaceError);
      return null;
    }

    // Check if invitation already exists for this email and space
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('*')
      .eq('space_id', spaceId)
      .eq('invitee_email', inviteeEmail)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      throw new Error('An invitation to this space is already pending for this email address');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        space_id: spaceId,
        space_name: spaceData.name,
        inviter_id: currentUser.user.id,
        inviter_name: currentUser.user.user_metadata?.full_name || currentUser.user.email,
        inviter_email: currentUser.user.email,
        invitee_email: inviteeEmail,
        role,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return null;
    }

    return this.transformDbInvitationToInvitation(data);
  }

  async getInvitationsForSpace(spaceId: string): Promise<Invitation[]> {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return [];
    }

    return data.map(this.transformDbInvitationToInvitation);
  }

  async getInvitationsForUser(userEmail: string): Promise<Invitation[]> {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('invitee_email', userEmail)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user invitations:', error);
      return [];
    }

    return data.map(this.transformDbInvitationToInvitation);
  }

  async acceptInvitation(invitationId: string): Promise<boolean> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser.user) {
      console.error('User not authenticated');
      return false;
    }

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      console.error('Invitation not found or already processed:', inviteError);
      return false;
    }

    // Check if invitation is still valid
    if (new Date(invitation.expires_at) < new Date()) {
      console.error('Invitation has expired');
      return false;
    }

    // Start transaction - add member and update invitation
    const { error: memberError } = await supabase
      .from('space_members')
      .insert({
        space_id: invitation.space_id,
        user_id: currentUser.user.id,
        role: invitation.role,
        display_name: currentUser.user.user_metadata?.full_name || currentUser.user.email,
        photo_url: currentUser.user.user_metadata?.avatar_url
      });

    if (memberError) {
      console.error('Error adding space member:', memberError);
      return false;
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId);

    if (updateError) {
      console.error('Error updating invitation status:', updateError);
      return false;
    }

    return true;
  }

  async getSpaceMembers(spaceId: string): Promise<SpaceMember[]> {
    const { data, error } = await supabase
      .from('space_members')
      .select('*')
      .eq('space_id', spaceId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching space members:', error);
      return [];
    }

    return data.map(this.transformDbSpaceMemberToSpaceMember);
  }

  async removeSpaceMember(spaceId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('space_members')
      .delete()
      .eq('space_id', spaceId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing space member:', error);
      return false;
    }

    return true;
  }

  // TRANSFORMATION HELPERS
  private transformDbSpaceToSpace(dbSpace: DbSpace): Space {
    return {
      id: dbSpace.id,
      name: dbSpace.name,
      description: dbSpace.description || undefined,
      emoji: dbSpace.emoji || undefined,
      createdAt: new Date(dbSpace.created_at).getTime(),
      updatedAt: new Date(dbSpace.updated_at).getTime()
    } as Space;
  }

  private transformDbWidgetToWidget(dbWidget: DbWidgetInstance): WidgetData {
    return {
      id: dbWidget.id,
      name: dbWidget.name,
      type: 'ai-app',
      position: {
        x: dbWidget.position_x,
        y: dbWidget.position_y
      },
      size: {
        width: dbWidget.width,
        height: dbWidget.height
      },
      code: dbWidget.custom_code || '',
      prompt: 'Generated widget', // We'd need to join with template to get original prompt
      data: dbWidget.data || null,
      createdAt: new Date(dbWidget.created_at).getTime(),
      updatedAt: new Date(dbWidget.updated_at).getTime(),
      version: dbWidget.version,
      lastSaved: new Date(dbWidget.updated_at).getTime()
    };
  }

  private transformDbInvitationToInvitation(dbInvitation: DbInvitation): Invitation {
    return {
      id: dbInvitation.id,
      spaceId: dbInvitation.space_id,
      spaceName: dbInvitation.space_name,
      inviterName: dbInvitation.inviter_name,
      inviterEmail: dbInvitation.inviter_email,
      inviteeEmail: dbInvitation.invitee_email,
      role: dbInvitation.role,
      status: dbInvitation.status,
      createdAt: new Date(dbInvitation.created_at).getTime(),
      expiresAt: new Date(dbInvitation.expires_at).getTime()
    };
  }

  private transformDbSpaceMemberToSpaceMember(dbMember: DbSpaceMember): SpaceMember {
    return {
      userId: dbMember.user_id,
      role: dbMember.role,
      joinedAt: new Date(dbMember.joined_at).getTime(),
      displayName: dbMember.display_name,
      photoURL: dbMember.photo_url
    };
  }
}

export const supabaseService = SupabaseService.getInstance();