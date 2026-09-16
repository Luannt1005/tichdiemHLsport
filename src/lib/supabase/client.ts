import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dzemhqkvccmpoaumoytf.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6ZW1ocWt2Y2NtcG9hdW1veXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NjI2MTEsImV4cCI6MjEwNTAzODYxMX0.FaP3ijT2Qsf4Tck2byG-8hbmbT-ttzgKWjU3yWf91QE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
});
