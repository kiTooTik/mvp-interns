const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { companyBudget } = req.body;

    // Validation
    if (!companyBudget || isNaN(companyBudget) || parseFloat(companyBudget) <= 0) {
      console.log('❌ Invalid company budget amount');
      return res.status(400).json({ 
        error: 'Invalid company budget amount',
        details: 'Company budget must be a positive number'
      });
    }

    console.log('🧮 Calculating allowance for company budget:', companyBudget);

    // Get active interns count
    const { data: userRoles, error: internError } = await supabaseAdmin
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'intern');

    if (internError) {
      console.error('Error fetching interns:', internError);
      return res.status(500).json({ error: 'Failed to fetch interns' });
    }

    const totalInterns = userRoles?.length || 0;

    if (totalInterns === 0) {
      return res.status(400).json({ 
        error: 'No active interns',
        details: 'There are no active interns to allocate allowance to'
      });
    }

    // Business logic calculation
    const dailyAllowance = 150; // Fixed daily rate per intern
    const daysCovered = Math.floor(parseFloat(companyBudget) / totalInterns / dailyAllowance);
    const totalUsed = daysCovered * totalInterns * dailyAllowance;
    const remainingBalance = parseFloat(companyBudget) - totalUsed;

    const calculation = {
      totalBudget: parseFloat(companyBudget),
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
        total_budget: parseFloat(companyBudget),
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
      message: 'Company allowance calculated successfully',
      calculation,
      allowancePeriod
    });

  } catch (error) {
    console.error('❌ Calculation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
