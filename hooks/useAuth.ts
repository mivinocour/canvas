import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types/shared';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userData: User = {
          id: session.user.id,
          email: session.user.email || '',
          displayName: session.user.user_metadata?.full_name || 'Anonymous',
          photoURL: session.user.user_metadata?.avatar_url,
          createdAt: new Date(session.user.created_at).getTime()
        };
        setUser(userData);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const userData: User = {
          id: session.user.id,
          email: session.user.email || '',
          displayName: session.user.user_metadata?.full_name || 'Anonymous',
          photoURL: session.user.user_metadata?.avatar_url,
          createdAt: new Date(session.user.created_at).getTime()
        };

        // User data is managed by Supabase auth - no need to duplicate in custom table

        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: fullName ? {
          data: {
            full_name: fullName
          }
        } : undefined
      });

      if (error) throw error;

      return {
        success: true,
        needsConfirmation: !data.user?.email_confirmed_at,
        user: data.user
      };
    } catch (error: any) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const updateUserProfile = async (fullName: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    signInWithGoogle,
    signUp,
    signIn,
    signOut,
    updateUserProfile
  };
}