import React, { useState } from 'react';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

export const AdminPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { user } = useAuth();

  const createTestUser = async () => {
    setLoading(true);
    setMessage('');

    try {
      // Create a test user directly in the database
      const testUserId = 'test-user-' + Date.now();
      
      // Insert into profiles table directly
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: testUserId,
          username: 'testuser',
          display_name: 'Test User',
          bio: 'This is a test user for development',
          verified: true,
          followers_count: 100,
          following_count: 50,
        });

      if (profileError) {
        throw profileError;
      }

      // Create some test tweets
      const { error: tweetError } = await supabase
        .from('tweets')
        .insert([
          {
            content: 'This is my first test tweet! 🚀 #testing',
            author_id: testUserId,
            hashtags: ['testing'],
            mentions: [],
            image_urls: [],
          },
          {
            content: 'Another test tweet with some @mentions and #hashtags',
            author_id: testUserId,
            hashtags: ['hashtags'],
            mentions: ['mentions'],
            image_urls: [],
          },
          {
            content: 'A tweet with an image!',
            author_id: testUserId,
            hashtags: [],
            mentions: [],
            image_urls: ['https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=600'],
          }
        ]);

      if (tweetError) {
        throw tweetError;
      }

      setMessage('Test user and tweets created successfully!');
    } catch (error: any) {
      console.error('Error creating test user:', error);
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const bypassLogin = async () => {
    setLoading(true);
    setMessage('');

    try {
      // Create a temporary session by signing up a temporary user
      const tempEmail = `temp-${Date.now()}@example.com`;
      const tempPassword = 'temppassword123';
      
      const { data, error } = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPassword,
        options: {
          data: {
            username: `temp_user_${Date.now()}`,
            display_name: `Temp User ${Date.now()}`,
          },
        },
      });

      if (error) {
        throw error;
      }

      setMessage('Temporary user created and logged in!');
    } catch (error: any) {
      console.error('Error bypassing login:', error);
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearData = async () => {
    setLoading(true);
    setMessage('');

    try {
      // Delete test tweets
      await supabase
        .from('tweets')
        .delete()
        .like('author_id', 'test-user-%');

      // Delete test profiles
      await supabase
        .from('profiles')
        .delete()
        .like('id', 'test-user-%');

      setMessage('Test data cleared!');
    } catch (error: any) {
      console.error('Error clearing data:', error);
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 max-w-sm">
      <h3 className="text-lg font-bold mb-4 text-gray-900">Admin Panel</h3>
      
      <div className="space-y-3">
        <Button
          onClick={bypassLogin}
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 text-white"
        >
          {loading ? 'Loading...' : 'Bypass Login (Create Temp User)'}
        </Button>

        <Button
          onClick={createTestUser}
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
        >
          {loading ? 'Loading...' : 'Create Test Data'}
        </Button>

        <Button
          onClick={clearData}
          disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 text-white"
        >
          {loading ? 'Loading...' : 'Clear Test Data'}
        </Button>

        {user && (
          <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
            Logged in as: {user.email}
          </div>
        )}

        {message && (
          <div className={`text-sm p-2 rounded ${
            message.includes('Error') 
              ? 'text-red-600 bg-red-50' 
              : 'text-green-600 bg-green-50'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};