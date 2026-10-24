import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Get the name from the request body
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    // 2. Clean input in JavaScript (Valid JS syntax)
    const cleanInputName = name.trim().toLowerCase();

    // 3. Query Supabase safely using .ilike() for case-insensitive matching
    const { data, error } = await supabase
      .from('students') // Make sure this matches your actual table name in Supabase
      .select('*')
      .ilike('name', cleanInputName); // Matches the 'name' column ignoring casing

    if (error) {
      throw error;
    }

    // 4. Check if a student was found
    if (!data || data.length === 0) {
      return res.status(401).json({ error: 'Student login failed: no match found with fullname' });
    }

    // Success response
    return res.status(200).json({ 
      success: true, 
      message: 'Logged in successfully',
      student: data[0] 
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
