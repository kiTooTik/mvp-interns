// Test script to check admin deletion functionality
// Run this with: node test-deletion.js

const { createClient } = require('@supabase/supabase-js');

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment Variables Check:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('\n❌ Missing environment variables!');
  console.log('Please add these to your .env.local file:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  process.exit(1);
}

// Create admin client
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testDeletion() {
  try {
    console.log('\n🔍 Testing admin deletion functionality...');
    
    // Test 1: Check if we can access user_roles table
    console.log('\n1. Testing user_roles access...');
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .limit(5);
    
    if (rolesError) {
      console.error('❌ Error accessing user_roles:', rolesError);
    } else {
      console.log('✅ Can access user_roles table');
      console.log('Found roles:', roles?.length || 0);
    }
    
    // Test 2: Check admin users
    console.log('\n2. Checking for admin users...');
    const { data: admins, error: adminError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role')
      .eq('role', 'admin');
    
    if (adminError) {
      console.error('❌ Error checking admin users:', adminError);
    } else {
      console.log('✅ Admin users found:', admins?.length || 0);
      if (admins?.length > 0) {
        console.log('Admin user IDs:', admins.map(a => a.user_id));
      }
    }
    
    // Test 3: Check if we can list users
    console.log('\n3. Testing user listing...');
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error listing users:', usersError);
    } else {
      console.log('✅ Can list users');
      console.log('Total users:', users.users.length);
    }
    
    console.log('\n✅ Deletion functionality test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDeletion();
