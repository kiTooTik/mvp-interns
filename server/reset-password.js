/**
 * Reset intern password script
 * Run with: node server/reset-password.js <email>
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function resetInternPassword(email) {
  const newPassword = 'Password123!@#';

  console.log('Resetting password for:', email);
  console.log('New password:', newPassword);

  try {
    // Get user by email
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.users.find(u => u.email === email);

    if (!user) {
      console.error('User not found:', email);
      return;
    }

    console.log('Found user:', user.id);

    // Update user password
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword, email_confirm: true }
    );

    console.log('Password update result:', { data, error });

    if (error) {
      console.error('Password reset failed:', error.message);
    } else {
      console.log('Password reset successful!');
      console.log('Try logging in with:', email, 'and', newPassword);
    }
  } catch (err) {
    console.error('Reset failed:', err);
  }
}

const email = process.argv[2];
if (!email) {
  console.log('Usage: node server/reset-password.js <email>');
  console.log('Example: node server/reset-password.js intern@example.com');
  process.exit(1);
}

resetInternPassword(email);
