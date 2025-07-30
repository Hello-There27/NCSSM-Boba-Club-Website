import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
const supabaseUrl = 'https://urubjyrazejwqckfozwb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVydWJqeXJhemVqd3Fja2ZvendiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDkxMjcsImV4cCI6MjA2OTQyNTEyN30.i2v14izxR-qwHyNYUvs3ZEl91-Sp_hPMePKvdXaq9uY'


if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)