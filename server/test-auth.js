/**
 * Test script to verify intern login
 * Run with: node server/test-auth.js
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function testInternLogin() {
  const testEmail = 'eeya.bags@mvp.com'; // The actual intern email that was created
  const testPassword = 'Password123!@#';

  console.log('Testing intern login...');
  console.log('Email:', testEmail);
  console.log('Password:', testPassword);

  try {
    // Test login with client auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    console.log('Login result:', { data, error });

    if (error) {
      console.error('Login failed:', error.message);
      
      // Try to get user info to see if they exist
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users.users.find(u => u.email === testEmail);
      
      if (user) {
        console.log('User exists:', user.id);
        console.log('User email confirmed:', user.email_confirmed_at);
        console.log('User created at:', user.created_at);
      } else {
        console.log('User not found in auth system');
      }
    } else {
      console.log('Login successful!');
      console.log('User ID:', data.user?.id);
      console.log('Session:', data.session);
    }
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testInternLogin();
