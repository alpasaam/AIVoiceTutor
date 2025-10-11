import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type UserSettings = Database['public']['Tables']['user_settings']['Row'];

export function useSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading settings:', error);
      setLoading(false);
      return;
    }

    if (!data) {
      await createDefaultSettings();
    } else {
      setSettings(data);
    }
    setLoading(false);
  };

  const createDefaultSettings = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        voice_id: 'EXAVITQu4vr4xnSDxMaL',
        voice_name: 'Sarah (Default)',
        ai_pushiness_level: 3,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating default settings:', error);
      return;
    }

    setSettings(data);
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!userId || !settings) return;

    const { data, error } = await supabase
      .from('user_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      return { error };
    }

    setSettings(data);
    return { data };
  };

  return { settings, loading, updateSettings, refreshSettings: loadSettings };
}
