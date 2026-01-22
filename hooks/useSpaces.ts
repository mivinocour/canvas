import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Space, User } from '../types/shared';

export function useSpaces(user: User | null) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSpaces([]);
      setLoading(false);
      return;
    }

    // Fetch spaces where user is a member
    const fetchSpaces = async () => {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .contains('member_ids', [user.id])
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching spaces:', error);
        setLoading(false);
        return;
      }

      const spacesList: Space[] = (data || []).map(space => ({
        id: space.id,
        name: space.name,
        description: space.description,
        ownerId: space.owner_id,
        members: space.members || [],
        widgets: space.widgets || [],
        inviteCode: space.invite_code,
        isPublic: space.is_public || false,
        createdAt: new Date(space.created_at).getTime(),
        updatedAt: new Date(space.updated_at).getTime()
      }));

      setSpaces(spacesList);
      setLoading(false);
    };

    fetchSpaces();

    // Set up real-time subscription
    const channel = supabase
      .channel('spaces_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'spaces',
          filter: `member_ids.cs.{${user.id}}`
        },
        () => {
          fetchSpaces(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createSpace = async (name: string, description?: string, initialWidgets?: any[]): Promise<string> => {
    if (!user) throw new Error('User must be logged in');

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const spaceData = {
      name,
      description,
      owner_id: user.id,
      member_ids: [user.id],
      members: [{
        userId: user.id,
        role: 'owner',
        joinedAt: Date.now(),
        displayName: user.displayName,
        photoURL: user.photoURL
      }],
      widgets: initialWidgets || [],
      invite_code: inviteCode,
      is_public: false
    };

    const { data, error } = await supabase
      .from('spaces')
      .insert([spaceData])
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const updateSpace = async (spaceId: string, updates: Partial<Space>) => {
    const updateData: any = {};

    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.widgets) updateData.widgets = updates.widgets;
    if (updates.members) updateData.members = updates.members;
    if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;

    const { error } = await supabase
      .from('spaces')
      .update(updateData)
      .eq('id', spaceId);

    if (error) throw error;
  };

  const deleteSpace = async (spaceId: string) => {
    const { error } = await supabase
      .from('spaces')
      .delete()
      .eq('id', spaceId);

    if (error) throw error;
  };

  return {
    spaces,
    loading,
    createSpace,
    updateSpace,
    deleteSpace
  };
}