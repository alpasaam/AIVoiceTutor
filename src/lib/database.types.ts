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
    }
  }
}
