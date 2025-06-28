-- Disable email confirmation in Supabase Auth
-- Run this in your Supabase SQL Editor

-- Update auth configuration to disable email confirmation
UPDATE auth.config 
SET email_confirm = false, 
    email_confirm_change = false,
    email_autoconfirm = true
WHERE TRUE;

-- Alternative method: Update auth settings directly
-- (This might need to be done in Supabase Dashboard > Authentication > Settings)
-- Set "Enable email confirmations" to OFF
-- Set "Enable email change confirmations" to OFF 