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

    console.log('🧮 Processing daily allowance for company budget:', companyBudget);

    // Get current allowance period
    const { data: currentPeriod, error: periodError } = await supabaseAdmin
      .from('allowance_periods')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (periodError) {
      console.error('❌ Error fetching current period:', periodError);
      return res.status(500).json({ error: 'Failed to fetch current allowance period' });
    }

    // Get unpaid attendance records (present but not paid)
    const { data: unpaidRecords, error: attendanceError } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('status', 'present')
      .is('time_out', null)
      .order('date', { ascending: true });

    if (attendanceError) {
      console.error('❌ Error fetching attendance:', attendanceError);
      return res.status(500).json({ error: 'Failed to fetch attendance records' });
    }

    if (!unpaidRecords || unpaidRecords.length === 0) {
      console.log('❌ No unpaid attendance records found');
      return res.status(400).json({ 
        error: 'No unpaid days',
        details: 'There are no unpaid attendance days to process'
      });
    }

    console.log(`📊 Found ${unpaidRecords.length} unpaid attendance records`);

    // Business logic constants
    const dailyRate = 150; // Fixed daily rate per intern
    let remainingBudget = parseFloat(companyBudget);
    let totalPaidDays = 0;
    let totalUsedAmount = 0;
    let processedDays = [];
    let stopAllocation = false;

    // Process each unpaid day
    for (const record of unpaidRecords) {
      // Get unique interns present on this day
      const uniqueInternsForDay = [...new Set(unpaidRecords
        .filter(r => r.date === record.date)
        .map(r => r.user_id))];

      const dailyCost = uniqueInternsForDay.length * dailyRate;

      console.log(`🗓️ Processing day ${record.date}: ${uniqueInternsForDay.length} interns, daily cost: ₱${dailyCost}`);

      // Check if remaining budget is sufficient
      if (remainingBudget >= dailyCost && !stopAllocation) {
        // Mark attendance as PAID
        const { error: updateError } = await supabaseAdmin
          .from('attendance')
          .update({ status: 'paid' })
          .eq('id', record.id);

        if (updateError) {
          console.error(`❌ Failed to mark day ${record.date} as paid:`, updateError);
          return res.status(500).json({ 
            error: 'Failed to update attendance',
            details: updateError.message 
          });
        }

        // Update remaining budget
        remainingBudget -= dailyCost;
        totalPaidDays++;
        totalUsedAmount += dailyCost;
        processedDays.push(record.date);

        console.log(`✅ Day ${record.date} processed: ${uniqueInternsForDay.length} interns paid, remaining budget: ₱${remainingBudget}`);

      } else {
        console.log(`⛔ Stopping allocation: Insufficient budget for day ${record.date}. Required: ₱${dailyCost}, Available: ₱${remainingBudget}`);
        stopAllocation = true;
      }
    }

    // Update current allowance period with final results
    const { error: updatePeriodError } = await supabaseAdmin
      .from('allowance_periods')
      .update({ 
        status: 'completed',
        total_paid_days: totalPaidDays,
        total_used_amount: totalUsedAmount,
        remaining_balance: remainingBudget,
        processed_days: processedDays
      })
      .eq('id', currentPeriod?.id);

    if (updatePeriodError) {
      console.error('❌ Failed to update allowance period:', updatePeriodError);
      return res.status(500).json({ 
        error: 'Failed to update allowance period',
        details: updatePeriodError.message 
      });
    }

    const calculation = {
      totalPaidDays,
      totalUsedAmount,
      remainingBalance: remainingBudget,
      dailyRate,
      totalInterns: unpaidRecords.length, // Total unique interns processed
      processedDays,
      stopAllocation
    };

    console.log('✅ Daily processing completed:', calculation);

    return res.status(200).json({ 
      message: 'Daily allowance processing completed',
      calculation,
      currentPeriod: currentPeriod
    });

  } catch (error) {
    console.error('❌ Daily processing error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
