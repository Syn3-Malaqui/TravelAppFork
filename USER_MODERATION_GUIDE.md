# User Moderation System

## Overview

The User Moderation System provides administrators with comprehensive tools to manage user accounts, including the ability to suspend and delete users. This system includes both backend database functions and a user-friendly admin control panel interface.

## Key Features

### 1. User Suspension
- Suspend users with custom reasons
- Unsuspend users to restore access
- View suspension details and audit trail
- Suspended profiles show special message instead of content

### 2. User Deletion
- Soft delete user accounts (preserves data)
- Automatic content removal - all tweets scrubbed
- Requires admin confirmation with "DELETE" typed exactly
- Deleted profiles show "Account Deleted" message

### 3. Admin Protection
- Cannot suspend or delete other admin accounts
- Only verified administrators can perform moderation
- Comprehensive audit logging

## Usage

### Admin Control Panel
1. Navigate to `/admin` 
2. Use the Suspend/Unsuspend buttons (orange)
3. Use the Delete button (red) with confirmation
4. View user status with visual indicators

### Profile Behavior
- **Suspended users**: Show suspension message with reason and date
- **Deleted users**: Show "Account Deleted" message
- **Regular users**: Normal profile display

## Database Functions
- `suspend_user(user_id, reason)` - Suspend with reason
- `unsuspend_user(user_id)` - Remove suspension
- `delete_user_account(user_id)` - Soft delete account
- `get_user_moderation_info(user_id)` - Get moderation details

## Migration
Run `supabase/migrations/user_moderation_system.sql` in Supabase SQL Editor.

## Testing
Run `test_user_moderation.sql` to verify functionality.

## Features

### 1. User Suspension
- **Suspend users** with a custom reason
- **Unsuspend users** to restore their access
- **View suspension details** including date, reason, and admin who performed the action
- **Suspended profiles** show a special message instead of their content

### 2. User Deletion
- **Soft delete** user accounts (data preserved for recovery if needed)
- **Automatic content removal** - all user's tweets are scrubbed
- **Confirmation required** - admin must type "DELETE" to confirm
- **Deleted profiles** show "Account Deleted" message

### 3. Admin Protection
- **Cannot suspend or delete other admins**
- **Admin accounts are protected** from moderation actions
- **Only verified admins** can perform moderation actions

## Database Schema

### New Profile Fields
```sql
-- Added to profiles table
suspended BOOLEAN DEFAULT FALSE
suspended_at TIMESTAMP WITH TIME ZONE
suspended_reason TEXT
suspended_by UUID REFERENCES profiles(id)
deleted_at TIMESTAMP WITH TIME ZONE
deleted_by UUID REFERENCES profiles(id)
```

### Database Functions

#### `suspend_user(target_user_id UUID, reason TEXT DEFAULT 'No reason provided')`
- Suspends a user account
- Returns detailed JSON response with action results
- Only accessible by verified admins

#### `unsuspend_user(target_user_id UUID)`
- Removes suspension from a user account
- Clears suspension-related fields
- Returns JSON confirmation

#### `delete_user_account(target_user_id UUID)`
- Soft deletes a user account
- Scrubs all user tweets (content replaced with "[This content has been removed]")
- Marks profile as deleted and suspended
- Returns deletion confirmation

#### `get_user_moderation_info(target_user_id UUID)`
- Retrieves comprehensive moderation information for a user
- Returns suspension status, dates, reasons, and admin actions

## Admin Control Panel Features

### Visual Indicators
- **🟠 Suspended Badge** - Orange "Suspended" badge for suspended users
- **🔴 Deleted Badge** - Red "Deleted" badge for deleted users
- **Color-coded names** - Suspended users have orange names, deleted users have red strikethrough names

### Action Buttons

#### Suspend/Unsuspend Button
- **Orange outline** for suspend action
- **Green solid** for unsuspend action
- **Disabled for admins** (cannot suspend other admins)
- **Hidden for deleted users**

#### Delete Button
- **Red outline** with trash icon
- **Confirmation dialog** requires typing "DELETE"
- **Disabled for admins** (cannot delete other admins)
- **Hidden for already deleted users**

### Real-time Updates
- **Live state updates** after moderation actions
- **Automatic refresh** on errors
- **Visual feedback** during processing

## Profile Page Behavior

### Suspended Users
When visiting a suspended user's profile:
- **Custom suspension page** replaces normal profile content
- **Shows suspension reason** (if provided)
- **Shows suspension date** in user's language
- **No access to tweets** or profile information
- **"Go back home" button** for navigation

### Deleted Users
When visiting a deleted user's profile:
- **"Account Deleted" message** replaces all content
- **No profile information** visible
- **Clean interface** with return navigation
- **Bilingual support** (English/Arabic)

## Security & Permissions

### RLS Policies
- **Admin visibility** - Admins can see all profiles including deleted ones
- **User visibility** - Regular users only see active (non-deleted) profiles
- **Function security** - All moderation functions use `SECURITY DEFINER`

### Access Controls
- **Verified admin check** in all functions
- **Double verification** - must be both verified AND admin role
- **Admin protection** - cannot moderate other admin accounts
- **Audit trail** - all actions logged with admin information

## Usage Instructions

### For Administrators

#### Suspending a User
1. Navigate to **Control Panel** (`/admin`)
2. Find the user to suspend
3. Click the **"Suspend"** button (orange)
4. User is immediately suspended with default reason "Terms violation"
5. Custom reasons can be set via the database function

#### Unsuspending a User
1. Navigate to **Control Panel** (`/admin`)
2. Find the suspended user (has orange "Suspended" badge)
3. Click the **"Unsuspend"** button (green)
4. User access is immediately restored

#### Deleting a User
1. Navigate to **Control Panel** (`/admin`)
2. Find the user to delete
3. Click the **"Delete"** button (red)
4. **Type "DELETE"** in the confirmation dialog
5. User account and all content is permanently removed

### Database Migration

#### Running the Migration
```sql
-- In Supabase SQL Editor, run:
\i supabase/migrations/user_moderation_system.sql
```

#### Testing the System
```sql
-- Run the test script:
\i test_user_moderation.sql
```

## API Integration

### Frontend Functions

#### AdminPanel Component
- `suspendUser(userId, reason)` - Suspend a user with reason
- `unsuspendUser(userId)` - Remove suspension
- `deleteUser(userId)` - Delete user account (with confirmation)

#### ProfilePage Component
- **Automatic detection** of suspended/deleted users
- **Custom UI rendering** based on user status
- **Bilingual support** for suspension messages

## Error Handling

### Common Errors
- **"Only verified admins can suspend users"** - User lacks admin permissions
- **"Cannot suspend admin users"** - Attempted to moderate admin account
- **"User not found"** - Invalid user ID provided
- **"User not found or already deleted"** - User already deleted

### Error Recovery
- **Automatic data refresh** on errors
- **User-friendly error messages** in admin panel
- **Fallback behavior** for profile pages

## Monitoring & Logs

### Moderation Activity
```sql
-- View recent moderation actions
SELECT 
    p.username,
    p.suspended,
    p.suspended_at,
    p.suspended_reason,
    suspended_by_admin.username as suspended_by
FROM profiles p
LEFT JOIN profiles suspended_by_admin ON p.suspended_by = suspended_by_admin.id
WHERE p.suspended = TRUE 
ORDER BY p.suspended_at DESC;
```

### System Health
```sql
-- Check system statistics
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE suspended = TRUE) as suspended_users,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_users
FROM profiles;
```

## Best Practices

### For Administrators
1. **Always provide clear reasons** for suspensions
2. **Use progressive discipline** - suspend before deleting
3. **Keep records** of moderation decisions
4. **Review suspended accounts** periodically

### For Developers
1. **Test moderation functions** before deployment
2. **Monitor performance** of profile queries
3. **Keep audit logs** for compliance
4. **Regular backup** of user data before bulk moderation

## Troubleshooting

### Common Issues

#### Suspension Not Showing
- Check if user is actually suspended in database
- Verify profile page is checking suspension status
- Ensure admin has proper permissions

#### Delete Confirmation Not Working
- Verify exact text "DELETE" is being entered
- Check browser console for JavaScript errors
- Ensure proper event handling

#### Admin Panel Not Loading Users
- Check database connection
- Verify RLS policies are correct
- Test with smaller user limit

### Support Queries
```sql
-- Check specific user status
SELECT * FROM get_user_moderation_info('USER_ID_HERE');

-- Verify admin permissions
SELECT username, role, verified FROM profiles WHERE id = auth.uid();

-- Test function permissions
SELECT has_function_privilege(auth.uid(), 'suspend_user(uuid,text)', 'execute');
```

## Future Enhancements

### Planned Features
- **Temporary suspensions** with automatic unsuspend
- **Moderation reason categories** for better tracking
- **Bulk moderation actions** for efficiency
- **Moderation history logs** in admin panel
- **Appeal system** for suspended users

### Integration Opportunities
- **Email notifications** for moderation actions
- **Webhook support** for external systems
- **Analytics dashboard** for moderation metrics
- **Auto-moderation** based on user reports 