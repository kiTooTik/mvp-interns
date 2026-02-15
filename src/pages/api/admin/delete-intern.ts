import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables:', {
        supabaseUrl: !!supabaseUrl,
        serviceRoleKey: !!serviceRoleKey
      });
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create service role client (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Get the requesting user's info from the token
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    
    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is admin using service role (bypasses RLS)
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (roleError) {
      console.error('Error checking user role:', roleError);
      return res.status(500).json({ error: 'Failed to verify admin access' });
    }

    if (!userRoles || userRoles.length === 0) {
      console.log('User is not admin:', user.id);
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('Admin user confirmed:', user.id);
    console.log('Deleting user:', userId);

    // Delete the user using service role admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return res.status(500).json({ 
        error: 'Failed to delete user',
        details: deleteError.message 
      });
    }

    console.log('User deleted successfully:', userId);
    return res.status(200).json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Unexpected error in delete-intern API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
