# Roles System Setup Guide

## 1. Connect to Your Supabase Backend

Update your environment variables with the new Supabase credentials:

```env
VITE_SUPABASE_URL=https://ncazgcgfjcacwmiqaoyg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jYXpnY2dmamNhY3dtaXFhb3lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzOTY2NzAsImV4cCI6MjA2NDk3MjY3MH0.YNe8fsSFqfzYfEe1q_ma-8_KygBxvcjK9grL34Gtdk4
```

Create a `.env.local` file in your project root with these variables.

## 2. Run the Roles Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project: `ncazgcgfjcacwmiqaoyg`
3. Go to SQL Editor
4. Copy and paste the entire contents of `supabase/migrations/add_roles_system.sql`
5. Run the query

## 3. What the Migration Does

- ✅ Creates `user_role` enum with values: 'user', 'moderator', 'admin'
- ✅ Adds `role` column to `profiles` table (defaults to 'user')
- ✅ Sets `archiejuniof@gmail.com` as admin automatically
- ✅ Creates trigger to auto-assign admin role to your email on signup
- ✅ Adds Row Level Security policies for role-based access
- ✅ Creates helper functions: `is_admin()`, `is_moderator_or_admin()`, `get_user_role()`
- ✅ Grants necessary permissions

## 4. How Roles Work

### User Roles:
- **User**: Default role for all new users
- **Moderator**: Can moderate content (delete tweets, etc.)
- **Admin**: Full access (can change user roles, access admin panel)

### Admin Assignment:
- `archiejuniof@gmail.com` will automatically be assigned admin role
- All other users get 'user' role by default

### Role Checking in Frontend:
```typescript
// Check if current user is admin
const { data: isAdmin } = await supabase.rpc('is_admin');

// Check if current user is moderator or admin
const { data: isModerator } = await supabase.rpc('is_moderator_or_admin');

// Get current user's role
const { data: userRole } = await supabase.rpc('get_user_role');
```

## 5. Security Features

- ✅ Users can only update their own profiles (but not their role)
- ✅ Only admins can change user roles
- ✅ Admins and moderators can delete any tweet
- ✅ Role changes are secured with Row Level Security

## 6. Next Steps

After running the migration:

1. Sign up with `archiejuniof@gmail.com` to get admin access
2. Test the role system by creating other accounts
3. Implement admin panel UI components using the provided helper functions
4. Add role-based navigation and features in your React app

## Troubleshooting

If you encounter any issues:
1. Check that all SQL queries ran successfully
2. Verify RLS is enabled on your tables
3. Ensure your app is using the correct Supabase URL and anon key
4. Check browser console for any auth errors 