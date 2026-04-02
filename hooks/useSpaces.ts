import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
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

    // Fetch spaces owned by the user using storage layer (with immediate refresh on mount)
    const fetchSpaces = async () => {
      try {
        console.log('useSpaces: Fetching spaces via storage layer...');
        // Force refresh on mount to ensure immediate visibility
        const spacesList = await storage.getSpaces(true);
        setSpaces(spacesList);
      } catch (error) {
        console.error('Error fetching spaces:', error);
      } finally {
        setLoading(false);
      }
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
          filter: `user_id=eq.${user.id}`
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

  const createSpace = async (name: string, description?: string, initialWidgets?: any[], emoji?: string): Promise<string> => {
    if (!user) throw new Error('User must be logged in');

    const spaceData = {
      name,
      description: description || null,
      user_id: user.id
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