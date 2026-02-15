/**
 * Local API server for creating intern accounts.
 * Run with: node server/create-intern.js
 * Requires in .env: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */
import { createServer } from 'http';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const PORT = 3001;
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  if (!supabaseUrl) console.error('Missing Supabase URL. Add to .env: VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co');
  if (!serviceRoleKey) console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Add it from Supabase Dashboard → Settings → API (use the service_role key, not anon).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function sendJson(res, status, body) {
  if (res.writableEnded) return;
  try {
    const payload = JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(payload);
  } catch (e) {
    console.error('sendJson failed:', e);
    if (!res.writableEnded) res.end(JSON.stringify({ ok: false, error: 'Internal server error' }));
  }
}

async function handleRequest(req, res) {
  const send = (status, body) => sendJson(res, status, body);

  const safeSend = (status, body) => {
    if (!res.writableEnded) send(status, body);
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/create-intern') {
    send(404, { ok: false, error: 'Not found' });
    return;
  }

  console.log('POST /api/create-intern received');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');

  try {
    const body = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks).toString()));
      req.on('error', reject);
    });

    let data;
    try {
      data = JSON.parse(body);
    } catch {
      send(400, { ok: false, error: 'Invalid JSON' });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      send(401, { ok: false, error: 'Missing Authorization header' });
      return;
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData?.user) {
      send(401, { ok: false, error: 'Invalid token' });
      return;
    }
    const caller = userData.user;

    const { data: roleRow, error: roleCheckError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (roleCheckError || !roleRow) {
      send(403, { ok: false, error: 'Admin access required' });
      return;
    }

    const email = data.email?.trim();
    const password = data.password;
    const fullName = data.fullName?.trim();
    const internshipHours = data.internshipHours;

    if (!email || !password || !fullName || internshipHours == null || internshipHours === '') {
      send(400, { ok: false, error: 'email, password, fullName, and internshipHours are required' });
      return;
    }
    const hours = parseInt(internshipHours, 10);
    if (Number.isNaN(hours) || hours < 0) {
      send(400, { ok: false, error: 'internshipHours must be a non-negative number' });
      return;
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      send(400, { ok: false, error: createError.message });
      return;
    }

    if (!created.user) {
      send(500, { ok: false, error: 'Failed to create user' });
      return;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: created.user.id,
      email,
      full_name: fullName,
      required_hours: hours,
      remaining_hours: hours,
      department: 'Other',
    });

    if (profileError) {
      console.error('Profile insert error:', profileError);
      send(400, { ok: false, error: `Profile creation failed: ${profileError.message}` });
      return;
    }
    console.log('Profile created successfully for user:', created.user.id);

    const { error: roleInsertError } = await supabase.from('user_roles').insert({
      user_id: created.user.id,
      role: 'intern',
    });

    if (roleInsertError) {
      console.error('Role insert error:', roleInsertError);
      send(400, { ok: false, error: `Role creation failed: ${roleInsertError.message}` });
      return;
    }
    console.log('Role created successfully for user:', created.user.id);

    send(200, { ok: true, userId: created.user.id });
  } catch (err) {
    const msg = err?.message ?? (typeof err === 'string' ? err : 'Internal server error');
    console.error('Create-intern server error:', err?.stack || err);
    safeSend(500, { ok: false, error: String(msg) });
  }
}

createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('Unhandled rejection in create-intern:', err);
    if (!res.writableEnded) {
      const msg = err?.message ?? (typeof err === 'string' ? err : 'Internal server error');
      sendJson(res, 500, { ok: false, error: String(msg) });
    }
  });
}).listen(PORT, () => {
  console.log(`Create-intern API running at http://localhost:${PORT}/api/create-intern`);
});
