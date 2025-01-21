import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Ensure you have these environment variables set in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
  global: {
    headers: {
      'Prefer': 'return=representation'
    }
  }
});

// Function to help diagnose schema issues
export const checkSupabaseTableSchema = async (tableName: string) => {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);

    if (error) {
      console.error(`Error checking ${tableName} schema:`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Unexpected error checking ${tableName} schema:`, error);
    return false;
  }
};