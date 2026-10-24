import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Helper to make Vercel Node response support .status().json()
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
      return res.status(500).json({ 
        error: 'Server configuration error: Supabase URL or Anon Key is missing in Vercel Environment Variables.' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Safely parse request body
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // ignore parse error
      }
    }

    const name = body?.name;

    if (!name) {
      return res.status(400).json({ error: 'Full name is required in request body' });
    }

    const cleanInputName = name.trim().toLowerCase();

    // Query the 'users' table in Supabase
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('name', cleanInputName);

    if (error) {
      return res.status(500).json({ error: `Database error: ${error.message}` });
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
    return res.status(500).json({ error: `Internal server crash: ${err.message || err}` });
  }
}
