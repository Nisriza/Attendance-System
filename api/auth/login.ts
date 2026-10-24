import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  console.log("--- Login API Invoked ---");
  console.log("Method:", req.method);

  // 1. Validate request method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Check environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Configuration Error: Missing Supabase URL or Key");
      return res.status(500).json({ 
        error: 'Server configuration error: Supabase URL or Anon Key is missing in Vercel Environment Variables.' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Safely parse request body
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error("Error parsing request body string:", e);
      }
    }

    const name = body?.name;
    console.log("Target login name:", name);

    if (!name) {
      return res.status(400).json({ error: 'Full name is required in request body' });
    }

    const cleanInputName = name.trim().toLowerCase();

    // 4. Query the 'users' table in Supabase
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('name', cleanInputName);

    if (error) {
      console.error("Supabase Query Error:", error);
      return res.status(500).json({ error: `Database error: ${error.message}` });
    }

    if (!data || data.length === 0) {
      console.log("Login failed: No user found for name ->", cleanInputName);
      return res.status(401).json({ error: 'Student login failed: no match found with fullname' });
    }

    console.log("Login successful for:", data[0]?.name);
    // 5. Success response
    return res.status(200).json({ 
      success: true, 
      message: 'Logged in successfully',
      user: data[0] 
    });

  } catch (err: any) {
    console.error("Unhandled Server Exception:", err);
    return res.status(500).json({ error: `Internal server crash: ${err.message || err}` });
  }
}
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
