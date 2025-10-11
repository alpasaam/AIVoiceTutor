export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_settings: {
        Row: {
          id: string
          user_id: string
          voice_id: string
          voice_name: string
          ai_pushiness_level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          voice_id?: string
          voice_name?: string
          ai_pushiness_level?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          voice_id?: string
          voice_name?: string
          ai_pushiness_level?: number
          created_at?: string
          updated_at?: string
        }
      }
      tutoring_sessions: {
        Row: {
          id: string
          user_id: string
          question_text: string | null
          question_image_url: string | null
          canvas_state: Json
          conversation_log: Json
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_text?: string | null
          question_image_url?: string | null
          canvas_state?: Json
          conversation_log?: Json
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_text?: string | null
          question_image_url?: string | null
          canvas_state?: Json
          conversation_log?: Json
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      context_window_settings: {
        Row: {
          id: string
          user_id: string
          x_position: number
          y_position: number
          is_minimized: boolean
          is_visible: boolean
          auto_show_enabled: boolean
          transparency_level: number
          last_shown_content: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          x_position?: number
          y_position?: number
          is_minimized?: boolean
          is_visible?: boolean
          auto_show_enabled?: boolean
          transparency_level?: number
          last_shown_content?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          x_position?: number
          y_position?: number
          is_minimized?: boolean
          is_visible?: boolean
          auto_show_enabled?: boolean
          transparency_level?: number
          last_shown_content?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
