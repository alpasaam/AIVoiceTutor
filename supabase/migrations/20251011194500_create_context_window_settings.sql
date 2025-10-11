/*
  # Context Window Settings Table

  1. New Tables
    - `context_window_settings`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, references auth.users) - User reference
      - `x_position` (integer) - Horizontal position in pixels
      - `y_position` (integer) - Vertical position in pixels
      - `is_minimized` (boolean) - Whether window is minimized
      - `is_visible` (boolean) - Whether window is currently visible
      - `auto_show_enabled` (boolean) - Whether to automatically show context
      - `transparency_level` (numeric) - Window transparency (0-1)
      - `last_shown_content` (jsonb) - Cache of last displayed content
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on context_window_settings table
    - Users can only access their own settings
    - Authenticated users required for all operations

  3. Indexes
    - Index on user_id for fast user lookups

  4. Notes
    - Default position is left side of screen (40px, 140px)
    - Default is minimized and auto-show enabled
    - Transparency defaults to fully opaque (1.0)
*/

-- Create context_window_settings table
CREATE TABLE IF NOT EXISTS context_window_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  x_position integer DEFAULT 40,
  y_position integer DEFAULT 140,
  is_minimized boolean DEFAULT true,
  is_visible boolean DEFAULT false,
  auto_show_enabled boolean DEFAULT true,
  transparency_level numeric DEFAULT 1.0 CHECK (transparency_level >= 0 AND transparency_level <= 1),
  last_shown_content jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_context_window_settings_user_id ON context_window_settings(user_id);

-- Enable RLS
ALTER TABLE context_window_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for context_window_settings
CREATE POLICY "Users can view own context window settings"
  ON context_window_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own context window settings"
  ON context_window_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own context window settings"
  ON context_window_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own context window settings"
  ON context_window_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
