/**
 * Simple test without .env dependency
 * Run with: node server/simple-test.js
 */

// Copy the credentials from your .env file here
const SUPABASE_URL = 'https://ymlkdzjcnfzocicvirfl.supabase.co'; // Update this
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3ltbGtkempjbmZ6b2NpY3ZpcmZsLnN1cGFiYXNlLmNvIiwiYXVkIjoiYW5vbiIsImlhdCI6MTc3MjE5Nzc2NywiZXhwIjoyMDg3NzUzNzY3fQ.KyAEwC6F_11MLKxkv4HdssGQ'; // Update this

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLogin() {
  const email = 'eeya.bags@mvp.com';
  const password = 'Password123!@#';

  console.log('Testing login for:', email);
  console.log('Password:', password);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('\n=== LOGIN RESULT ===');
    if (error) {
      console.log('❌ Login failed:', error.message);
      console.log('Error details:', error);
      
      // Try to get more info about the error
      if (error.message.includes('Invalid login credentials')) {
        console.log('\n🔍 Possible causes:');
        console.log('1. Wrong password');
        console.log('2. Email not confirmed');
        console.log('3. User does not exist in auth system');
        console.log('4. Supabase auth settings issue');
      }
    } else {
      console.log('✅ Login successful!');
      console.log('User ID:', data.user?.id);
      console.log('Email:', data.user?.email);
      console.log('Session active:', !!data.session);
    }
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testLogin();
