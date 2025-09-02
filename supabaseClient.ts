import { createClient } from '@supabase/supabase-js'

// مشخصات پروژه‌ی Supabase
const supabaseUrl = 'https://ojxrzzcvwxydxqpgexlm.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHJ6emN2d3h5ZHhxcGdleGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MjA4OTIsImV4cCI6MjA3MjM5Njg5Mn0.jdLlNaIVnjmJ0Yrl7AomnmJB4-XtAeNWZ0FFigDDtUs'

// Check if the credentials are placeholders
export const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('...') && !supabaseAnonKey.includes('...');

// ایجاد کلاینت Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const handleSupabaseError = (error: any, context: string) => {
  if (error) {
    console.error(`Error in ${context}:`, error.message)
    throw error
  }
}
