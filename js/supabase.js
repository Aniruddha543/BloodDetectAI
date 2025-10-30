// js/supabase.js

// ✅ Import Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ⚙️ Replace with your Supabase Project URL and Anon Key
const SUPABASE_URL = "https://fdiroazxrgqlqmcnxeea.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkaXJvYXp4cmdxbHFtY254ZWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MzI4ODksImV4cCI6MjA3NzMwODg4OX0.Sm_ALvUtLHyOf41eYQaTxFiAjYelts29DjsB91tBjWo";

// ✅ Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Register new doctor
 * Inserts user data into "doctors" table in Supabase
 */
export async function registerDoctor({ firstName, lastName, email, license, password }) {
  try {
    // Create user with email & password in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // Store doctor profile in 'doctors' table
    const { data, error } = await supabase.from('doctors').insert([
      {
        first_name: firstName,
        last_name: lastName,
        email,
        license_no: license,
        user_id: authData.user?.id,
      },
    ]);

    if (error) throw error;

    return { success: true, message: 'Registration successful!' };
  } catch (err) {
    console.error('Error registering doctor:', err.message);
    return { success: false, message: err.message };
  }
}
