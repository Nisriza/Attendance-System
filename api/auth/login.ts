import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Helper for Vercel raw node response
  res.status = (code: number) => {
    res.statusCode = code;
    return {
      json: (data: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      }
    };
  };

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing Supabase credentials in environment variables.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body safely
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const { name } = body || {};

    if (!name) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }

    const cleanInputName = name.trim().toLowerCase();

    // Check if the name exists in the 'users' table (case-insensitive)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('name', cleanInputName);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // If name doesn't exist, fail login
    if (!data || data.length === 0) {
      return res.status(401).json({ error: 'Login failed: Name does not exist in the database.' });
    }

    // Name exists! Send success response back with user info
    return res.status(200).json({ 
      success: true, 
      message: 'Logged in successfully',
      user: data[0] 
    });

  } catch (err: any) {
    return res.status(500).json({ error: `Internal server error: ${err.message || err}` });
  }
}

  } catch (err: any) {
    return res.status(500).json({ error: `Internal server crash: ${err.message || err}` });
  }
}
