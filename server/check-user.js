/**
 * Check if user exists in Supabase Auth
 * Run with: node server/check-user.js <email>
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
config({ path: join(__dirname, '.env') });

console.log('Looking for .env at:', join(__dirname, '.env'));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials');
  console.log('Make sure your .env file has:');
  console.log('VITE_SUPABASE_URL=your_supabase_url');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function checkUser(email) {
  console.log('Checking user:', email);

  try {
    // Get all users and find the one we're looking for
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.users.find(u => u.email === email);

    if (!user) {
      console.log('❌ User not found in Supabase Auth');
      return;
    }

    console.log('✅ User found in Supabase Auth:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
    console.log('   Created at:', user.created_at);
    console.log('   Last sign in:', user.last_sign_in_at || 'Never');

    // Test password reset
    console.log('\n🔄 Testing password reset...');
    const newPassword = 'Password123!@#';
    
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword, email_confirm: true }
    );

    if (error) {
      console.log('❌ Password reset failed:', error.message);
    } else {
      console.log('✅ Password reset successful!');
      console.log('   New password:', newPassword);
    }

    // Test login
    console.log('\n🔐 Testing login...');
    const client = createClient(supabaseUrl, 'anon-key', { auth: { persistSession: false } });
    
    const { data: loginData, error: loginError } = await client.auth.signInWithPassword({
      email: email,
      password: newPassword,
    });

    if (loginError) {
      console.log('❌ Login failed:', loginError.message);
    } else {
      console.log('✅ Login successful!');
      console.log('   User ID:', loginData.user?.id);
      console.log('   Session active:', !!loginData.session);
    }

  } catch (err) {
    console.error('Check failed:', err);
  }
}

const email = process.argv[2];
if (!email) {
  console.log('Usage: node server/check-user.js <email>');
  console.log('Example: node server/check-user.js eeya.bags@mvp.com');
  process.exit(1);
}

checkUser(email);
