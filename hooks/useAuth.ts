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

        // Upsert user data to database
        await supabase.from('users').upsert({
          id: userData.id,
          email: userData.email,
          display_name: userData.displayName,
          photo_url: userData.photoURL,
          created_at: new Date(session.user.created_at).toISOString()
        });

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
    signOut
  };
}