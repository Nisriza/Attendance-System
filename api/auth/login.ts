import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables on Vercel');
      return res.status(500).json({ error: 'Server configuration error: Missing Supabase keys in Vercel settings.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Safely parse body incase it comes in as string or undefined
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const name = body?.name;

    if (!name) {
      return res.status(400).json({ error: 'Full name is required in request body' });
    }

    const cleanInputName = name.trim().toLowerCase();

    // Query Supabase
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('name', cleanInputName);

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(401).json({ error: 'Student login failed: no match found with fullname' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Logged in successfully',
      user: data[0] 
    });

  } catch (err: any) {
    console.error('Unhandled server error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
