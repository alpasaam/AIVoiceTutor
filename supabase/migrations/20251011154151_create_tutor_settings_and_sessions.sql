/*
  # AI Voice Tutor Database Schema

  1. New Tables
    - `user_settings`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, references auth.users) - User reference
      - `voice_id` (text) - ElevenLabs voice ID
      - `voice_name` (text) - Display name for the voice
      - `ai_pushiness_level` (integer) - 1-5 scale for how hands-on the AI should be
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `tutoring_sessions`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, references auth.users) - User reference
      - `question_text` (text) - The question/problem text
      - `question_image_url` (text) - Screenshot/image URL if uploaded
      - `canvas_state` (jsonb) - Stores the canvas drawing state
      - `conversation_log` (jsonb) - Array of conversation messages
      - `status` (text) - active, completed, archived
      - `created_at` (timestamptz) - Session start time
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on all tables
    - Users can only access their own settings and sessions
    - Authenticated users required for all operations

  3. Indexes
    - Index on user_id for fast session lookups
    - Index on status for filtering active sessions
*/

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  voice_id text DEFAULT 'EXAVITQu4vr4xnSDxMaL',
  voice_name text DEFAULT 'Sarah (Default)',
  ai_pushiness_level integer DEFAULT 3 CHECK (ai_pushiness_level >= 1 AND ai_pushiness_level <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create tutoring_sessions table
CREATE TABLE IF NOT EXISTS tutoring_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_text text,
  question_image_url text,
  canvas_state jsonb DEFAULT '[]'::jsonb,
  conversation_log jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_user_id ON tutoring_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_status ON tutoring_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutoring_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for tutoring_sessions
CREATE POLICY "Users can view own sessions"
  ON tutoring_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON tutoring_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON tutoring_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON tutoring_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);