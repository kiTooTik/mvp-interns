# 🔐 Security Setup Guide

This guide helps you set up proper security for your Intern DTR system.

## 🚀 Required Environment Variables

Add these to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Security Settings
NEXTAUTH_SECRET=your_nextauth_secret_here
NODE_ENV=production
```

## 🔑 How to Get Supabase Keys

### 1. Project URL
- Go to Supabase Dashboard → Settings → API
- Copy the "Project URL"

### 2. Anon Key
- Go to Supabase Dashboard → Settings → API
- Copy the "anon public" key

### 3. Service Role Key
- Go to Supabase Dashboard → Settings → API
- Copy the "service_role" key
- ⚠️ **IMPORTANT**: This key has admin privileges - keep it secure!

## 🛡️ Security Best Practices

### Environment Variables
```bash
# ✅ Good: Use .env.local (gitignored)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ❌ Bad: Hardcoded in code
const supabaseUrl = "https://your-project.supabase.co"
```

### Database Security
- ✅ **RLS Enabled**: All tables have Row Level Security
- ✅ **Admin-Only Operations**: Sensitive actions require admin role
- ✅ **Audit Logging**: All changes are tracked
- ✅ **Data Ownership**: Users can only access their own data

### API Security
- ✅ **Token Validation**: All API calls require valid tokens
- ✅ **Role-Based Access**: Different permissions for different roles
- ✅ **Input Validation**: All inputs are validated and sanitized
- ✅ **SQL Injection Protection**: Using parameterized queries

## 🔧 RLS Policies Overview

### 📋 Table Access Matrix

| Table | Users | Admins | Interns | Public |
|-------|-------|-------|--------|
| profiles | ✅ Own | ✅ Limited | ❌ |
| user_roles | ✅ Own | ❌ | ❌ |
| attendance | ✅ Own | ✅ Limited | ❌ |
| correction_requests | ✅ Own | ✅ Pending | ❌ |
| allowance_periods | ❌ | ✅ | ✅ |
| allowance_summaries | ✅ Own | ✅ | ❌ |
| audit_logs | ❌ | ✅ | ❌ |
| departments | ❌ | ✅ | ✅ |
| invite_links | ❌ | ✅ | ❌ |

### 🎯 Key Security Features

#### **1. Data Ownership**
- Users can only access their own records
- Admins can access all records
- Interns can view limited info about other interns

#### **2. Field-Level Security**
- Sensitive fields (user_id, created_at, etc.) are protected
- Users can only update safe fields
- Admins can update all fields

#### **3. Audit Trail**
- All changes are logged to `audit_logs` table
- Includes user, action, timestamp, and IP address
- Immutable records - cannot be deleted or modified

#### **4. Role-Based Access**
- Different permissions for different user types
- Admins have full control
- Interns have limited access
- Public users have read-only access to some data

## 🚀 Migration Steps

### 1. Run the RLS Migration
```bash
# Execute the enhanced RLS policies
npx supabase db push
```

### 2. Verify RLS is Working
```sql
-- Test RLS policies
SELECT * FROM profiles LIMIT 1; -- Should work for authenticated users
SELECT * FROM user_roles LIMIT 1; -- Should work for authenticated users
SELECT * FROM audit_logs LIMIT 1; -- Should work for admins only
```

### 3. Test Different User Types
- **Admin**: Can access everything
- **Intern**: Can access own data + limited other data
- **Public**: Can view public data only

## 🔍 Security Testing

### Test Admin Access
```sql
-- As admin user
SELECT * FROM profiles; -- Should return all profiles
SELECT * FROM user_roles; -- Should return all roles
```

### Test Intern Access
```sql
-- As intern user
SELECT * FROM profiles WHERE user_id = 'your_user_id'; -- Should work
SELECT * FROM profiles; -- Should return only your profile
SELECT * FROM user_roles; -- Should return only your role
```

### Test Public Access
```sql
-- As unauthenticated user
SELECT * FROM departments; -- Should work
SELECT * FROM allowance_periods; -- Should work
SELECT * FROM profiles; -- Should fail (no access)
```

## 🚨 Common Security Issues

### 1. "Permission denied" Errors
**Cause**: RLS policy blocking access
**Solution**: Check user role and RLS policies

### 2. "User not allowed" Errors
**Cause**: Missing service role key or permissions
**Solution**: Verify environment variables and admin role

### 3. Data Leaks
**Cause**: Overly permissive RLS policies
**Solution**: Review and tighten policies

## 🔧 Troubleshooting

### Check RLS Status
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### Check Current User
```sql
-- See who you're logged in as
SELECT auth.uid(), auth.email(), auth.role();
```

### Check User Role
```sql
-- Check your role in the system
SELECT * FROM user_roles WHERE user_id = auth.uid();
```

## 📞 Getting Help

If you encounter security issues:

1. **Check Environment Variables**: Ensure all required variables are set
2. **Verify RLS Policies**: Run the migration and check for errors
3. **Test User Roles**: Verify user has correct role in `user_roles` table
4. **Check Logs**: Look at browser console and Supabase logs

## 🎯 Security Checklist

- [ ] Environment variables configured
- [ ] RLS migration applied
- [ ] Service role key secured
- [ ] Admin users have admin role
- [ ] Intern users have intern role
- [ ] Test all user access levels
- [ ] Verify audit logging works
- [ ] Check sensitive field protection

Your system is now secured with comprehensive RLS policies! 🛡️✨
