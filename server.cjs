const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = 3002; // Changed from 3001 to avoid port conflicts

// Middleware
app.use(cors());
app.use(express.json());

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: err.message 
  });
});

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables!');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Delete intern endpoint
app.delete('/api/admin/delete-intern', async (req, res) => {
  console.log('🗑️ Delete request received:', req.body);
  
  try {
    const { userId } = req.body;

    if (!userId) {
      console.log('❌ No userId provided');
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get the requesting user's info from the token
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    
    if (!token) {
      console.log('❌ No authorization token provided');
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    console.log('🔍 Verifying user token...');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ Error getting user:', userError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('✅ User verified:', user.id);

    // Check if user is admin using service role (bypasses RLS)
    console.log('🔍 Checking admin role...');
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (roleError) {
      console.error('❌ Error checking user role:', roleError);
      return res.status(500).json({ error: 'Failed to verify admin access' });
    }

    if (!userRoles || userRoles.length === 0) {
      console.log('❌ User is not admin:', user.id);
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('✅ Admin user confirmed:', user.id);
    console.log('🗑️ Deleting user:', userId);

    // Delete the user using service role admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('❌ Error deleting user:', deleteError);
      return res.status(500).json({ 
        error: 'Failed to delete user',
        details: deleteError.message 
      });
    }

    console.log('✅ User deleted successfully:', userId);
    return res.status(200).json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('❌ Unexpected error in delete-intern API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Calculate allowance endpoint
app.post('/api/admin/calculate-allowance', async (req, res) => {
  console.log('🧮 Allowance calculation request received:', req.body);
  
  try {
    const { totalBudget } = req.body;

    // Validation
    if (!totalBudget || isNaN(totalBudget) || parseFloat(totalBudget) <= 0) {
      console.log('❌ Invalid total budget amount');
      return res.status(400).json({ 
        error: 'Invalid total budget amount',
        details: 'Budget must be a positive number'
      });
    }

    console.log('🧮 Calculating allowance for budget:', totalBudget);

    // Get active interns count
    const { data: userRoles, error: internError } = await supabaseAdmin
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'intern');

    if (internError) {
      console.error('❌ Error fetching interns:', internError);
      return res.status(500).json({ error: 'Failed to fetch interns' });
    }

    const totalInterns = userRoles?.length || 0;

    if (totalInterns === 0) {
      console.log('❌ No active interns found');
      return res.status(400).json({ 
        error: 'No active interns',
        details: 'There are no active interns to allocate allowance to'
      });
    }

    // Business logic calculation
    const dailyAllowance = 150; // Fixed daily rate per intern
    const daysCovered = Math.floor(parseFloat(totalBudget) / totalInterns / dailyAllowance);
    const totalUsed = daysCovered * totalInterns * dailyAllowance;
    const remainingBalance = parseFloat(totalBudget) - totalUsed;

    const calculation = {
      totalBudget: parseFloat(totalBudget),
      dailyAllowance,
      totalInterns,
      daysCovered,
      totalUsed,
      remainingBalance,
      calculationDate: new Date().toISOString()
    };

    console.log('📊 Calculation result:', calculation);

    // Save allowance period
    const { data: allowancePeriod, error: periodError } = await supabaseAdmin
      .from('allowance_periods')
      .insert({
        total_budget: parseFloat(totalBudget),
        daily_rate: dailyAllowance,
        total_interns: totalInterns,
        days_covered: daysCovered,
        total_used: totalUsed,
        remaining_balance: remainingBalance,
        start_date: new Date().toISOString().split('T')[0],
        status: 'active',
        created_by: (await supabaseAdmin.auth.getUser(req.headers.authorization?.replace('Bearer ', '') || '')).data.user?.id
      })
      .select()
      .single();

    if (periodError) {
      console.error('❌ Error saving allowance period:', periodError);
      return res.status(500).json({ 
        error: 'Failed to save allowance period',
        details: periodError.message 
      });
    }

    console.log('✅ Allowance period saved:', allowancePeriod);

    return res.status(200).json({ 
      message: 'Allowance calculated successfully',
      calculation,
      allowancePeriod
    });

  } catch (error) {
    console.error('❌ Allowance calculation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    res.json({ 
      status: 'OK', 
      message: 'API server is running',
      timestamp: new Date().toISOString(),
      endpoints: [
        'DELETE /api/admin/delete-intern',
        'POST /api/admin/calculate-allowance',
        'POST /api/admin/process-allowance-daily'
      ],
      environment: {
        supabaseUrl: !!supabaseUrl,
        serviceRoleKey: !!serviceRoleKey
      },
      ports: {
        api: 3002,
        frontend: 8080
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message 
    });
  }
});

// Process allowance daily endpoint
require('./src/pages/api/admin/process-allowance-daily');

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🗑️  Delete endpoint: http://localhost:${PORT}/api/admin/delete-intern`);
  console.log(`🧮 Calculate endpoint: http://localhost:${PORT}/api/admin/calculate-allowance`);
  console.log(`📅 Process daily endpoint: http://localhost:${PORT}/api/admin/process-allowance-daily`);
});

module.exports = app;
