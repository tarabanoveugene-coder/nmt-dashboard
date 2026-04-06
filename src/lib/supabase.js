import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ckqzicuurwauxxuejshf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcXppY3V1cndhdXh4dWVqc2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjQ4MjcsImV4cCI6MjA5MDgwMDgyN30.hloulZxwpXiTc2RS_2b_K-YDy-BxsGAVhi2MvJF7BJE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
