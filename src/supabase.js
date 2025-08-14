import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
const supabaseUrl = 'https://ykwpsojpnfqwqtpxtccv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrd3Bzb2pwbmZxd3F0cHh0Y2N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDkxMjEsImV4cCI6MjA2OTQyNTEyMX0.fRAUneAPz1a7krlsU7le7-g4Ub0pogfyqoeNOcGw1RE'


if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)