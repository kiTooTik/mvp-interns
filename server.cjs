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
app.use(express.urlencoded({ extended: true }));

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

// Check environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
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
    // Accept both keys for compatibility with frontend
    const totalBudget = req.body.totalBudget ?? req.body.companyBudget;

    // Validation
    if (!totalBudget || isNaN(totalBudget) || parseFloat(totalBudget) <= 0) {
      console.log('❌ Invalid total budget amount');
      return res.status(400).json({
        error: 'Invalid total budget amount',
        details: 'Budget must be a positive number'
      });
    }

    // Require admin auth
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    if (!token) {
      return res.status(401).json({ error: 'Authorization required' });
    }
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const { data: adminRow } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!adminRow) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('🧮 Calculating allowance for budget:', totalBudget);

    // Get active interns count (use count from response when head: true)
    const { count: totalInterns, error: internError } = await supabaseAdmin
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'intern');

    if (internError) {
      console.error('❌ Error fetching interns:', internError);
      return res.status(500).json({ error: 'Failed to fetch interns' });
    }

    const count = totalInterns ?? 0;

    if (count === 0) {
      console.log('❌ No active interns found');
      return res.status(400).json({
        error: 'No active interns',
        details: 'There are no active interns to allocate allowance to'
      });
    }

    // Business logic calculation
    const dailyAllowance = 150; // Fixed daily rate per intern
    const daysCovered = Math.floor(parseFloat(totalBudget) / count / dailyAllowance);
    const totalUsed = daysCovered * count * dailyAllowance;
    const remainingBalance = parseFloat(totalBudget) - totalUsed;

    const calculation = {
      totalBudget: parseFloat(totalBudget),
      dailyAllowance,
      totalInterns: count,
      daysCovered,
      totalUsed,
      remainingBalance,
      calculationDate: new Date().toISOString()
    };

    console.log('📊 Calculation result:', calculation);

    // Save allowance period (created_by = current admin user)
    const { data: allowancePeriod, error: periodError } = await supabaseAdmin
      .from('allowance_periods')
      .insert({
        total_budget: parseFloat(totalBudget),
        daily_rate: dailyAllowance,
        total_interns: count,
        days_covered: daysCovered,
        total_used: totalUsed,
        remaining_balance: remainingBalance,
        start_date: new Date().toISOString().split('T')[0],
        status: 'active',
        created_by: user.id
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
        '/api/admin/delete-intern',
        '/api/admin/calculate-allowance',
        '/api/admin/process-allowance-daily',
        '/api/create-intern'
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
app.post('/api/admin/process-allowance-daily', async (req, res) => {
  console.log('📅 Daily allowance processing request received:', req.body);

  try {
    const { companyBudget } = req.body;

    if (!companyBudget || isNaN(companyBudget) || parseFloat(companyBudget) <= 0) {
      return res.status(400).json({ error: 'Invalid budget amount' });
    }

    // Get the requesting user's info for authorization
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return res.status(401).json({ error: 'Invalid token' });

    // Verify admin role
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!userRoles) return res.status(403).json({ error: 'Admin access required' });

    // Get all unpaid attendance records (marked as present)
    const { data: attendanceRecords, error: attError } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('status', 'present')
      .order('date', { ascending: true });

    if (attError) throw attError;

    const dailyRate = 150;
    let currentBalance = parseFloat(companyBudget);
    let totalPaidDays = 0;
    let totalUsedAmount = 0;
    let stopAllocation = false;
    const processedDays = [];

    // Process each record sequentially
    for (const record of (attendanceRecords || [])) {
      if (currentBalance >= dailyRate) {
        // Mark as paid
        const { error: updateError } = await supabaseAdmin
          .from('attendance')
          .update({ status: 'paid' })
          .eq('id', record.id);

        if (!updateError) {
          currentBalance -= dailyRate;
          totalUsedAmount += dailyRate;
          totalPaidDays++;
          processedDays.push(record.id);
        } else {
          console.error(`Error paying record ${record.id}:`, updateError);
        }
      } else {
        stopAllocation = true;
        break;
      }
    }

    const calculation = {
      totalPaidDays,
      totalUsedAmount,
      remainingBalance: currentBalance,
      dailyRate,
      totalInterns: attendanceRecords?.length || 0,
      processedDays,
      stopAllocation
    };

    console.log('✅ Daily processing complete:', calculation);

    return res.status(200).json({
      message: 'Daily allowance processed successfully',
      calculation
    });

  } catch (error) {
    console.error('❌ Daily processing error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create intern endpoint (inline)
app.post('/api/create-intern', async (req, res) => {
  try {
    // Require admin auth
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    if (!token) {
      return res.status(401).json({ error: 'Authorization required' });
    }
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const { data: adminRow } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!adminRow) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Vercel / some proxies can surface body as a string; be defensive.
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    if (!body || typeof body !== 'object') body = {};

    const email = body.email;
    const password = body.password;
    const fullName = body.fullName ?? body.full_name;
    const internshipHoursRaw = body.internshipHours ?? body.internship_hours ?? body.required_hours;
    const department = body.department;

    const finalPassword = password || 'Password123!@#';

    const missing = [];
    if (!email) missing.push('email');
    if (!fullName) missing.push('fullName');
    if (internshipHoursRaw === undefined || internshipHoursRaw === null) missing.push('internshipHours');
    if (missing.length) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing,
        receivedKeys: Object.keys(body),
      });
    }

    const internshipHours = Number(internshipHoursRaw);
    if (!Number.isFinite(internshipHours) || internshipHours < 0) {
      return res.status(400).json({
        error: 'Invalid internshipHours',
        details: 'internshipHours must be a non-negative number',
      });
    }

    const { data: { user: newUser }, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (createUserError) throw createUserError;

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      user_id: newUser.id,
      email,
      full_name: fullName,
      required_hours: internshipHours,
      remaining_hours: internshipHours,
      department: department || 'Other',
      first_login: true,
      default_password_used: true,
    });

    if (profileError) throw profileError;

    const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
      user_id: newUser.id,
      role: 'intern'
    });

    if (roleError) throw roleError;

    res.status(200).json({ ok: true, message: 'Intern created successfully' });
  } catch (error) {
    console.error('Create intern error:', error);
    res.status(500).json({ error: error.message || 'Failed to create intern' });
  }
});

// Delete intern endpoint
// require('./src/pages/api/admin/delete-intern.cjs');

// Debug: log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Headers:`, Object.keys(req.headers));
  next();
});

// Finalizing server configuration

// Start server only in non-production environments
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🗑️  Delete endpoint: http://localhost:${PORT}/api/admin/delete-intern`);
    console.log(`🧮 Calculate endpoint: http://localhost:${PORT}/api/admin/calculate-allowance`);
  });
}

module.exports = app;
