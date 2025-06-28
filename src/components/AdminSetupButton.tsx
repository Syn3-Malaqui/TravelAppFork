import React, { useState } from 'react';
import { Button } from './ui/button';
import { Settings, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export const AdminSetupButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const { user } = useAuth();

  const setupAdmin = async () => {
    if (!user) return;
    
    setLoading(true);
    setResult('');
    
    try {
      // First, check if role column exists
      const { data: columnCheck } = await supabase
        .rpc('sql', {
          query: `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'role'
          `
        });

      console.log('Column check:', columnCheck);

      // Try to add the role column if it doesn't exist
      if (!columnCheck || columnCheck.length === 0) {
        setResult('Adding role column...');
        
        // Create the enum and add column
        await supabase.rpc('sql', {
          query: `
            DO $$ 
            BEGIN
              -- Create enum if it doesn't exist
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
                CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
              END IF;
              
              -- Add column if it doesn't exist
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
                ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'user';
              END IF;
            END $$;
          `
        });
      }

      // Set current user as admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setResult('✅ Admin role set successfully! Please refresh the page.');
      
      // Refresh page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('Setup error:', error);
      setResult(`❌ Error: ${error.message}`);
      
      // Fallback: try direct SQL
      try {
        setResult('Trying alternative setup...');
        
        const { error: directError } = await supabase
          .rpc('set_user_admin', { user_id: user.id });
          
        if (directError) {
          // Create the function if it doesn't exist
          await supabase.rpc('sql', {
            query: `
              CREATE OR REPLACE FUNCTION set_user_admin(user_id uuid)
              RETURNS void AS $$
              BEGIN
                UPDATE public.profiles SET role = 'admin' WHERE id = user_id;
              END;
              $$ LANGUAGE plpgsql SECURITY DEFINER;
            `
          });
          
          // Try again
          await supabase.rpc('set_user_admin', { user_id: user.id });
        }
        
        setResult('✅ Admin setup complete! Please refresh the page.');
        setTimeout(() => window.location.reload(), 2000);
        
      } catch (fallbackError: any) {
        setResult(`❌ Setup failed: ${fallbackError.message}. Please run the SQL migration manually.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="text-xs text-gray-500 mb-2">Debug Mode</div>
      <Button
        onClick={setupAdmin}
        disabled={loading}
        size="sm"
        variant="outline"
        className="w-full text-xs"
      >
        {loading ? (
          'Setting up...'
        ) : (
          <>
            <Crown className="w-3 h-3 mr-1" />
            Setup Admin Access
          </>
        )}
      </Button>
      {result && (
        <div className="mt-2 text-xs p-2 bg-gray-50 rounded text-gray-700">
          {result}
        </div>
      )}
    </div>
  );
}; 