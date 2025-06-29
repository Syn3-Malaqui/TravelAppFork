import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Bug, Database, User, Crown, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface DebugInfo {
  currentUser: {
    id: string;
    email: string;
    role: string | null;
    isAdmin: boolean;
  } | null;
  roleColumn: boolean;
  enumType: boolean;
  policies: string[];
  sampleUsers: any[];
}

export const AdminDebugPanel: React.FC = () => {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    if (!user) return;
    
    setLoading(true);
    const info: DebugInfo = {
      currentUser: null,
      roleColumn: false,
      enumType: false,
      policies: [],
      sampleUsers: []
    };

    try {
      // Check current user's role
      const { data: currentUserData } = await supabase
        .from('profiles')
        .select('id, role, verified')
        .eq('id', user.id)
        .single();

      const { data: isAdminResult } = await supabase.rpc('is_admin');

      info.currentUser = {
        id: user.id,
        email: user.email || '',
        role: currentUserData?.role || null,
        isAdmin: isAdminResult || false
      };

      // Check if role column exists
      const { data: columnCheck } = await supabase
        .rpc('sql', {
          query: `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'role'
          `
        });
      info.roleColumn = columnCheck && columnCheck.length > 0;

      // Check if enum type exists
      const { data: enumCheck } = await supabase
        .rpc('sql', {
          query: `
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'user_role'
          `
        });
      info.enumType = enumCheck && enumCheck.length > 0;

      // Check policies
      const { data: policiesCheck } = await supabase
        .rpc('sql', {
          query: `
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'profiles'
          `
        });
             info.policies = policiesCheck?.map((p: any) => p.policyname) || [];

      // Get sample users
      const { data: sampleUsers } = await supabase
        .from('profiles')
        .select('id, username, display_name, role, verified')
        .limit(5);
      info.sampleUsers = sampleUsers || [];

    } catch (error) {
      console.error('Debug diagnostics failed:', error);
    }

    setDebugInfo(info);
    setLoading(false);
  };

  const fixRoleSystem = async () => {
    try {
      setLoading(true);
      
      // Run the main fix query
      const { error } = await supabase.rpc('sql', {
        query: `
          -- Quick fix for role system
          DO $$ 
          BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
                  CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
              END IF;
              
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
                  ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'user';
              END IF;
              
              UPDATE public.profiles SET role = 'user' WHERE role IS NULL;
              
              UPDATE public.profiles 
              SET role = 'admin' 
              WHERE id = '${user?.id}';
          END $$;
        `
      });

      if (error) throw error;

      alert('Role system fix applied! Please refresh the page.');
      window.location.reload();
      
    } catch (error: any) {
      console.error('Fix failed:', error);
      alert(`Fix failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center mb-6">
        <Bug className="h-6 w-6 text-orange-500 mr-3" />
        <h2 className="text-2xl font-bold">Admin Role System Debug Panel</h2>
      </div>

      <div className="flex space-x-4 mb-6">
        <Button 
          onClick={runDiagnostics} 
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600"
        >
          <Database className="h-4 w-4 mr-2" />
          Run Diagnostics
        </Button>
        
        <Button 
          onClick={fixRoleSystem} 
          disabled={loading}
          variant="outline"
          className="border-orange-300 text-orange-700 hover:bg-orange-50"
        >
          <Crown className="h-4 w-4 mr-2" />
          Apply Role System Fix
        </Button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Running diagnostics...</p>
        </div>
      )}

      {debugInfo && (
        <div className="space-y-6">
          {/* Current User Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Current User Status
            </h3>
            {debugInfo.currentUser ? (
              <div className="space-y-2 text-sm">
                <p><strong>ID:</strong> {debugInfo.currentUser.id}</p>
                <p><strong>Email:</strong> {debugInfo.currentUser.email}</p>
                <p><strong>Role:</strong> {debugInfo.currentUser.role || 'null'}</p>
                <p className="flex items-center">
                  <strong>Is Admin:</strong> 
                  {debugInfo.currentUser.isAdmin ? (
                    <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 ml-2" />
                  )}
                  <span className="ml-1">{debugInfo.currentUser.isAdmin ? 'Yes' : 'No'}</span>
                </p>
              </div>
            ) : (
              <p className="text-red-500">No user data found</p>
            )}
          </div>

          {/* Database Structure */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Database Structure</h3>
            <div className="space-y-2 text-sm">
              <p className="flex items-center">
                <strong>Role Column:</strong>
                {debugInfo.roleColumn ? (
                  <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 ml-2" />
                )}
                <span className="ml-1">{debugInfo.roleColumn ? 'Exists' : 'Missing'}</span>
              </p>
              <p className="flex items-center">
                <strong>Enum Type:</strong>
                {debugInfo.enumType ? (
                  <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 ml-2" />
                )}
                <span className="ml-1">{debugInfo.enumType ? 'Exists' : 'Missing'}</span>
              </p>
            </div>
          </div>

          {/* RLS Policies */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">RLS Policies ({debugInfo.policies.length})</h3>
            <div className="text-sm">
              {debugInfo.policies.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {debugInfo.policies.map((policy, index) => (
                    <li key={index}>{policy}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-red-500">No policies found</p>
              )}
            </div>
          </div>

          {/* Sample Users */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Sample Users</h3>
            <div className="text-sm">
              {debugInfo.sampleUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="text-left font-medium">Username</th>
                        <th className="text-left font-medium">Role</th>
                        <th className="text-left font-medium">Verified</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {debugInfo.sampleUsers.map((user) => (
                        <tr key={user.id}>
                          <td>{user.username}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs ${
                              user.role === 'admin' ? 'bg-yellow-100 text-yellow-800' :
                              user.role === 'moderator' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role || 'null'}
                            </span>
                          </td>
                          <td>{user.verified ? '✅' : '❌'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-red-500">No users found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 