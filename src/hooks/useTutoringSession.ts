import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type TutoringSession = Database['public']['Tables']['tutoring_sessions']['Row'];

export function useTutoringSession(userId: string | undefined) {
  const [activeSession, setActiveSession] = useState<TutoringSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadActiveSession();
  }, [userId]);

  const loadActiveSession = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('tutoring_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading session:', error);
    } else {
      setActiveSession(data);
    }
    setLoading(false);
  };

  const createSession = async (questionText?: string, questionImageUrl?: string) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('tutoring_sessions')
      .insert({
        user_id: userId,
        question_text: questionText || null,
        question_image_url: questionImageUrl || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return { error };
    }

    setActiveSession(data);
    return { data };
  };

  const updateSession = async (updates: Partial<TutoringSession>) => {
    if (!userId || !activeSession) return;

    const { data, error } = await supabase
      .from('tutoring_sessions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', activeSession.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating session:', error);
      return { error };
    }

    setActiveSession(data);
    return { data };
  };

  const completeSession = async () => {
    if (!activeSession) return;

    const { error } = await supabase
      .from('tutoring_sessions')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', activeSession.id);

    if (error) {
      console.error('Error completing session:', error);
      return { error };
    }

    setActiveSession(null);
    return { success: true };
  };

  return {
    activeSession,
    loading,
    createSession,
    updateSession,
    completeSession,
    refreshSession: loadActiveSession,
  };
}
