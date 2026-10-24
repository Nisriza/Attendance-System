export default async function handler(req: any, res: any) {
  // 1. Ensure it's a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Check environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        error: 'Server configuration error: Supabase URL or Anon Key is missing in Vercel Environment Variables.' 
      });
    }

    // Dynamically import supabase inside the handler to prevent top-level module load crashes
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Safely parse request body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const name = body?.name;

    if (!name) {
      return res.status(400).json({ error: 'Full name is required in request body' });
    }

    const cleanInputName = name.trim().toLowerCase();

    // 4. Query the 'users' table
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

    // 5. Success response
    return res.status(200).json({ 
      success: true, 
      message: 'Logged in successfully',
      user: data[0] 
    });

  } catch (err: any) {
    return res.status(500).json({ error: `Internal server crash: ${err.message || err}` });
  }
}
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
