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
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    // Clean input to safely match casing and spacing
    const cleanInputName = name.trim().toLowerCase();

    // Query the 'users' table using the 'name' column
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('name', cleanInputName);

    if (error) {
      throw error;
    }

    // Check if a user/student was found
    if (!data || data.length === 0) {
      return res.status(401).json({ error: 'Student login failed: no match found with fullname' });
    }

    // Success response
    return res.status(200).json({ 
      success: true, 
      message: 'Logged in successfully',
      user: data[0] 
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
